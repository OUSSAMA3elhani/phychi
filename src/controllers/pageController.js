/**
 * Controleur des pages SSR (Server-Side Rendering avec EJS & Dynamic DB Models).
 */
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const Discipline = require('../models/Discipline');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Exercise = require('../models/Exercise');
const DownloadRequest = require('../models/DownloadRequest');

/**
 * Metadonnees de pagination + fabrique d'URL conservant les filtres actifs.
 *
 * `queryFor(n)` reconstruit la chaine de requete de la page n a partir des
 * filtres courants : sans cela, changer de page reinitialiserait les filtres.
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
            Object.entries(filters || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') params.set(k, v);
            });
            params.set('page', n);
            return '?' + params.toString();
        },
    };
}

/**
 * Rendu commun aux deux pages d'exercices : seule la discipline change.
 * Evite de dupliquer la logique de filtre et de pagination.
 */
async function renderExercises(req, res, next, disciplineSlug, view, title) {
    try {
        const filters = {
            chapitre: req.query.chapitre || 'tous',
            niveau: req.query.niveau || 'tous',
            difficulte: req.query.difficulte || 'toutes',
        };
        const PER_PAGE = 5;

        const [{ rows, total }, stats, chapters, favoriteIds, downloadStatus] = await Promise.all([
            Exercise.findPage({
                disciplineSlug,
                chapitre: filters.chapitre === 'tous' ? null : filters.chapitre,
                niveau: filters.niveau,
                difficulte: filters.difficulte,
                page: req.query.page,
                perPage: PER_PAGE,
            }),
            Exercise.stats(disciplineSlug),
            Chapter.findByDisciplineSlug(disciplineSlug),
            Favorite.idsFor(req.session.userId, 'exercise'),
            DownloadRequest.statusMap(req.session.userId, 'exercise'),
        ]);

        res.render(view, {
            title,
            page: view,
            exercises: rows,
            chapters,
            stats,
            filters,
            favoriteIds,
            downloadStatus,
            pagination: paginate(total, req.query.page, PER_PAGE, filters),
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
                title: 'PhyChemia - Physique & Chimie pour l\'Enseignement Supérieur | Accueil',
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
            const user = res.locals.user || await User.findById(req.session.userId);
            res.render('profil', { title: 'Mon Profil - PhyChemia', user, page: 'profil' });
        } catch (err) {
            next(err);
        }
    },

    /** Favorites page (Protected) */
    async favoris(req, res, next) {
        try {
            const [courses, exercises] = await Promise.all([
                Favorite.listCourses(req.session.userId),
                Favorite.listExercises(req.session.userId),
            ]);
            res.render('favoris', {
                title: 'Mes Favoris - PhyChemia',
                page: 'favoris',
                favoriteCourses: courses,
                favoriteExercises: exercises,
                total: courses.length + exercises.length,
            });
        } catch (err) {
            next(err);
        }
    },

    /** Chapitres (Dynamic from DB) */
    async chapitres(req, res, next) {
        try {
            const disciplines = await Discipline.findAll();
            const chapters = await Chapter.findAll();
            res.render('chapitres', {
                title: 'Chapitres - PhyChemia',
                page: 'chapitres',
                disciplines,
                chapters,
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
            const filters = {
                discipline: req.query.discipline || 'toutes',
                niveau: req.query.niveau || 'tous',
            };
            const PER_PAGE = 6;

            const [{ rows, total }, stats, disciplines] = await Promise.all([
                Chapter.findPage({
                    discipline: filters.discipline,
                    niveau: filters.niveau,
                    page: req.query.page,
                    perPage: PER_PAGE,
                }),
                Course.stats(),
                Discipline.findAll(),
            ]);

            res.render('cours', {
                title: 'Fiches de Cours - PhyChemia',
                page: 'cours',
                chapters: rows,
                disciplines,
                stats,
                filters,
                pagination: paginate(total, req.query.page, PER_PAGE, filters),
            });
        } catch (err) {
            next(err);
        }
    },

    /** Page de detail d'un chapitre : /chapitres/:id */
    async chapitreDetails(req, res, next) {
        try {
            const id = Number.parseInt(req.params.id, 10);
            if (!Number.isInteger(id) || id <= 0) return pageController.notFound(req, res);

            const chapter = await Chapter.findByIdDetailed(id);
            if (!chapter) return pageController.notFound(req, res);

            const [courses, exercises, siblings, downloadStatus] = await Promise.all([
                Course.findByChapter(chapter.id),
                Exercise.findByChapter(chapter.id),
                Chapter.findSiblings(chapter, 6),
                DownloadRequest.statusMap(req.session.userId, 'course'),
            ]);

            res.render('chapitre-details', {
                title: `${chapter.titre} - PhyChemia`,
                page: 'chapitre-details',
                chapter,
                courses,
                exercises,
                siblings,
                downloadStatus,
                isChimie: chapter.discipline_slug === 'chimie',
            });
        } catch (err) {
            next(err);
        }
    },

    /** Exercices Physique - filtres + pagination + statistiques reelles */
    exercicesPhysique(req, res, next) {
        return renderExercises(req, res, next, 'physique', 'exercices-physique', 'Exercices de Physique - PhyChemia');
    },

    /** Exercices Chimie - filtres + pagination + statistiques reelles */
    exercicesChimie(req, res, next) {
        return renderExercises(req, res, next, 'chimie', 'exercices-chimie', 'Exercices de Chimie - PhyChemia');
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
                title: `${exercise.titre} - PhyChemia`,
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
        res.render('login', { title: 'Connexion - PhyChemia', page: 'login', next: req.query.next || '' });
    },

    /** Register page */
    inscription(req, res) {
        res.render('inscription', { title: 'Inscription - PhyChemia', page: 'inscription' });
    },

    /** Contact */
    contact(req, res) {
        res.render('contact', { title: 'Contact - PhyChemia', page: 'contact' });
    },

    /** A propos */
    apropos(req, res) {
        res.render('apropos', { title: 'A propos - PhyChemia', page: 'apropos' });
    },

    /** FAQ */
    faq(req, res) {
        res.render('faq', { title: 'Foire Aux Questions - PhyChemia', page: 'faq' });
    },

    /** Recherche */
    recherche(req, res) {
        res.render('recherche', { title: 'Recherche - PhyChemia', query: req.query.q || '', page: 'recherche' });
    },

    /** Mentions Legales */
    mentionsLegales(req, res) {
        res.render('mentions-legales', { title: 'Mentions Legales - PhyChemia', page: 'mentions-legales' });
    },

    /** Politique de Confidentialite */
    politiqueConfidentialite(req, res) {
        res.render('politique-confidentialite', { title: 'Politique de Confidentialite - PhyChemia', page: 'politique-confidentialite' });
    },

    /** 404 - Page non trouvee */
    notFound(req, res) {
        if (req.originalUrl.startsWith('/api/')) {
            return res.status(404).json({
                success: false,
                message: 'Ressource introuvable.',
            });
        }
        return res.status(404).render('404', { title: 'Page Non Trouvee - 404', page: '404' });
    },

    /** 500 - Erreur serveur */
    serverError(err, req, res, next) {
        console.error('server.error', {
            method: req.method,
            url: req.originalUrl,
            message: err.message,
            stack: err.stack,
        });

        if (res.headersSent) return next(err);

        const dbDown = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR'].includes(err.code);
        const message = dbDown
            ? 'Le service est momentanement indisponible. Merci de reessayer dans quelques instants.'
            : 'Une erreur inattendue est survenue.';

        if (req.originalUrl.startsWith('/api/')) {
            return res.status(dbDown ? 503 : 500).json({ success: false, message });
        }
        return res.status(dbDown ? 503 : 500).render('500', { title: 'Erreur Serveur - 500', message, page: '500' });
    },
};

module.exports = pageController;
