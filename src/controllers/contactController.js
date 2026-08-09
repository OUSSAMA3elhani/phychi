/**
 * Controleur du formulaire de contact.
 *
 * La base de donnees est la source de verite : des lors que le message y est
 * enregistre, la soumission est un succes. L'e-mail de notification est un
 * accessoire - son echec est journalise mais ne fait pas echouer la requete,
 * sinon un message deja stocke serait signale comme perdu a l'utilisateur.
 *
 * L'envoi passe obligatoirement par le helper `sendEmail()` de la passerelle
 * GoDaddy (regle C13) : ni nodemailer, ni SMTP externe.
 */
const Contact = require('../models/Contact');
const { sendEmail } = require('../../services/email');
const { validateContact } = require('../middlewares/validators');

// Garde-fou anti-abus : nombre de messages autorises par IP et par fenetre.
const MAX_PER_WINDOW = 5;
const WINDOW_MINUTES = 10;

const SUJET_LABELS = {
    question: 'Question sur un cours ou un exercice',
    erreur: "Signalement d'une erreur",
    suggestion: "Proposition d'amelioration",
    technique: 'Probleme technique / compte',
    autre: 'Autre demande',
};

/**
 * Notifie l'administrateur. Ne leve jamais : renvoie true/false.
 * Le destinataire vient de l'environnement (regle C13) ; non defini, on
 * n'envoie rien - le message reste consultable en base.
 */
async function notifyAdmin(contact) {
    const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
    if (!recipient) {
        console.warn(
            'email.contact_form.recipient_unset - message #%d enregistre en base, aucune notification envoyee',
            contact.id
        );
        return false;
    }

    try {
        await sendEmail({
            to: recipient,
            // Permet de repondre directement a l'expediteur.
            replyTo: contact.email,
            subject: `[PhyChi] ${SUJET_LABELS[contact.sujet] || contact.sujet} - ${contact.nom}`,
            // Volontairement en texte brut : interpoler une saisie utilisateur
            // dans du HTML sans echappement ouvrirait une injection.
            text: [
                `Nouveau message depuis le formulaire de contact PhyChi.`,
                ``,
                `Nom     : ${contact.nom}`,
                `E-mail  : ${contact.email}`,
                `Sujet   : ${SUJET_LABELS[contact.sujet] || contact.sujet}`,
                `Recu le : ${new Date(contact.created_at).toLocaleString('fr-FR')}`,
                `Ref     : #${contact.id}`,
                ``,
                `--- Message ---`,
                contact.message,
            ].join('\n'),
        });
        console.log('email.contact_form.sent', { contactId: contact.id });
        return true;
    } catch (err) {
        // On journalise cote serveur sans jamais renvoyer l'erreur brute au
        // visiteur : elle peut contenir des details d'infrastructure.
        console.error('email.send.failed', { contactId: contact.id, error: err.message });
        return false;
    }
}

const contactController = {
    /** POST /api/contact */
    async submit(req, res, next) {
        try {
            const { valid, errors, data } = validateContact(req.body);
            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Veuillez corriger les champs indiques.',
                    errors,
                });
            }

            const ip = req.ip;

            const recent = await Contact.countRecentByIp(ip, WINDOW_MINUTES);
            if (recent >= MAX_PER_WINDOW) {
                return res.status(429).json({
                    success: false,
                    message: `Vous avez envoye trop de messages. Merci de patienter quelques minutes avant de reessayer.`,
                });
            }

            const contact = await Contact.create({ ...data, ip });

            // Non bloquant : le message est deja enregistre.
            await notifyAdmin(contact);

            return res.status(201).json({
                success: true,
                message: 'Votre message a bien ete envoye. Nous vous repondrons rapidement.',
                data: { reference: contact.id },
            });
        } catch (err) {
            return next(err);
        }
    },
};

module.exports = contactController;
