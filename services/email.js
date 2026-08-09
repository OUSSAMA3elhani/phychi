/**
 * Envoi d'e-mails via la passerelle de GoDaddy Node.js Hosting.
 *
 * Copie (variante JavaScript) du helper `sendEmail()` fourni par le skill
 * godaddy-nodejs-hosting - regle C13 du contrat. La passerelle ecoute sur
 * 127.0.0.1:2525 a l'interieur de chaque conteneur : trafic loopback
 * uniquement, donc pas de TLS necessaire.
 *
 * Ne JAMAIS poster directement sur la passerelle depuis un controleur, et ne
 * jamais importer nodemailer : le SMTP sortant n'est pas routable depuis le
 * conteneur.
 *
 * En local (XAMPP), cette passerelle n'existe pas : l'appel echoue et
 * l'appelant doit traiter cela comme non bloquant.
 */

const EMAIL_GATEWAY_URL = 'http://127.0.0.1:2525/api/email/send';
const REQUEST_TIMEOUT_MS = 30_000;

async function sendEmail(input) {
    const payload = buildPayload(input);

    // AbortSignal.timeout() couvre la connexion, les en-tetes ET la lecture du
    // corps : un setTimeout annule apres la resolution des en-tetes laisserait
    // la lecture du corps sans protection.
    let response;
    let body;
    try {
        response = await fetch(EMAIL_GATEWAY_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        body = await parseBody(response);
    } catch (err) {
        throw new Error(`email gateway unreachable: ${describeError(err)}`);
    }

    if (!response.ok || !body.success) {
        const detail = body.error ?? `HTTP ${response.status}`;
        const idSuffix = body.messageId ? ` (messageId=${body.messageId})` : '';
        throw new Error(`email send failed: ${detail}${idSuffix}`);
    }

    if (!body.messageId) {
        throw new Error('email send succeeded but gateway returned no messageId');
    }

    return { messageId: body.messageId };
}

function buildPayload(input) {
    const payload = {
        to: toArray(input.to),
        subject: input.subject,
    };
    const cc = toArray(input.cc);
    if (cc.length > 0) payload.cc = cc;
    const bcc = toArray(input.bcc);
    if (bcc.length > 0) payload.bcc = bcc;
    if (input.text) payload.text = input.text;
    if (input.html) payload.html = input.html;
    if (input.replyTo) payload.replyTo = input.replyTo;
    if (input.from) payload.from = input.from;
    if (input.attachments && input.attachments.length > 0) {
        payload.attachments = input.attachments.map(encodeAttachment);
    }
    return payload;
}

function toArray(value) {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
}

function encodeAttachment(att) {
    const out = {
        filename: att.filename,
        content: Buffer.from(att.content).toString('base64'),
    };
    if (att.contentType) out.contentType = att.contentType;
    return out;
}

async function parseBody(response) {
    try {
        return await response.json();
    } catch (err) {
        // Ne pas avaler les abandons : on les relance pour que le catch
        // exterieur signale le depassement de delai.
        if (isAbortLike(err)) throw err;
        return { success: false, error: `non-JSON response (HTTP ${response.status})` };
    }
}

function isAbortLike(err) {
    return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

function describeError(err) {
    if (err instanceof Error) {
        if (isAbortLike(err)) return `timed out after ${REQUEST_TIMEOUT_MS}ms`;
        return err.message;
    }
    return String(err);
}

module.exports = { sendEmail };
