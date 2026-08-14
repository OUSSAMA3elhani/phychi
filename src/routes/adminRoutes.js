/**
 * Routes de l'espace administration (/admin).
 */
const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { withUploadErrors } = require('../middlewares/upload');

const router = express.Router();

// Middleware global pour l'administration
router.use(requireAuth, isAdmin);

// Dashboard
router.get('/', adminController.dashboard);

// Users
router.get('/users', adminController.listUsers);
router.post('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/delete', adminController.deleteUser);

// Contacts
router.get('/contacts', adminController.listContacts);
router.post('/contacts/:id/status', adminController.updateContactStatus);
router.post('/contacts/:id/delete', adminController.deleteContact);

// Disciplines
router.get('/disciplines', adminController.listDisciplines);
router.post('/disciplines/save', adminController.saveDiscipline);
router.post('/disciplines/:id/delete', adminController.deleteDiscipline);

// Chapters
router.get('/chapters', adminController.listChapters);
router.post('/chapters/save', adminController.saveChapter);
router.post('/chapters/:id/delete', adminController.deleteChapter);

// Courses - un seul fichier joint par fiche de cours
router.get('/courses', adminController.listCourses);
router.post(
    '/courses/save',
    withUploadErrors(upload.single('course_file'), '/admin/courses'),
    adminController.saveCourse
);
router.post('/courses/:id/delete', adminController.deleteCourse);

// Exercises - deux champs distincts : enonce et correction
router.get('/exercises', adminController.listExercises);
router.post(
    '/exercises/save',
    withUploadErrors(
        upload.fields([
            { name: 'enonce_file', maxCount: 1 },
            { name: 'correction_file', maxCount: 1 },
        ]),
        '/admin/exercises'
    ),
    adminController.saveExercise
);
router.post('/exercises/:id/delete', adminController.deleteExercise);

// Demandes de telechargement
router.get('/downloads', adminController.listDownloads);
router.post('/downloads/:id/status', adminController.updateDownloadStatus);
router.post('/downloads/:id/delete', adminController.deleteDownload);

// Livres CPGE
router.get('/books', adminController.listBooks);
router.post(
    '/books/save',
    withUploadErrors(upload.single('pdf_file'), '/admin/books'),
    adminController.saveBook
);
router.post('/books/:id/delete', adminController.deleteBook);

// Concours & Annales
router.get('/concours', adminController.listConcours);
router.post(
    '/concours/save',
    withUploadErrors(
        upload.fields([
            { name: 'enonce_file', maxCount: 1 },
            { name: 'correction_file', maxCount: 1 },
        ]),
        '/admin/concours'
    ),
    adminController.saveConcours
);
router.post('/concours/:id/delete', adminController.deleteConcours);

module.exports = router;
