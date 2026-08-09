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
            res.render('admin/users', { title: 'Gestion des Utilisateurs', page: 'admin-users', users });
        } catch (err) {
            next(err);
        }
    },

    async updateUserRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            await User.updateRole(id, role);
            res.redirect('/admin/users');
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
            res.render('admin/chapters', { title: 'Chapitres', page: 'admin-chapters', chapters, disciplines });
        } catch (err) {
            next(err);
        }
    },

    async saveChapter(req, res, next) {
        try {
            const { id, discipline_id, titre, slug, description, niveau } = req.body;
            // `ordre` reste accepte en repli : les anciens formulaires en cache
            // continuent de fonctionner apres le passage a `order_num`.
            const order_num = req.body.order_num !== undefined ? req.body.order_num : req.body.ordre;

            if (id) {
                await Chapter.update(id, { discipline_id, titre, slug, description, niveau, order_num });
            } else {
                await Chapter.create({ discipline_id, titre, slug, description, niveau, order_num });
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
            res.render('admin/courses', {
                title: 'Gestion des Cours',
                page: 'admin-courses',
                courses,
                chapters,
                error: req.query.error || null,
            });
        } catch (err) {
            next(err);
        }
    },

    async saveCourse(req, res, next) {
        try {
            const { id, chapter_id, titre, slug, description, contenu, niveau, order_num } = req.body;
            let course_file = null;
            if (req.file) {
                course_file = '/uploads/' + req.file.filename;
            }

            if (id) {
                await Course.update(id, { chapter_id, titre, slug, description, contenu, course_file, niveau, order_num });
            } else {
                await Course.create({ chapter_id, titre, slug, description, contenu, course_file, niveau, order_num });
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
                await Exercise.update(id, { chapter_id, titre, slug, description, enonce_file, correction_file, niveau, difficulte });
            } else {
                await Exercise.create({ chapter_id, titre, slug, description, enonce_file, correction_file, niveau, difficulte });
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
};

module.exports = adminController;
