/**
 * Controleur des pages SSR (Server-Side Rendering avec EJS & Dynamic DB Models).
 */
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const Discipline = require('../models/Discipline');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Exercise = require('../models/Exercise');
const Concours = require('../models/Concours');
const Book = require('../models/Book');
const DownloadRequest = require('../models/DownloadRequest');
const { pool } = require('../../config/db');

/** Helper de nettoyage des parametres d'URL pour eviter les chaines 'null' / 'undefined' */
function cleanQueryParam(val) {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (str === '' || str === 'null' || str === 'undefined') return null;
    return str;
}

/**
 * Metadonnees de pagination + fabrique d'URL conservant les filtres actifs.
 *
 * `queryFor(n)` reconstruit la chaine de requete de la page n a partir des
 * filtres courants valides : sans cela, changer de page reinitialiserait les filtres
 * ou injecterait des parametres vides / 'null'.
 */
function paginate(total, page, perPage, filters) {
    const size = Math.max(1, Number.parseInt(perPage, 10) || 6);
    const pages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), pages);

    return {
        total,
        perPage: size,
        current,
        pages,
        hasPrev: current > 1,
        hasNext: current < pages,
        from: total === 0 ? 0 : (current - 1) * size + 1,
        to: Math.min(current * size, total),
        queryFor(n) {
            const params = new URLSearchParams();
            if (filters && typeof filters === 'object') {
                for (const [key, val] of Object.entries(filters)) {
                    if (
                        val !== null &&
                        val !== undefined &&
                        val !== '' &&
                        val !== 'null' &&
                        val !== 'undefined' &&
                        val !== 'tous' &&
                        val !== 'toutes' &&
                        val !== 'Toutes'
                    ) {
                        params.set(key, String(val));
                    }
                }
            }
            params.set('page', String(n));
            return '?' + params.toString();
        },
    };
}

/** Helper de normalisation de texte pour la recherche intelligente (sans accents, minuscules, ponctuation) */
function normalizeText(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques (accents)
        .replace(/[^a-z0-9\s]/g, ' ')   // Remplace la ponctuation par un espace
        .replace(/\s+/g, ' ')           // Supprime les espaces multiples
        .trim();
}

/** Dictionnaire exhaustif des synonymes & abréviations académiques CPGE / Supérieur */
const SCIENTIFIC_SYNONYMS = {
    'thermo': 'thermodynamique premier deuxieme principe carnot entropie enthalpie gaz parfait cycle',
    'thermodynamique': 'thermo thermodynamique entropie enthalpie carnot',
    'meca': 'mecanique cinematique dynamique oscillateur newton point solide referentiel galileen',
    'mecanique': 'meca mecanique cinematique dynamique point solide',
    'elec': 'electromagnetisme electrocinetique electronique circuit rlc thevenin norton diode aop',
    'em': 'electromagnetisme maxwell induction ondes rayonnement flux laplace lorentz',
    'electromagnetisme': 'em electromagnetisme maxwell induction biot savart',
    'orga': 'organique chimie stereochimie reaction alcene alcool electrophile nucleophile sn1 sn2',
    'organique': 'orga organique chimie synthese mecanisme',
    'agreg': 'agregation externe interne concours physique chimie',
    'agregation': 'agreg agregation',
    'capes': 'capes cafep physique chimie enseignement',
    'centrale': 'centrale supelec concours centrale',
    'mines': 'mines ponts telecommines concours mines',
    'ens': 'ecole normale superieure ulm lyon saclay rennes concours ens',
    'polytechnique': 'polytechnique x ecole polytechnique',
    'x': 'polytechnique ecole polytechnique',
    'ccp': 'ccinp ccp concours communs polytechniques',
    'ccinp': 'ccinp ccp concours communs polytechniques',
    'e3a': 'e3a polytech concours e3a',
    'bcpst': 'agro veto g2e banque agro veto bio prepa',
    'opto': 'optique geometrique ondulatoire interferometre diffraction fourier miroir lentille',
    'optique': 'opto optique geometrique ondulatoire interferometre michelson',
    'quantique': 'quantique mecanique schrodinger puits fonction d onde heisenberg',
    'fluide': 'mecanique des fluides navier stokes bernoulli euler ecoulement viscosite reynolds',
    'fluides': 'mecanique des fluides navier stokes bernoulli euler viscosite',
    'cinetique': 'cinetique chimique ordre reaction activation arrhenius constante catalytique',
    'aqueuse': 'solutions aqueuses acide base ph solubilite complexation redox titrage potentiel',
    'aqueuses': 'solutions aqueuses acide base ph solubilite complexation redox',
    'solution': 'solutions aqueuses corrige correction',
    'solutions': 'solutions aqueuses corrige correction',
    'corrige': 'correction corrige solution resolus annales',
    'corriges': 'correction corrige solution resolus annales',
    'sujet': 'enonce epreuve concours session',
    'garing': 'christian garing ondes mecaniques electromagnetiques',
    'lumbroso': 'hubert lumbroso thermodynamique mecanique electromagnetisme problemes resolus',
    'perez': 'jose philippe perez thermodynamique optique mecanique relativite quantique',
    'grecias': 'pierre grecias chimie tout en un compagnon',
    'hprepa': 'h prepa hachette tout en un exercices problemes'
};

/**
 * Calcul d'un score de pertinence intelligent pour ordonner les résultats.
 */
function calculateRelevanceScore(item, queryWords, rawQueryNorm) {
    let score = 0;
    const titleNorm = normalizeText(item.rawTitle || item.titre);
    const descNorm = normalizeText(item.rawDesc || item.description);
    const typeNorm = normalizeText(item.type);
    const combinedNorm = `${titleNorm} ${descNorm} ${typeNorm}`;

    // 1. Match global complet
    if (titleNorm === rawQueryNorm) {
        score += 200;
    } else if (titleNorm.startsWith(rawQueryNorm)) {
        score += 120;
    } else if (titleNorm.includes(rawQueryNorm)) {
        score += 90;
    } else if (descNorm.includes(rawQueryNorm)) {
        score += 50;
    }

    // 2. Bonus de conjonction : Si TOUS les mots originaux de la requête sont présents
    const allWordsPresent = queryWords.length > 1 && queryWords.every(w => combinedNorm.includes(w));
    if (allWordsPresent) {
        score += 150;
    }

    // 3. Score mot par mot
    queryWords.forEach(word => {
        if (!word || word.length < 2) return;

        if (titleNorm.includes(word)) {
            const isWordBoundary = new RegExp(`\\b${word}\\b`).test(titleNorm);
            score += isWordBoundary ? 30 : 20;
        }
        if (descNorm.includes(word)) {
            score += 10;
        }
        if (typeNorm.includes(word)) {
            score += 5;
        }

        const expandedStr = SCIENTIFIC_SYNONYMS[word];
        if (expandedStr) {
            const synonyms = expandedStr.split(/\s+/);
            for (const syn of synonyms) {
                if (syn && syn.length > 2 && syn !== word) {
                    if (titleNorm.includes(syn)) score += 12;
                    if (descNorm.includes(syn)) score += 5;
                }
            }
        }
    });

    return score;
}

/**
 * Rendu commun aux deux pages d'exercices : seule la discipline change.
 * Evite de dupliquer la logique de filtre et de pagination.
 */
async function renderExercises(req, res, next, disciplineSlug, view, title, metaDescription) {
    try {
        const filters = {
            tome: cleanQueryParam(req.query.tome) || 'tous',
            chapitre: cleanQueryParam(req.query.chapitre) || 'tous',
            niveau: cleanQueryParam(req.query.niveau) || 'tous',
            difficulte: cleanQueryParam(req.query.difficulte) || 'toutes',
        };
        const PER_PAGE = 10;
        const currentPage = Math.max(1, Number.parseInt(cleanQueryParam(req.query.page), 10) || 1);

        const [{ rows, total }, stats, chapters, favoriteIds, downloadStatus, tomes] = await Promise.all([
            Exercise.findPage({
                disciplineSlug,
                tome: filters.tome === 'tous' ? null : filters.tome,
                chapitre: filters.chapitre === 'tous' ? null : filters.chapitre,
                niveau: filters.niveau === 'tous' ? null : filters.niveau,
                difficulte: filters.difficulte === 'toutes' ? null : filters.difficulte,
                page: currentPage,
                perPage: PER_PAGE,
            }),
            Exercise.stats(disciplineSlug),
            Chapter.findByDisciplineSlug(disciplineSlug),
            Favorite.idsFor(req.session.userId, 'exercise'),
            DownloadRequest.statusMap(req.session.userId, 'exercise'),
            Chapter.findTomesByDiscipline(disciplineSlug),
        ]);

        res.render(view, {
            title,
            metaDescription,
            page: view,
            exercises: rows,
            chapters,
            tomes,
            stats,
            filters,
            favoriteIds,
            downloadStatus,
            pagination: paginate(total, currentPage, PER_PAGE, filters),
        });
    } catch (err) {
        next(err);
    }
}

const HERO_EQUATIONS = [
    {
        id: 'meca',
        discipline: 'Physique',
        disciplineSlug: 'physique',
        chapterTag: 'Chapitre 04',
        title: 'Mécanique du point matériel',
        description: 'Énergie cinétique, travail des forces et théorèmes de conservation.',
        formulaHtml: 'E<sub class="text-base font-normal text-slate-400">c</sub> = ½&nbsp;m&nbsp;v<sup class="text-sm">2</sup>',
        formulaName: "Théorème de l'énergie cinétique",
        progression: 72,
        floating: {
            title: 'Thermochimie',
            subtitle: '18 exercices corrigés',
            formulaHtml: 'ΔG° = −RT&nbsp;ln&nbsp;K',
            icon: 'flask'
        }
    },
    {
        id: 'maxwell',
        discipline: 'Physique',
        disciplineSlug: 'physique',
        chapterTag: 'Chapitre 02',
        title: 'Électrostatique & Maxwell',
        description: 'Champ électrique, flux vectoriel et équations fondamentales du vide.',
        formulaHtml: '∇ · E = <span class="text-base font-normal text-slate-400">ρ / ε₀</span>',
        formulaName: 'Équation de Maxwell-Gauss',
        progression: 85,
        floating: {
            title: 'Mécanique Quantique',
            subtitle: '24 exercices corrigés',
            formulaHtml: 'λ = h / p',
            icon: 'atom'
        }
    },
    {
        id: 'thermo',
        discipline: 'Physique',
        disciplineSlug: 'physique',
        chapterTag: 'Chapitre 05',
        title: 'Thermodynamique Macroscopique',
        description: "Premier et second principes, bilans d'énergie et d'entropie.",
        formulaHtml: 'dU = T&nbsp;dS − P&nbsp;dV',
        formulaName: 'Identité fondamentale de la thermodynamique',
        progression: 64,
        floating: {
            title: 'Gaz Parfaits',
            subtitle: '20 exercices corrigés',
            formulaHtml: 'P V = n R T',
            icon: 'flame'
        }
    },
    {
        id: 'schrodinger',
        discipline: 'Physique',
        disciplineSlug: 'physique',
        chapterTag: 'Chapitre 08',
        title: 'Physique Quantique',
        description: "Fonction d'onde, états stationnaires et opérateur hamiltonien.",
        formulaHtml: 'i&nbsp;ħ&nbsp;<span class="text-base font-normal text-slate-400">∂Ψ/∂t</span> = Ĥ&nbsp;Ψ',
        formulaName: 'Équation de Schrödinger',
        progression: 45,
        floating: {
            title: 'Électromagnétisme',
            subtitle: '15 exercices corrigés',
            formulaHtml: 'F = q(E + v × B)',
            icon: 'zap'
        }
    },
    {
        id: 'relativite',
        discipline: 'Physique',
        disciplineSlug: 'physique',
        chapterTag: 'Chapitre 06',
        title: 'Relativité Restreinte',
        description: 'Transformation de Lorentz, quantité de mouvement et masse-énergie.',
        formulaHtml: 'E = m&nbsp;c<sup class="text-sm">2</sup>',
        formulaName: "Équivalence masse-énergie d'Einstein",
        progression: 78,
        floating: {
            title: 'Gravitation',
            subtitle: '12 exercices corrigés',
            formulaHtml: 'F = G (m₁m₂)/r²',
            icon: 'globe'
        }
    },
    {
        id: 'arrhenius',
        discipline: 'Chimie',
        disciplineSlug: 'chimie',
        chapterTag: 'Chapitre 01',
        title: 'Cinétique Chimique & Catalyse',
        description: "Lois de vitesse de réaction, constante et énergie d'activation.",
        formulaHtml: 'k = A&nbsp;e<sup class="text-sm">−E<sub class="text-xs">a</sub> / R T</sup>',
        formulaName: "Loi d'Arrhenius",
        progression: 80,
        floating: {
            title: 'Chimie Organique',
            subtitle: '22 exercices corrigés',
            formulaHtml: 'v = k [A]ᵐ [B]ⁿ',
            icon: 'flask'
        }
    },
    {
        id: 'henderson',
        discipline: 'Chimie',
        disciplineSlug: 'chimie',
        chapterTag: 'Chapitre 04',
        title: 'Chimie des Solutions',
        description: "Équilibres acide-base, constante pKa et solutions tampons.",
        formulaHtml: 'pH = pK<sub class="text-xs">a</sub> + log(<span class="text-base font-normal text-slate-400">[A⁻]/[AH]</span>)',
        formulaName: "Équation d'Henderson-Hasselbalch",
        progression: 92,
        floating: {
            title: 'Atomistique',
            subtitle: '14 exercices corrigés',
            formulaHtml: 'Eₙ = −13.6 / n² eV',
            icon: 'atom'
        }
    },
    {
        id: 'nernst',
        discipline: 'Chimie',
        disciplineSlug: 'chimie',
        chapterTag: 'Chapitre 05',
        title: 'Électrochimie & Oxydoréduction',
        description: 'Potentiels d’oxydoréduction, équilibres et piles chimiques.',
        formulaHtml: 'E = E° + <span class="text-base font-normal text-slate-400">RT/(nF)</span> ln(<span class="text-base font-normal text-slate-400">[Ox]/[Red]</span>)',
        formulaName: 'Équation de Nernst',
        progression: 58,
        floating: {
            title: 'Oxydoréduction',
            subtitle: '19 exercices corrigés',
            formulaHtml: 'ΔE = E°(Ox) − E°(Red)',
            icon: 'zap'
        }
    }
];

const pageController = {
    /** Home page */
    async home(req, res, next) {
        try {
            const [courseStats, exerciseCount] = await Promise.all([
                Course.stats().catch(() => ({ courses: 0, chapters: 0 })),
                Exercise.countAll().catch(() => 0),
            ]);

            const chaptersCount = Number(courseStats.chapters) || 0;
            const coursesCount = Number(courseStats.courses) || 0;
            const exercisesCount = Number(exerciseCount) || 0;
            const coursesAndChapters = coursesCount + chaptersCount;

            const initialEquation = HERO_EQUATIONS[Math.floor(Math.random() * HERO_EQUATIONS.length)];

            res.render('index', {
                title: 'PhyChemia - Physique & Chimie pour l\'Enseignement Supérieur | Cours & Exercices Corrigés',
                metaDescription: 'Plateforme de référence en physique et chimie pour le supérieur : cours complets, fiches de révision et exercices corrigés pas à pas (CPGE, Licence, Master).',
                page: 'index',
                stats: {
                    chapters: chaptersCount,
                    courses: coursesCount,
                    coursesAndChapters: coursesAndChapters > 0 ? coursesAndChapters : 120,
                    exercises: exercisesCount > 0 ? exercisesCount : 450,
                    freeAccess: 100,
                },
                heroEquation: initialEquation,
                allEquations: HERO_EQUATIONS,
            });
        } catch (err) {
            next(err);
        }
    },

    /** Profile page (Protected) */
    async profil(req, res, next) {
        try {
            const userId = req.session ? req.session.userId : null;
            const user = (res.locals && res.locals.user) || (userId ? await User.findById(userId) : null);
            res.render('profil', {
                title: 'Mon Profil - Espace Utilisateur | PhyChemia',
                metaDescription: 'Consultez et gérez vos informations personnelles sur votre profil PhyChemia.',
                user,
                page: 'profil'
            });
        } catch (err) {
            next(err);
        }
    },

    /** Favorites page (Protected) */
    async favoris(req, res, next) {
        try {
            const selectedCategorie = req.query.categorie || 'toutes';
            const selectedMatiere = req.query.matiere || 'toutes';

            let [courses, exercises, chapters, books, concours] = await Promise.all([
                Favorite.listCourses(req.session.userId),
                Favorite.listExercises(req.session.userId),
                Favorite.listChapters(req.session.userId),
                Favorite.listBooks(req.session.userId),
                Favorite.listConcours(req.session.userId),
            ]);

            // 1. Filter by Matière (physique / chimie)
            if (selectedMatiere !== 'toutes') {
                const targetMatiere = selectedMatiere.toLowerCase();
                courses = courses.filter(c => (c.discipline_slug || '').toLowerCase().includes(targetMatiere));
                exercises = exercises.filter(e => (e.discipline_slug || '').toLowerCase().includes(targetMatiere));
                chapters = chapters.filter(ch => (ch.discipline_slug || '').toLowerCase().includes(targetMatiere));
                books = books.filter(b => (b.discipline || '').toLowerCase().includes(targetMatiere));
                concours = concours.filter(cc => (cc.matiere || '').toLowerCase().includes(targetMatiere));
            }

            // 2. Filter by Catégorie
            if (selectedCategorie === 'cours') {
                exercises = []; books = []; concours = [];
            } else if (selectedCategorie === 'exercices' || selectedCategorie === 'solutions') {
                courses = []; chapters = []; books = []; concours = [];
            } else if (selectedCategorie === 'livres') {
                courses = []; exercises = []; chapters = []; concours = [];
            } else if (selectedCategorie === 'concours') {
                courses = []; exercises = []; chapters = []; books = [];
            } else if (selectedCategorie === 'telechargements') {
                courses = courses.filter(c => c.course_file);
                exercises = exercises.filter(e => e.enonce_file || e.correction_file);
                chapters = [];
                books = books.filter(b => b.pdf_file);
                concours = concours.filter(cc => cc.enonce_file || cc.correction_file);
            }

            const total = courses.length + exercises.length + chapters.length + books.length + concours.length;

            res.render('favoris', {
                title: 'Mes Ressources Favoris - PhyChemia',
                metaDescription: 'Accédez rapidement à tous vos cours, chapitres, exercices, livres et concours enregistrés dans vos favoris PhyChemia.',
                page: 'favoris',
                favoriteCourses: courses,
                favoriteExercises: exercises,
                favoriteChapters: chapters,
                favoriteBooks: books,
                favoriteConcours: concours,
                total,
                selectedCategorie,
                selectedMatiere,
            });
        } catch (err) {
            next(err);
        }
    },

    /** Chapitres (Dynamic from DB grouped by Tome) */
    async chapitres(req, res, next) {
        try {
            const [disciplines, chapters, favoriteChapterIds] = await Promise.all([
                Discipline.findAll(),
                Chapter.findAll(),
                Favorite.idsFor(req.session.userId, 'chapter'),
            ]);

            const tomesMap = {};
            chapters.forEach(ch => {
                const tomeKey = ch.tome || (ch.discipline_slug === 'chimie' ? 'Chimie' : 'Autres Chapitres');
                if (!tomesMap[tomeKey]) tomesMap[tomeKey] = [];
                tomesMap[tomeKey].push(ch);
            });

            res.render('chapitres', {
                title: 'Programme & Chapitres par Tome (Ondes Mécaniques, Électromagnétisme, Diélectriques) - PhyChemia',
                metaDescription: 'Découvrez les chapitres de physique organisés par Tomes : Ondes Mécaniques, Ondes Électromagnétiques Vide et Milieux, Diélectriques, et Chimie.',
                page: 'chapitres',
                disciplines,
                chapters,
                tomesMap,
                favoriteChapterIds,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Cours - liste de chapitres sous forme de cartes, filtrable et paginee.
     */
    async cours(req, res, next) {
        try {
            const requestedDiscipline = cleanQueryParam(req.query.discipline) || cleanQueryParam(req.params.discipline) || 'toutes';
            const filters = {
                discipline: requestedDiscipline,
                niveau: cleanQueryParam(req.query.niveau) || 'tous',
            };
            const PER_PAGE = 6;
            const currentPage = Math.max(1, Number.parseInt(cleanQueryParam(req.query.page), 10) || 1);

            const [{ rows, total }, stats, disciplines, favoriteChapterIds] = await Promise.all([
                Chapter.findPage({
                    discipline: filters.discipline === 'toutes' ? null : filters.discipline,
                    niveau: filters.niveau === 'tous' ? null : filters.niveau,
                    page: currentPage,
                    perPage: PER_PAGE,
                }),
                Course.stats(),
                Discipline.findAll(),
                Favorite.idsFor(req.session.userId, 'chapter'),
            ]);

            const currentPageKey = filters.discipline === 'physique' ? 'cours-physique' : (filters.discipline === 'chimie' ? 'cours-chimie' : 'cours');

            res.render('cours', {
                title: filters.discipline === 'physique'
                    ? 'Cours & Leçons de Physique - CPGE, Licence & Master | PhyChemia'
                    : (filters.discipline === 'chimie'
                        ? 'Cours & Leçons de Chimie - CPGE, Licence & Master | PhyChemia'
                        : 'Fiches de Cours & Leçons de Physique et Chimie - CPGE, Licence & Master | PhyChemia'),
                metaDescription: 'Consultez et téléchargez nos cours complets et fiches de synthèse de physique et chimie rédigés pour l\'enseignement supérieur.',
                page: currentPageKey,
                chapters: rows,
                disciplines,
                stats,
                filters,
                favoriteChapterIds,
                pagination: paginate(total, currentPage, PER_PAGE, filters),
            });
        } catch (err) {
            next(err);
        }
    },

    /** Page de detail d'un chapitre / cours : /chapitres/:id ou /cours/:id */
    async chapitreDetails(req, res, next) {
        try {
            const rawId = req.params.id;
            let chapter = null;
            
            if (/^\d+$/.test(rawId)) {
                const id = Number.parseInt(rawId, 10);
                chapter = await Chapter.findByIdDetailed(id);
            } else {
                chapter = await Chapter.findBySlug(rawId);
            }

            if (!chapter) return pageController.notFound(req, res);

            const [courses, exercises, siblings, downloadStatus, prevNext, favoriteCourseIds, favoriteChapterIds] = await Promise.all([
                Course.findByChapterWithExercises(chapter.id),
                Exercise.findByChapter(chapter.id),
                Chapter.findSiblings(chapter, 6),
                DownloadRequest.statusMap(req.session.userId, 'course'),
                Chapter.findPrevAndNext(chapter),
                Favorite.idsFor(req.session.userId, 'course'),
                Favorite.idsFor(req.session.userId, 'chapter'),
            ]);

            res.render('chapitre-details', {
                title: `${chapter.titre} - Cours & Chapitres de ${chapter.discipline_nom} | PhyChemia`,
                metaDescription: `Cours ${chapter.titre} (${chapter.discipline_nom} ${chapter.niveau.toUpperCase()}) : cours théoriques complets, fiches de révision, chapitres et exercices corrigés pas à pas.`,
                page: 'chapitre-details',
                chapter,
                courses,
                exercises,
                siblings,
                prevCourse: prevNext.prev,
                nextCourse: prevNext.next,
                downloadStatus,
                favoriteCourseIds,
                favoriteChapterIds,
                isChimie: chapter.discipline_slug === 'chimie',
            });
        } catch (err) {
            next(err);
        }
    },

    /** Alias de redirection ou affichage pour /cours/:id */
    async coursDetails(req, res, next) {
        return pageController.chapitreDetails(req, res, next);
    },

    /** Exercices Physique - filtres + pagination + statistiques reelles */
    exercicesPhysique(req, res, next) {
        return renderExercises(
            req, res, next,
            'physique',
            'exercices-physique',
            'Exercices & Problèmes Corrigés de Physique - CPGE, Licence | PhyChemia',
            'Base d\'exercices corrigés de physique pour le supérieur : mécanique du point, thermodynamique, électromagnétisme et physique quantique.'
        );
    },

    /** Exercices Chimie - filtres + pagination + statistiques reelles */
    exercicesChimie(req, res, next) {
        return renderExercises(
            req, res, next,
            'chimie',
            'exercices-chimie',
            'Exercices & Corrigés de Chimie Organique & Générale - Licence, CPGE | PhyChemia',
            'Banque d\'exercices et problèmes corrigés en chimie : cinétique chimique, chimie organique, stéréochimie et solutions aquatiques.'
        );
    },

    /**
     * Fiche detaillee d'un exercice : /exercices/:id
     *
     * La colonne laterale propose des exercices du meme chapitre, complete si
     * besoin par d'autres exercices de la meme discipline, ainsi que les cours
     * rattaches au chapitre.
     */
    async exerciceDetails(req, res, next) {
        try {
            const id = Number.parseInt(req.params.id, 10);
            if (!Number.isInteger(id) || id <= 0) return pageController.notFound(req, res);

            const exercise = await Exercise.findByIdDetailed(id);
            if (!exercise) return pageController.notFound(req, res);

            const [related, recommended, favoriteIds, downloadStatus] = await Promise.all([
                Exercise.findRelated(exercise, 4),
                Course.findByChapterOrDiscipline(exercise.chapter_id, exercise.discipline_slug, 4),
                Favorite.idsFor(req.session.userId, 'exercise'),
                DownloadRequest.statusMap(req.session.userId, 'exercise'),
            ]);

            const isChimie = exercise.discipline_slug === 'chimie';

            res.render('exercice-details', {
                title: `${exercise.titre} - Énoncé & Corrigé Détaillé | PhyChemia`,
                metaDescription: `Exercice corrigé : ${exercise.titre} en ${exercise.discipline_nom} (${exercise.niveau.toUpperCase()}). Énoncé et solution étape par étape téléchargeables.`,
                page: 'exercice-details',
                exercise,
                related,
                recommended,
                favoriteIds,
                downloadStatus,
                isChimie,
                backUrl: isChimie ? '/exercices-chimie' : '/exercices-physique',
            });
        } catch (err) {
            next(err);
        }
    },

    /** Login page */
    login(req, res) {
        res.render('login', {
            title: 'Connexion à votre Espace Étudiant - PhyChemia',
            metaDescription: 'Connectez-vous à votre compte PhyChemia pour accéder à l\'intégralité des exercices corrigés et fiches PDF.',
            page: 'login',
            next: req.query.next || ''
        });
    },

    /** Register page */
    inscription(req, res) {
        res.render('inscription', {
            title: 'Créer un Compte Etudiant Gratuit - PhyChemia',
            metaDescription: 'Inscrivez-vous gratuitement sur PhyChemia pour suivre vos cours, enregistrer vos favoris et télécharger les corrigés.',
            page: 'inscription'
        });
    },

    /** Contact */
    contact(req, res) {
        res.render('contact', {
            title: 'Contact & Support Pédagogique - PhyChemia',
            metaDescription: 'Une question sur un cours ou une suggestion ? Contactez l\'équipe d\'enseignants de PhyChemia.',
            page: 'contact'
        });
    },

    /** A propos */
    apropos(req, res) {
        res.render('apropos', {
            title: 'À Propos & Mission Pédagogique - PhyChemia',
            metaDescription: 'Découvrez la vision et la mission de PhyChemia, plateforme éducative libre et gratuite en physique-chimie pour l\'enseignement supérieur.',
            page: 'apropos'
        });
    },

    /** FAQ */
    faq(req, res) {
        res.render('faq', {
            title: 'Foire Aux Questions (FAQ) - PhyChemia',
            metaDescription: 'Réponses à toutes vos questions sur l\'accès aux cours, le téléchargement des exercices et l\'utilisation de PhyChemia.',
            page: 'faq'
        });
    },

    /** Recherche */
    recherche(req, res) {
        res.render('recherche', {
            title: 'Moteur de Recherche de Cours & Corrigés - PhyChemia',
            metaDescription: 'Recherchez rapidement parmi nos fiches de cours, chapitres et exercices corrigés de physique et chimie.',
            query: req.query.q || '',
            page: 'recherche'
        });
    },

    /** Mentions Legales */
    mentionsLegales(req, res) {
        res.render('mentions-legales', {
            title: 'Mentions Légales & Droits d\'Auteur - PhyChemia',
            metaDescription: 'Informations réglementaires, hébergement et droits de propriété intellectuelle du site PhyChemia.',
            page: 'mentions-legales'
        });
    },

    /** Politique de Confidentialite */
    politiqueConfidentialite(req, res) {
        res.render('politique-confidentialite', {
            title: 'Politique de Confidentialité & RGPD - PhyChemia',
            metaDescription: 'Découvrez comment PhyChemia protège vos données personnelles et respecte votre vie privée.',
            page: 'politique-confidentialite'
        });
    },

    /** Page catalogue des Concours & Annales : /concours */
    async concours(req, res, next) {
        try {
            const filters = {
                ecole: cleanQueryParam(req.query.ecole),
                annee: cleanQueryParam(req.query.annee),
                filiere: cleanQueryParam(req.query.filiere),
                matiere: cleanQueryParam(req.query.matiere),
                search: cleanQueryParam(req.query.search),
            };

            const PER_PAGE = 12;
            const currentPage = Math.max(1, Number.parseInt(cleanQueryParam(req.query.page), 10) || 1);

            const [{ rows, total }, filterOptions, totalCount, downloadStatus, favoriteConcoursIds] = await Promise.all([
                Concours.findPage({ ...filters, page: currentPage, perPage: PER_PAGE }),
                Concours.findFilters(),
                Concours.countAll(),
                DownloadRequest.statusMap(req.session.userId, 'concours'),
                Favorite.idsFor(req.session.userId, 'concours'),
            ]);

            const stats = { total: totalCount };

            res.render('concours', {
                title: 'Concours & Annales Corrigées CPGE - Physique & Chimie | PhyChemia',
                metaDescription: 'Accédez à plus de 1 400 sujets et corrigés officiels des concours CPGE (Polytechnique, Centrale, Mines-Ponts, CCINP, ENS, e3a...).',
                page: 'concours',
                concoursList: rows,
                filterOptions,
                stats,
                filters,
                downloadStatus,
                favoriteConcoursIds,
                pagination: paginate(total, currentPage, PER_PAGE, filters),
            });
        } catch (err) {
            next(err);
        }
    },

    /** Detail d'un concours : /concours/:id */
    async concoursDetails(req, res, next) {
        try {
            const id = Number.parseInt(req.params.id, 10);
            if (!Number.isInteger(id) || id <= 0) return pageController.notFound(req, res);

            const item = await Concours.findById(id);
            if (!item) return pageController.notFound(req, res);

            const [related, downloadStatus, favoriteConcoursIds] = await Promise.all([
                Concours.findRelated(item, 4),
                DownloadRequest.statusMap(req.session.userId, 'concours'),
                Favorite.idsFor(req.session.userId, 'concours'),
            ]);

            res.render('concours-details', {
                title: `${item.titre} - Sujet & Corrigé Officiel | PhyChemia`,
                metaDescription: `Consultez et téléchargez l'énoncé et la correction du concours ${item.titre}.`,
                page: 'concours',
                concours: item,
                downloadStatus,
                favoriteConcoursIds,
                related,
            });
        } catch (err) {
            next(err);
        }
    },

    /** GET /livres/physique - Livres de Physique uniquement */
    async livresPhysique(req, res, next) {
        req.query.discipline = 'Physique';
        return pageController.livres(req, res, next);
    },

    /** GET /livres/chimie - Livres de Chimie uniquement */
    async livresChimie(req, res, next) {
        req.query.discipline = 'Chimie';
        return pageController.livres(req, res, next);
    },

    /** GET /livres - Liste des livres et manuels de référence CPGE */
    async livres(req, res, next) {
        try {
            const filters = {
                discipline: cleanQueryParam(req.query.discipline),
                collection: cleanQueryParam(req.query.collection),
                search: cleanQueryParam(req.query.search),
            };

            const perPage = 12;
            const currentPage = Math.max(1, Number.parseInt(cleanQueryParam(req.query.page), 10) || 1);

            const [result, filterOptions, downloadStatus, favoriteBookIds] = await Promise.all([
                Book.findPage({
                    ...filters,
                    page: currentPage,
                    perPage,
                }),
                Book.findFilters(),
                DownloadRequest.statusMap(req.session.userId, 'book'),
                Favorite.idsFor(req.session.userId, 'book'),
            ]);

            const pagination = paginate(result.total, currentPage, perPage, filters);

            let pageKey = 'livres';
            let title = 'Livres & Manuels de Référence CPGE (Physique & Chimie) | PhyChemia';
            let metaDescription = 'Consultez et téléchargez les livres et manuels de référence CPGE (H-Prépa, Lumbroso, Pérez, Nathan, Garing) en Physique et Chimie.';

            if (filters.discipline === 'Physique') {
                pageKey = 'livres-physique';
                title = 'Livres de Physique CPGE — Collection complète | PhyChemia';
                metaDescription = 'Consultez et téléchargez les manuels de cours et d\'exercices de Physique CPGE (Pérez, Lumbroso, H-Prépa, Nathan, Garing).';
            } else if (filters.discipline === 'Chimie') {
                pageKey = 'livres-chimie';
                title = 'Livres de Chimie CPGE — Collection complète | PhyChemia';
                metaDescription = 'Consultez et téléchargez les manuels de cours et d\'exercices de Chimie CPGE (Grécias, Dunod, H-Prépa).';
            }

            res.render('livres', {
                title,
                metaDescription,
                page: pageKey,
                booksList: result.rows,
                filterOptions,
                filters,
                downloadStatus,
                favoriteBookIds,
                pagination,
            });
        } catch (err) {
            next(err);
        }
    },

    /** GET /livres/:id - Détails d'un livre */
    async livresDetails(req, res, next) {
        try {
            const id = req.params.id;
            const item = await Book.findById(id);
            if (!item) return pageController.notFound(req, res);

            const [downloadStatus, favoriteBookIds] = await Promise.all([
                DownloadRequest.statusMap(req.session.userId, 'book'),
                Favorite.idsFor(req.session.userId, 'book'),
            ]);

            res.render('livres-details', {
                title: `${item.titre} - Livre CPGE | PhyChemia`,
                metaDescription: `Consultez et téléchargez le manuel ${item.titre} (${item.collection}).`,
                page: 'livres',
                book: item,
                downloadStatus,
                favoriteBookIds,
            });
        } catch (err) {
            next(err);
        }
    },

    /** GET /recherche - Moteur de Recherche Intelligent Academic Search Engine */
    async recherche(req, res, next) {
        try {
            const rawQuery = String(req.query.q || '').trim();
            const typeFilter = req.query.type || 'tous';
            const rawQueryNorm = normalizeText(rawQuery);
            let results = [];

            if (rawQueryNorm.length > 0) {
                // Découpage des mots clés
                const queryWords = rawQueryNorm.split(/\s+/).filter(w => w.length > 1);

                // Mots de recherche élargis avec les synonymes
                const expandedTerms = new Set(queryWords);
                queryWords.forEach(w => {
                    if (SCIENTIFIC_SYNONYMS[w]) {
                        SCIENTIFIC_SYNONYMS[w].split(/\s+/).forEach(syn => expandedTerms.add(syn));
                    }
                });

                const termList = Array.from(expandedTerms);

                // Conjonction prioritaire pour les mots originaux
                const concoursAllCond = queryWords.map(() => `(titre LIKE ? OR ecole LIKE ? OR epreuve LIKE ? OR filiere LIKE ? OR matiere LIKE ?)`).join(' AND ');
                const concoursAllParams = queryWords.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`]);

                const concoursAnyCond = termList.map(() => `(titre LIKE ? OR ecole LIKE ? OR epreuve LIKE ? OR filiere LIKE ? OR matiere LIKE ?)`).join(' OR ');
                const concoursAnyParams = termList.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`]);

                const bookAllCond = queryWords.map(() => `(titre LIKE ? OR collection LIKE ? OR auteur LIKE ? OR discipline LIKE ?)`).join(' AND ');
                const bookAllParams = queryWords.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`]);

                const bookAnyCond = termList.map(() => `(titre LIKE ? OR collection LIKE ? OR auteur LIKE ? OR discipline LIKE ?)`).join(' OR ');
                const bookAnyParams = termList.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`]);

                const exerciseAnyCond = termList.map(() => `(e.titre LIKE ? OR e.description LIKE ?)`).join(' OR ');
                const exerciseParams = termList.flatMap(t => [`%${t}%`, `%${t}%`]);

                const courseAnyCond = termList.map(() => `(c.titre LIKE ? OR c.description LIKE ? OR ch.titre LIKE ? OR d.nom LIKE ?)`).join(' OR ');
                const courseParams = termList.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`, `%${t}%`]);

                // Exécution parallèle des requêtes DB
                const [concoursRows, bookRows, exerciseRows, courseRows] = await Promise.all([
                    (typeFilter === 'tous' || typeFilter === 'concours')
                        ? pool.query(
                            `SELECT id, titre, ecole, annee, epreuve, filiere, matiere, enonce_file, correction_file 
                             FROM concours 
                             WHERE (${concoursAllCond}) OR (${concoursAnyCond}) 
                             ORDER BY (${concoursAllCond}) DESC 
                             LIMIT 50`,
                            [...concoursAllParams, ...concoursAnyParams, ...concoursAllParams]
                        ).then(r => r[0])
                        : [],
                    (typeFilter === 'tous' || typeFilter === 'livres')
                        ? pool.query(
                            `SELECT id, titre, collection, auteur, discipline, pdf_file 
                             FROM books 
                             WHERE (${bookAllCond}) OR (${bookAnyCond}) 
                             ORDER BY (${bookAllCond}) DESC 
                             LIMIT 50`,
                            [...bookAllParams, ...bookAnyParams, ...bookAllParams]
                        ).then(r => r[0])
                        : [],
                    (typeFilter === 'tous' || typeFilter === 'exercices')
                        ? pool.query(
                            `SELECT e.id, e.titre, e.description, e.niveau, e.difficulte, e.enonce_file, e.correction_file 
                             FROM exercises e 
                             WHERE ${exerciseAnyCond} 
                             LIMIT 50`,
                            exerciseParams
                        ).then(r => r[0])
                        : [],
                    (typeFilter === 'tous' || typeFilter === 'cours')
                        ? pool.query(
                            `SELECT c.id, c.chapter_id, c.titre, c.description, c.course_file, ch.titre as chapter_titre, d.nom as discipline_nom 
                             FROM courses c 
                             LEFT JOIN chapters ch ON c.chapter_id = ch.id 
                             LEFT JOIN disciplines d ON ch.discipline_id = d.id 
                             WHERE ${courseAnyCond} 
                             LIMIT 50`,
                            courseParams
                        ).then(r => r[0])
                        : []
                ]);

                // Standardisation des items avec score de pertinence intelligent
                const rawResults = [
                    ...concoursRows.map(r => ({
                        type: 'Concours',
                        badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
                        titre: `${r.ecole} (${r.annee}) — ${r.epreuve}`,
                        description: `${r.filiere} • ${r.matiere}`,
                        rawTitle: `${r.ecole} ${r.epreuve} ${r.annee} ${r.filiere} ${r.matiere}`,
                        rawDesc: `${r.filiere} ${r.matiere}`,
                        url: `/concours/${r.id}`,
                        file: r.enonce_file || r.correction_file,
                        id: r.id,
                        itemType: 'concours'
                    })),
                    ...bookRows.map(r => ({
                        type: 'Livre',
                        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
                        titre: `${r.titre} (${r.collection})`,
                        description: `Auteur : ${r.auteur} • Discipline : ${r.discipline}`,
                        rawTitle: `${r.titre} ${r.collection} ${r.auteur}`,
                        rawDesc: `${r.collection} ${r.auteur} ${r.discipline}`,
                        url: `/livres/${r.id}`,
                        file: r.pdf_file,
                        id: r.id,
                        itemType: 'book'
                    })),
                    ...courseRows.map(r => ({
                        type: 'Cours',
                        badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
                        titre: r.titre,
                        description: `${r.discipline_nom || 'Physique'} • ${r.chapter_titre || ''} — ${r.description || 'Fiche de cours et synthèse complète.'}`,
                        rawTitle: `${r.titre} ${r.chapter_titre || ''}`,
                        rawDesc: `${r.discipline_nom || ''} ${r.description || ''}`,
                        url: `/cours/${r.chapter_id || r.id}`,
                        file: r.course_file,
                        id: r.id,
                        itemType: 'course'
                    })),
                    ...exerciseRows.map(r => ({
                        type: 'Exercice',
                        badgeClass: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
                        titre: r.titre,
                        description: r.description || 'Série d exercices corrigés avec énoncé et solution.',
                        rawTitle: r.titre,
                        rawDesc: r.description || '',
                        url: `/exercices/${r.id}`,
                        file: r.enonce_file || r.correction_file,
                        id: r.id,
                        itemType: 'exercise'
                    }))
                ];

                // Calcul du score de pertinence et tri
                results = rawResults
                    .map(item => {
                        const score = calculateRelevanceScore(item, queryWords, rawQueryNorm);
                        return { ...item, score };
                    })
                    .filter(item => item.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 30);
            }

            res.render('recherche', {
                title: rawQuery ? `Recherche Intelligente : ${rawQuery} | PhyChemia` : 'Moteur de Recherche Intelligent - PhyChemia',
                metaDescription: 'Moteur de recherche académique intelligent pour trouver cours, concours et livres CPGE.',
                page: 'recherche',
                q: rawQuery,
                type: typeFilter,
                results,
            });
        } catch (err) {
            next(err);
        }
    },

    /** 404 - Page non trouvee */
    notFound(req, res) {
        const url = req ? (req.originalUrl || req.url || '') : '';
        if (url.startsWith('/api/')) {
            return res.status(404).json({
                success: false,
                message: 'Ressource introuvable.',
            });
        }
        return res.status(404).render('404', { title: 'Page Non Trouvee - 404', page: '404' });
    },

    /** 500 - Erreur serveur */
    serverError(err, req, res, next) {
        const url = req ? (req.originalUrl || req.url || '') : '';
        console.error('server.error', {
            method: req ? req.method : 'UNKNOWN',
            url,
            message: err ? err.message : 'Unknown error',
            stack: err ? err.stack : '',
        });

        if (res && res.headersSent) return next(err);

        const errCode = err ? err.code : '';
        const dbDown = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR'].includes(errCode);
        const message = dbDown
            ? 'Le service est momentanement indisponible. Merci de reessayer dans quelques instants.'
            : 'Une erreur inattendue est survenue.';

        if (url.startsWith('/api/')) {
            return res.status(dbDown ? 503 : 500).json({ success: false, message });
        }
        return res.status(dbDown ? 503 : 500).render('500', { title: 'Erreur Serveur - 500', message, page: '500' });
    },
};

module.exports = pageController;
