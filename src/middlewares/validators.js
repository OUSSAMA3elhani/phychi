/**
 * Validation et normalisation des entrees.
 *
 * Chaque fonction renvoie { valid, errors, data } :
 *   - `errors` associe un nom de champ a un message en francais, affichable
 *     tel quel a cote du champ concerne cote client ;
 *   - `data` contient les valeurs nettoyees (trim, minuscules pour l'e-mail).
 *
 * Aucune valeur brute issue de la requete n'atteint la couche modele.
 */

// Volontairement permissif : la validation stricte d'un e-mail se fait par
// l'envoi d'un message, pas par une expression reguliere.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NIVEAUX = ['l1', 'l2', 'l3', 'master', 'autre'];
const SUJETS = ['question', 'erreur', 'suggestion', 'technique', 'autre'];

const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignore silencieusement les octets au-dela de 72 : on refuse plutot
// que de laisser croire qu'un mot de passe plus long est pris en compte.
const MAX_PASSWORD_BYTES = 72;

function str(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function checkPassword(password, errors, field = 'password') {
    if (!password) {
        errors[field] = 'Le mot de passe est obligatoire.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
        errors[field] = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caracteres.`;
    } else if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
        errors[field] = 'Le mot de passe est trop long (72 octets maximum).';
    }
}

/** Inscription. */
function validateRegistration(body = {}) {
    const errors = {};

    const nom = str(body.nom);
    const prenom = str(body.prenom);
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const passwordConfirm = typeof body.password_confirm === 'string' ? body.password_confirm : '';
    const niveau = str(body.niveau).toLowerCase();

    if (!nom) errors.nom = 'Le nom est obligatoire.';
    else if (nom.length > 100) errors.nom = 'Le nom ne doit pas depasser 100 caracteres.';

    if (!prenom) errors.prenom = 'Le prenom est obligatoire.';
    else if (prenom.length > 100) errors.prenom = 'Le prenom ne doit pas depasser 100 caracteres.';

    if (!email) errors.email = 'L adresse e-mail est obligatoire.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Cette adresse e-mail n est pas valide.';
    else if (email.length > 255) errors.email = 'L adresse e-mail est trop longue.';

    checkPassword(password, errors);

    if (!errors.password && password !== passwordConfirm) {
        errors.password_confirm = 'Les deux mots de passe ne sont pas identiques.';
    }

    if (!niveau) errors.niveau = 'Le niveau d etudes est obligatoire.';
    else if (!NIVEAUX.includes(niveau)) errors.niveau = 'Ce niveau d etudes n est pas reconnu.';

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: { nom, prenom, email, password, niveau },
    };
}

/** Connexion. Volontairement laxiste : on ne revele pas quel champ est faux. */
function validateLogin(body = {}) {
    const errors = {};

    const email = str(body.email).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email) errors.email = 'L adresse e-mail est obligatoire.';
    if (!password) errors.password = 'Le mot de passe est obligatoire.';

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: { email, password },
    };
}

/** Formulaire de contact. */
function validateContact(body = {}) {
    const errors = {};

    const nom = str(body.nom);
    const email = str(body.email).toLowerCase();
    const sujet = str(body.sujet).toLowerCase();
    const message = str(body.message);

    if (!nom) errors.nom = 'Le nom est obligatoire.';
    else if (nom.length > 150) errors.nom = 'Le nom ne doit pas depasser 150 caracteres.';

    if (!email) errors.email = 'L adresse e-mail est obligatoire.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Cette adresse e-mail n est pas valide.';

    if (!sujet) errors.sujet = 'Le sujet est obligatoire.';
    else if (!SUJETS.includes(sujet)) errors.sujet = 'Ce sujet n est pas reconnu.';

    if (!message) errors.message = 'Le message est obligatoire.';
    else if (message.length < 10) errors.message = 'Le message doit contenir au moins 10 caracteres.';
    else if (message.length > 5000) errors.message = 'Le message ne doit pas depasser 5000 caracteres.';

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: { nom, email, sujet, message },
    };
}

/** Mise a jour du profil (sans mot de passe). */
function validateProfileUpdate(body = {}) {
    const errors = {};

    const nom = str(body.nom);
    const prenom = str(body.prenom);
    const email = str(body.email).toLowerCase();
    const niveau = str(body.niveau).toLowerCase();

    if (!nom) errors.nom = 'Le nom est obligatoire.';
    if (!prenom) errors.prenom = 'Le prenom est obligatoire.';
    if (!email) errors.email = 'L adresse e-mail est obligatoire.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Cette adresse e-mail n est pas valide.';
    if (niveau && !NIVEAUX.includes(niveau)) errors.niveau = 'Ce niveau d etudes n est pas reconnu.';

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: { nom, prenom, email, niveau: niveau || 'autre' },
    };
}

/** Changement de mot de passe. */
function validatePasswordChange(body = {}) {
    const errors = {};

    const currentPassword = typeof body.current_password === 'string' ? body.current_password : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
    const confirmPassword = typeof body.confirm_password === 'string' ? body.confirm_password : '';

    if (!currentPassword) errors.current_password = 'Le mot de passe actuel est obligatoire.';

    checkPassword(newPassword, errors, 'new_password');

    if (!errors.new_password && newPassword !== confirmPassword) {
        errors.confirm_password = 'Les deux mots de passe ne sont pas identiques.';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: { currentPassword, newPassword },
    };
}

module.exports = {
    validateRegistration,
    validateLogin,
    validateContact,
    validateProfileUpdate,
    validatePasswordChange,
    NIVEAUX,
    SUJETS,
};
