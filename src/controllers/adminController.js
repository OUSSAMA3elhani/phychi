/**
 * Controleur d'administration (CRUD pour les entites de l'application).
 */
const User = require('../models/User');
const Contact = require('../models/Contact');
const Discipline = require('../models/Discipline');
const Chapter = require('../models/Chapter');
const Course = require('../models/Course');
const Exercise = require('../models/Exercise');
const DownloadRequest = require('../models/DownloadRequest');
const Book = require('../models/Book');
const Concours = require('../models/Concours');

const adminController = {
    /** GET /admin - Tableau de bord avec statistiques */
    async dashboard(req, res, next) {
        try {
            const stats = {
                usersCount: await User.countAll(),
                contactsCount: await Contact.countAll(),
                disciplinesCount: await Discipline.countAll(),
                chaptersCount: await Chapter.countAll(),
                coursesCount: await Course.countAll(),
                exercisesCount: await Exercise.countAll(),
                booksCount: await Book.countAll(),
                concoursCount: await Concours.countAll(),
                pendingDownloads: (await DownloadRequest.countByStatus()).pending,
            };

            const recentContacts = await Contact.findAll({ limit: 5 });
            const recentUsers = await User.findAll();

            res.render('admin/dashboard', {
                title: 'Tableau de bord - Admin',
                page: 'admin-dashboard',
                stats,
                recentContacts,
                recentUsers: recentUsers.slice(0, 5),
            });
        } catch (err) {
            next(err);
        }
    },

    // --- USERS -----------------------------------------------------------------
    async listUsers(req, res, next) {
        try {
            const users = await User.findAll();
            const successMsg = req.query.success || null;
            const errorMsg = req.query.error || null;
            res.render('admin/users', {
                title: 'Gestion des Utilisateurs',
                page: 'admin-users',
                users,
                successMsg,
                errorMsg
            });
        } catch (err) {
            next(err);
        }
    },

    async updateUserRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!['user', 'admin'].includes(role)) {
                return res.redirect('/admin/users?error=R%C3%B4le+invalide.');
            }

            if (req.user && parseInt(id, 10) === req.user.id && role !== 'admin') {
                return res.redirect('/admin/users?error=Vous+ne+pouvez+pas+retirer+vos+propres+droits+d%27administrateur.');
            }

            await User.updateRole(id, role);
            res.redirect('/admin/users?success=R%C3%B4le+mis+%C3%A0+jour+avec+succ%C3%A8s.');
        } catch (err) {
            next(err);
        }
    },

    async deleteUser(req, res, next) {
        try {
            await User.delete(req.params.id);
            res.redirect('/admin/users');
        } catch (err) {
            next(err);
        }
    },

    // --- CONTACTS --------------------------------------------------------------
    async listContacts(req, res, next) {
        try {
            const contacts = await Contact.findAll({ limit: 100 });
            res.render('admin/contacts', { title: 'Formulaires de Contact', page: 'admin-contacts', contacts });
        } catch (err) {
            next(err);
        }
    },

    async updateContactStatus(req, res, next) {
        try {
            await Contact.updateStatus(req.params.id, req.body.statut);
            res.redirect('/admin/contacts');
        } catch (err) {
            next(err);
        }
    },

    async deleteContact(req, res, next) {
        try {
            await Contact.delete(req.params.id);
            res.redirect('/admin/contacts');
        } catch (err) {
            next(err);
        }
    },

    // --- DISCIPLINES -----------------------------------------------------------
    async listDisciplines(req, res, next) {
        try {
            const disciplines = await Discipline.findAll();
            res.render('admin/disciplines', { title: 'Disciplines', page: 'admin-disciplines', disciplines });
        } catch (err) {
            next(err);
        }
    },

    async saveDiscipline(req, res, next) {
        try {
            const { id, nom, slug, description } = req.body;
            if (id) {
                await Discipline.update(id, { nom, slug, description });
            } else {
                await Discipline.create({ nom, slug, description });
            }
            res.redirect('/admin/disciplines');
        } catch (err) {
            next(err);
        }
    },

    async deleteDiscipline(req, res, next) {
        try {
            await Discipline.delete(req.params.id);
            res.redirect('/admin/disciplines');
        } catch (err) {
            next(err);
        }
    },

    // --- CHAPTERS --------------------------------------------------------------
    async listChapters(req, res, next) {
        try {
            const chapters = await Chapter.findAll();
            const disciplines = await Discipline.findAll();
            res.render('admin/chapters', { title: 'Cours & Modules', page: 'admin-chapters', chapters, disciplines });
        } catch (err) {
            next(err);
        }
    },

    async saveChapter(req, res, next) {
        try {
            const { id, discipline_id, titre, slug, description, niveau } = req.body;
            let discId = discipline_id;
            if (!discId) {
                const firstDisc = (await Discipline.findAll())[0];
                discId = firstDisc ? firstDisc.id : 1;
            }
            // `ordre` reste accepte en repli : les anciens formulaires en cache
            // continuent de fonctionner apres le passage a `order_num`.
            const order_num = req.body.order_num !== undefined ? req.body.order_num : req.body.ordre;

            if (id) {
                await Chapter.update(id, { discipline_id: discId, titre, slug, description, niveau, order_num });
            } else {
                await Chapter.create({ discipline_id: discId, titre, slug, description, niveau, order_num });
            }
            res.redirect('/admin/chapters');
        } catch (err) {
            next(err);
        }
    },

    async deleteChapter(req, res, next) {
        try {
            await Chapter.delete(req.params.id);
            res.redirect('/admin/chapters');
        } catch (err) {
            next(err);
        }
    },

    // --- COURSES ---------------------------------------------------------------
    async listCourses(req, res, next) {
        try {
            const courses = await Course.findAll();
            const chapters = await Chapter.findAll();
            const disciplines = await Discipline.findAll();
            res.render('admin/courses', {
                title: 'Chapitres & Fichiers PDF',
                page: 'admin-courses',
                courses,
                chapters,
                disciplines,
                error: req.query.error || null,
            });
        } catch (err) {
            next(err);
        }
    },

    async saveCourse(req, res, next) {
        try {
            const { id, chapter_id, titre, slug, description, contenu, niveau, order_num } = req.body;
            let chapId = chapter_id;
            if (!chapId) {
                const firstChap = (await Chapter.findAll())[0];
                chapId = firstChap ? firstChap.id : 1;
            }
            let course_file = null;
            if (req.file) {
                course_file = '/uploads/' + req.file.filename;
            }

            if (id) {
                await Course.update(id, { chapter_id: chapId, titre, slug, description, contenu, course_file, niveau, order_num });
            } else {
                await Course.create({ chapter_id: chapId, titre, slug, description, contenu, course_file, niveau, order_num });
            }
            res.redirect('/admin/courses');
        } catch (err) {
            next(err);
        }
    },

    async deleteCourse(req, res, next) {
        try {
            await Course.delete(req.params.id);
            res.redirect('/admin/courses');
        } catch (err) {
            next(err);
        }
    },

    // --- EXERCISES -------------------------------------------------------------
    async listExercises(req, res, next) {
        try {
            const exercises = await Exercise.findAll();
            const chapters = await Chapter.findAll();
            res.render('admin/exercises', {
                title: 'Gestion des Exercices',
                page: 'admin-exercises',
                exercises,
                chapters,
                error: req.query.error || null,
            });
        } catch (err) {
            next(err);
        }
    },

    async saveExercise(req, res, next) {
        try {
            const { id, chapter_id, titre, slug, description, niveau, difficulte } = req.body;
            let chapId = chapter_id;
            if (!chapId) {
                const firstChap = (await Chapter.findAll())[0];
                chapId = firstChap ? firstChap.id : 1;
            }
            let enonce_file = null;
            let correction_file = null;

            if (req.files) {
                if (req.files.enonce_file && req.files.enonce_file[0]) {
                    enonce_file = '/uploads/' + req.files.enonce_file[0].filename;
                }
                if (req.files.correction_file && req.files.correction_file[0]) {
                    correction_file = '/uploads/' + req.files.correction_file[0].filename;
                }
            }

            if (id) {
                await Exercise.update(id, { chapter_id: chapId, titre, slug, description, enonce_file, correction_file, niveau, difficulte });
            } else {
                await Exercise.create({ chapter_id: chapId, titre, slug, description, enonce_file, correction_file, niveau, difficulte });
            }
            res.redirect('/admin/exercises');
        } catch (err) {
            next(err);
        }
    },

    async deleteExercise(req, res, next) {
        try {
            await Exercise.delete(req.params.id);
            res.redirect('/admin/exercises');
        } catch (err) {
            next(err);
        }
    },

    // --- DEMANDES DE TELECHARGEMENT --------------------------------------------
    async listDownloads(req, res, next) {
        try {
            // `statut` filtre l'affichage ; par defaut on montre tout, les
            // demandes en attente etant remontees en tete par le modele.
            const statut = ['pending', 'approved', 'rejected'].includes(req.query.statut)
                ? req.query.statut
                : null;

            const [requests, counts] = await Promise.all([
                DownloadRequest.findAll({ status: statut }),
                DownloadRequest.countByStatus(),
            ]);

            res.render('admin/downloads', {
                title: 'Demandes de téléchargement',
                page: 'admin-downloads',
                requests,
                counts,
                statut,
            });
        } catch (err) {
            next(err);
        }
    },

    async updateDownloadStatus(req, res, next) {
        try {
            const { status } = req.body;
            if (!DownloadRequest.isValidStatus(status)) {
                return res.redirect('/admin/downloads');
            }
            await DownloadRequest.updateStatus(req.params.id, status);
            return res.redirect('/admin/downloads' + (req.query.statut ? `?statut=${req.query.statut}` : ''));
        } catch (err) {
            return next(err);
        }
    },

    async deleteDownload(req, res, next) {
        try {
            await DownloadRequest.delete(req.params.id);
            res.redirect('/admin/downloads');
        } catch (err) {
            next(err);
        }
    },

    // --- LIVRES CPGE -----------------------------------------------------------
    async listBooks(req, res, next) {
        try {
            const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
            const { rows: books, total } = await Book.findPage({ page, perPage: 20 });
            res.render('admin/books', {
                title: 'Gestion des Livres CPGE - Admin',
                page: 'admin-books',
                books,
                total,
                currentPage: page,
                totalPages: Math.ceil(total / 20),
            });
        } catch (err) {
            next(err);
        }
    },

    async saveBook(req, res, next) {
        try {
            const { id, titre, collection, auteur, discipline, niveau } = req.body;
            const safeTitle = titre || 'Livre CPGE';
            const pdfFile = req.file ? `/uploads/${req.file.filename}` : null;
            const slug = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

            if (id) {
                const existing = await Book.findById(id);
                if (!existing) return res.redirect('/admin/books');
                await Book.update(id, {
                    titre: safeTitle,
                    collection: collection || 'Collection CPGE',
                    auteur: auteur || null,
                    discipline: discipline || 'Physique',
                    niveau: niveau || 'CPGE',
                    pdf_file: pdfFile || existing.pdf_file,
                    slug: existing.slug || slug,
                });
            } else {
                await Book.create({
                    titre: safeTitle,
                    collection: collection || 'Collection CPGE',
                    auteur: auteur || null,
                    discipline: discipline || 'Physique',
                    niveau: niveau || 'CPGE',
                    pdf_file: pdfFile || '',
                    slug,
                });
            }
            res.redirect('/admin/books');
        } catch (err) {
            next(err);
        }
    },

    async deleteBook(req, res, next) {
        try {
            await Book.delete(req.params.id);
            res.redirect('/admin/books');
        } catch (err) {
            next(err);
        }
    },

    // --- CONCOURS & ANNALES ----------------------------------------------------
    async listConcours(req, res, next) {
        try {
            const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
            const { rows: concoursList, total } = await Concours.findPage({ page, perPage: 20 });
            res.render('admin/concours', {
                title: 'Gestion des Concours & Annales - Admin',
                page: 'admin-concours',
                concoursList,
                total,
                currentPage: page,
                totalPages: Math.ceil(total / 20),
            });
        } catch (err) {
            next(err);
        }
    },

    async saveConcours(req, res, next) {
        try {
            const { id, titre, ecole, annee, filiere, epreuve, matiere } = req.body;
            const safeEcole = ecole || 'Concours Général';
            const safeEpreuve = epreuve || 'Épreuve';
            const safeAnnee = Number.parseInt(annee, 10) || new Date().getFullYear();
            const safeTitle = titre || `${safeEcole} ${safeAnnee} ${safeEpreuve}`;

            const enonceFile = req.files && req.files.enonce_file ? `/uploads/${req.files.enonce_file[0].filename}` : null;
            const correctionFile = req.files && req.files.correction_file ? `/uploads/${req.files.correction_file[0].filename}` : null;
            const slug = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

            if (id) {
                const existing = await Concours.findById(id);
                if (!existing) return res.redirect('/admin/concours');
                await Concours.update(id, {
                    titre: safeTitle,
                    ecole: safeEcole,
                    annee: safeAnnee,
                    filiere: filiere || 'MP',
                    epreuve: safeEpreuve,
                    matiere: matiere || 'Physique',
                    enonce_file: enonceFile || existing.enonce_file,
                    correction_file: correctionFile || existing.correction_file,
                    slug: existing.slug || slug,
                });
            } else {
                await Concours.create({
                    titre: safeTitle,
                    ecole: safeEcole,
                    annee: safeAnnee,
                    filiere: filiere || 'MP',
                    epreuve: safeEpreuve,
                    matiere: matiere || 'Physique',
                    enonce_file: enonceFile || null,
                    correction_file: correctionFile || null,
                    slug,
                });
            }
            res.redirect('/admin/concours');
        } catch (err) {
            next(err);
        }
    },

    async deleteConcours(req, res, next) {
        try {
            await Concours.delete(req.params.id);
            res.redirect('/admin/concours');
        } catch (err) {
            next(err);
        }
    },
};

module.exports = adminController;
