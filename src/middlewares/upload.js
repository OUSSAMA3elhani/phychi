/**
 * Middleware d'upload de fichiers (PDFs & Images) avec Multer.
 */
const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '-');
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (!file || !file.originalname) {
        return cb(null, true);
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const allowedMimeTypes = [
        'application/pdf',
        'application/x-pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/octet-stream',
    ];

    if (allowedMimeTypes.includes(file.mimetype) || validExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non autorise. Seuls les fichiers PDF et images (.pdf, .jpg, .png, .webp) sont acceptes.'), false);
    }
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});

/** Traduit une erreur de televersement en message comprehensible. */
function describeUploadError(err) {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return 'Fichier trop volumineux : 15 Mo maximum.';
            case 'LIMIT_UNEXPECTED_FILE':
                return `Champ de fichier inattendu : « ${err.field} ».`;
            default:
                return `Téléversement refusé (${err.code}).`;
        }
    }
    return err.message || 'Le téléversement a échoué.';
}

/**
 * Enveloppe un middleware Multer pour qu'un fichier refuse produise un
 * message clair a l'ecran plutot qu'une page d'erreur 500 opaque.
 */
function withUploadErrors(middleware, redirectTo) {
    return function (req, res, next) {
        middleware(req, res, (err) => {
            if (!err) return next();

            console.warn('upload.rejected', { url: req.originalUrl, message: err.message });
            const message = describeUploadError(err);
            return res.redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
        });
    };
}

module.exports = upload;
module.exports.withUploadErrors = withUploadErrors;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
