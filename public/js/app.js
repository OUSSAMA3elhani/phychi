/**
 * PhyChi - liaison du front avec l'API Express.
 *
 * Prend en charge, si l'element existe sur la page :
 *   #register-form  -> POST   /api/auth/register
 *   #login-form     -> POST   /api/auth/login
 *   #contact-form   -> POST   /api/contact
 *   #profile-form   -> PUT    /api/auth/profile
 *   #password-form  -> PUT    /api/auth/password
 *   [data-logout]   -> POST   /api/auth/logout
 *
 * L'endpoint et la methode sont lus sur le formulaire (data-endpoint /
 * data-method), ce qui evite de coder les URLs en dur ici.
 *
 * Sans JavaScript, les formulaires conservent leur `action` et `method` et
 * sont postes normalement : l'API accepte aussi l'encodage urlencoded.
 */
(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // Utilitaires d'affichage
    // -------------------------------------------------------------------------

    /** Reutilise le toast de script.js quand il est present. */
    function toast(message) {
        if (typeof window.showToast === 'function') window.showToast(message);
    }

    const ERROR_CLASSES = ['border-rose-400', 'dark:border-rose-500/60'];

    /** Efface les messages d'erreur d'un formulaire. */
    function clearErrors(form) {
        form.querySelectorAll('[data-error-for]').forEach((el) => el.remove());
        form.querySelectorAll('[aria-invalid="true"]').forEach((field) => {
            field.removeAttribute('aria-invalid');
            field.classList.remove(...ERROR_CLASSES);
        });
        const banner = form.querySelector('[data-form-alert]');
        if (banner) banner.remove();
    }

    /** Affiche un message sous le champ concerne. */
    function showFieldError(form, fieldName, message) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (!field) return false;

        field.setAttribute('aria-invalid', 'true');
        field.classList.add(...ERROR_CLASSES);

        const p = document.createElement('p');
        p.setAttribute('data-error-for', fieldName);
        p.className = 'mt-1.5 text-sm font-medium text-rose-600 dark:text-rose-400';
        p.textContent = message;
        field.insertAdjacentElement('afterend', p);
        return true;
    }

    /** Banniere de message en tete de formulaire. */
    function showAlert(form, message, type) {
        const styles =
            type === 'success'
                ? 'border-flask-200 bg-flask-50 text-flask-800 dark:border-flask-500/30 dark:bg-flask-500/10 dark:text-flask-300'
                : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300';

        const div = document.createElement('div');
        div.setAttribute('data-form-alert', '');
        div.setAttribute('role', type === 'success' ? 'status' : 'alert');
        div.className = `mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${styles}`;
        div.textContent = message;
        form.prepend(div);
        div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /** Verrouille le bouton pendant l'envoi. */
    function setBusy(form, busy) {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        if (busy) {
            btn.dataset.label = btn.textContent.trim();
            btn.disabled = true;
            btn.classList.add('cursor-not-allowed', 'opacity-70');
            btn.textContent = 'Veuillez patienter...';
        } else {
            btn.disabled = false;
            btn.classList.remove('cursor-not-allowed', 'opacity-70');
            if (btn.dataset.label) btn.textContent = btn.dataset.label;
        }
    }

    // -------------------------------------------------------------------------
    // Envoi
    // -------------------------------------------------------------------------

    async function submitForm(form, event) {
        event.preventDefault();
        clearErrors(form);

        const endpoint = form.dataset.endpoint;
        const method = (form.dataset.method || 'POST').toUpperCase();
        if (!endpoint) return;

        const payload = Object.fromEntries(new FormData(form).entries());

        setBusy(form, true);
        let result;
        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                // Indispensable pour que le cookie de session circule.
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });
            result = await response.json();
        } catch (err) {
            setBusy(form, false);
            showAlert(form, 'Impossible de contacter le serveur. Verifiez votre connexion et reessayez.', 'error');
            return;
        }
        setBusy(form, false);

        if (!result.success) {
            let anchored = false;
            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    if (showFieldError(form, field, message)) anchored = true;
                });
            }
            // Aucun champ correspondant : on affiche le message global, sinon
            // l'utilisateur ne verrait rien.
            if (!anchored) showAlert(form, result.message || 'Une erreur est survenue.', 'error');
            return;
        }

        if (result.message) {
            showAlert(form, result.message, 'success');
            toast(result.message);
        }

        const redirect = (result.data && result.data.redirect) || form.dataset.redirect;
        if (redirect) {
            // `next` permet de revenir sur la page initialement demandee.
            const next = new URLSearchParams(window.location.search).get('next');
            const target = next && next.startsWith('/') ? next : redirect;
            window.setTimeout(() => {
                window.location.href = target;
            }, 600);
            return;
        }

        if (form.dataset.resetOnSuccess !== 'false') form.reset();
    }

    // -------------------------------------------------------------------------
    // Initialisation
    // -------------------------------------------------------------------------

    function init() {
        document.querySelectorAll('form[data-endpoint]').forEach((form) => {
            form.addEventListener('submit', (e) => submitForm(form, e));
        });

        document.querySelectorAll('[data-logout]').forEach((el) => {
            el.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const r = await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    });
                    const data = await r.json();
                    window.location.href = (data.data && data.data.redirect) || '/login.html';
                } catch (err) {
                    window.location.href = '/login.html';
                }
            });
        });

        refreshAuthState();
        hydrateProfileForm();
        initFileModal();
        initFavoriteToggles();
        initAccordions();
        initDocumentToggles();
        initDownloadRequests();
        initAdminModals();
    }

    // -------------------------------------------------------------------------
    // Modales d'administration (creation / edition)
    // -------------------------------------------------------------------------

    /** Element ayant declenche l'ouverture, pour lui rendre le focus. */
    let adminOpener = null;

    function openAdminModal(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('overflow-hidden');

        const first = modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (first) first.focus();
    }

    function closeAdminModal(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
        if (adminOpener && typeof adminOpener.focus === 'function') adminOpener.focus();
        adminOpener = null;
    }

    /**
     * Pre-remplit le formulaire a partir de l'attribut `data-fields` du
     * declencheur (JSON nom -> valeur). Un formulaire vide sert a la creation,
     * un formulaire rempli a l'edition : une seule modale couvre les deux cas.
     */
    function fillForm(form, fields) {
        form.reset();
        // Les champs fichier ne sont jamais pre-remplis (impossible et inutile) :
        // le modele conserve le document existant si aucun nouveau n'est envoye.
        form.querySelectorAll('[name]').forEach((el) => {
            if (el.type === 'file') return;
            const value = fields[el.name];
            el.value = value === undefined || value === null ? '' : value;
        });
    }

    function initAdminModals() {
        document.querySelectorAll('[data-modal-open]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById(btn.dataset.modalOpen);
                if (!modal) return;

                adminOpener = btn;

                const form = modal.querySelector('form');
                if (form) {
                    let fields = {};
                    try {
                        fields = btn.dataset.fields ? JSON.parse(btn.dataset.fields) : {};
                    } catch (err) {
                        fields = {};
                    }
                    fillForm(form, fields);
                }

                const heading = modal.querySelector('[data-modal-title]');
                if (heading && btn.dataset.modalTitle) heading.textContent = btn.dataset.modalTitle;

                openAdminModal(modal);
            });
        });

        document.querySelectorAll('[data-admin-modal]').forEach((modal) => {
            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-modal-dismiss]')) closeAdminModal(modal);
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeAdminModal(modal);
            });
        });
    }

    // -------------------------------------------------------------------------
    // Demandes de telechargement
    // -------------------------------------------------------------------------

    /**
     * Remplace le bouton par l'etat « en attente ».
     *
     * Le lien de telechargement n'est jamais construit ici : seule une
     * nouvelle visite, apres approbation par un administrateur, le fait
     * apparaitre. Le client ne doit pas pouvoir s'auto-attribuer l'URL.
     */
    function markPending(slot) {
        slot.className =
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ' +
            'cursor-not-allowed border border-amber-200 bg-amber-50 text-amber-700 ' +
            'dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400';
        slot.setAttribute('aria-disabled', 'true');
        slot.textContent = "En attente d'approbation";
    }

    async function requestDownload(btn) {
        const payload = {
            item_type: btn.dataset.itemType,
            item_id: btn.dataset.itemId,
        };

        btn.disabled = true;
        let result;
        try {
            const response = await fetch('/api/downloads/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
                return;
            }
            result = await response.json();
        } catch (err) {
            toast('Impossible de contacter le serveur.');
            btn.disabled = false;
            return;
        }

        if (!result.success) {
            toast(result.message || 'Une erreur est survenue.');
            btn.disabled = false;
            return;
        }

        toast(result.message);

        const slot = btn.closest('[data-download-slot]');
        if (result.data.status === 'pending' && slot) {
            markPending(slot);
        } else if (result.data.status === 'approved') {
            // Deja approuve entre-temps : on recharge pour reveler le lien.
            window.location.reload();
        } else {
            btn.disabled = false;
        }
    }

    function initDownloadRequests() {
        document.querySelectorAll('[data-download-request]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                requestDownload(btn);
            });
        });
    }

    // -------------------------------------------------------------------------
    // Accordeons (arborescence des cours)
    // -------------------------------------------------------------------------

    /**
     * Ouvre/ferme un panneau d'accordeon.
     *
     * L'etat passe par l'attribut `data-open`, pas par une classe Tailwind
     * arbitraire : le CDN « Play » genere ces classes en observant le DOM, si
     * bien qu'une regle utilisee pour la premiere fois n'existe pas encore au
     * moment du basculement et que le rendu accuse un clic de retard.
     * La transition est definie dans assets/ui.css.
     */
    function setPanel(panel, open) {
        panel.dataset.open = open ? 'true' : 'false';
        // `inert` empeche le focus clavier d'atteindre un panneau replie.
        if (open) panel.removeAttribute('inert');
        else panel.setAttribute('inert', '');
    }

    function initAccordions() {
        document.querySelectorAll('[data-accordion-toggle]').forEach((btn) => {
            const panel = document.getElementById(btn.getAttribute('aria-controls'));
            if (!panel) return;

            setPanel(panel, btn.getAttribute('aria-expanded') === 'true');

            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') !== 'true';
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                setPanel(panel, open);

                const chevron = btn.querySelector('[data-accordion-chevron]');
                if (chevron) chevron.classList.toggle('rotate-180', open);
            });
        });
    }

    // -------------------------------------------------------------------------
    // Affichage differe des documents (PDF / image)
    // -------------------------------------------------------------------------

    /**
     * Les visionneuses ne sont pas rendues au chargement : leur `<iframe>` est
     * construit au premier clic. Un PDF integre par page couterait une requete
     * reseau et un rendu inutiles a chaque visite.
     */
    function buildViewer(url, title) {
        if (IMAGE_RE.test(url)) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = title || 'Document';
            img.className = 'mx-auto max-h-[70vh] w-auto max-w-full rounded-xl bg-white object-contain';
            return img;
        }
        const frame = document.createElement('iframe');
        frame.src = url;
        frame.title = title || 'Document';
        frame.className = 'h-[70vh] w-full rounded-xl border-0 bg-white';
        return frame;
    }

    function initDocumentToggles() {
        document.querySelectorAll('[data-doc-toggle]').forEach((btn) => {
            const panel = document.getElementById(btn.getAttribute('aria-controls'));
            if (!panel) return;

            btn.addEventListener('click', () => {
                const open = btn.getAttribute('aria-expanded') !== 'true';
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');

                if (open && !panel.dataset.loaded) {
                    panel.textContent = '';
                    panel.appendChild(buildViewer(btn.dataset.docUrl || '', btn.dataset.docTitle || ''));
                    panel.dataset.loaded = 'true';
                }

                panel.hidden = !open;

                // Libelles personnalisables : sur la fiche d'un exercice, il
                // faut distinguer l'enonce de la correction plutot que de
                // retomber sur un « document » generique.
                const label = btn.querySelector('[data-doc-label]');
                if (label) {
                    const show = btn.dataset.labelShow || 'Voir le document';
                    const hide = btn.dataset.labelHide || 'Masquer le document';
                    label.textContent = open ? hide : show;
                }

                const chevron = btn.querySelector('[data-accordion-chevron]');
                if (chevron) chevron.classList.toggle('rotate-180', open);
            });
        });
    }

    // -------------------------------------------------------------------------
    // Modale d'apercu de fichier (PDF / image)
    // -------------------------------------------------------------------------

    const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
    const PDF_RE = /\.pdf(\?|#|$)/i;

    /** Element ayant le focus avant l'ouverture, pour le restaurer a la fermeture. */
    let modalOpener = null;

    /** Selecteur des elements focusables, pour confiner le focus dans la modale. */
    const FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    /** Construit le corps de la modale selon le type de fichier. */
    function buildPreview(url, title) {
        if (IMAGE_RE.test(url)) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = title || 'Aperçu du document';
            img.className = 'mx-auto max-h-[70vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-soft';
            return img;
        }

        if (PDF_RE.test(url)) {
            const frame = document.createElement('iframe');
            frame.src = url;
            frame.title = title || 'Aperçu du document PDF';
            frame.className = 'h-[75vh] min-h-[550px] w-full rounded-2xl border-0 bg-white shadow-soft';
            return frame;
        }

        // Format non previsualisable : on invite au telechargement.
        const div = document.createElement('div');
        div.className = 'p-10 text-center text-sm text-slate-500 dark:text-slate-400';
        div.textContent =
            "Ce format ne peut pas être prévisualisé dans le navigateur. Utilisez le bouton de téléchargement ci-dessous.";
        return div;
    }

    /**
     * Ouvre la modale sur un fichier.
     * Exposee en global : les vues EJS peuvent l'appeler directement.
     */
    function openFileModal(url, options) {
        const modal = document.getElementById('file-modal');
        if (!modal) return;

        const opts = options || {};
        const body = modal.querySelector('#file-modal-body');
        const download = modal.querySelector('#file-modal-download');
        const titleEl = modal.querySelector('#file-modal-title');
        const labelEl = modal.querySelector('#file-modal-label');

        modalOpener = document.activeElement;

        titleEl.textContent = opts.title || 'Document';
        labelEl.textContent = opts.label || '';

        body.textContent = '';
        if (url) {
            body.appendChild(buildPreview(url, opts.title));
            download.href = url;
            download.classList.remove('hidden');
        } else {
            const empty = document.createElement('div');
            empty.className = 'p-10 text-center text-sm text-slate-500 dark:text-slate-400';
            empty.textContent = opts.emptyMessage || "Aucun fichier n'a encore été téléversé pour cette ressource.";
            body.appendChild(empty);
            download.href = '#';
            // Sans fichier, un bouton de telechargement n'aurait aucun sens.
            download.classList.add('hidden');
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('overflow-hidden');

        const closeBtn = modal.querySelector('button[data-modal-close]');
        if (closeBtn) closeBtn.focus();
    }

    /** Ferme la modale et rend le focus a l'element declencheur. */
    function closeFileModal() {
        const modal = document.getElementById('file-modal');
        if (!modal || modal.classList.contains('hidden')) return;

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');

        // Vide l'apercu : evite qu'un PDF continue de tourner en arriere-plan.
        const body = modal.querySelector('#file-modal-body');
        if (body) body.textContent = '';

        if (modalOpener && typeof modalOpener.focus === 'function') modalOpener.focus();
        modalOpener = null;
    }

    /** Confine la tabulation a l'interieur de la modale ouverte. */
    function trapFocus(modal, event) {
        const items = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(
            (el) => !el.classList.contains('hidden') && el.offsetParent !== null
        );
        if (items.length === 0) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function initFileModal() {
        const modal = document.getElementById('file-modal');
        if (!modal) return;

        // Fermeture : bouton « X », bouton « Fermer », et clic sur le voile.
        modal.addEventListener('click', (e) => {
            if (e.target.closest('[data-modal-close]')) closeFileModal();
        });

        document.addEventListener('keydown', (e) => {
            if (modal.classList.contains('hidden')) return;
            if (e.key === 'Escape') closeFileModal();
            else if (e.key === 'Tab') trapFocus(modal, e);
        });

        // Ouverture declarative depuis n'importe quel bouton du site.
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-file-modal]');
            if (!trigger) return;
            e.preventDefault();
            openFileModal(trigger.dataset.fileUrl || '', {
                title: trigger.dataset.fileTitle || '',
                label: trigger.dataset.fileLabel || '',
                emptyMessage: trigger.dataset.fileEmpty || '',
            });
        });
    }

    // -------------------------------------------------------------------------
    // Favoris (cours et exercices) - bascule via l'API
    // -------------------------------------------------------------------------

    const FAV_ON = ['border-rose-300', 'bg-rose-50', 'text-rose-600'];
    const FAV_OFF = ['border-slate-200', 'text-slate-700'];

    /** Reflete l'etat du favori sur le bouton. */
    function paintFavorite(btn, favorited) {
        btn.dataset.favorited = favorited ? 'true' : 'false';
        btn.setAttribute('aria-pressed', favorited ? 'true' : 'false');

        btn.classList.remove(...(favorited ? FAV_OFF : FAV_ON));
        btn.classList.add(...(favorited ? FAV_ON : FAV_OFF));

        const label = btn.querySelector('[data-fav-label]');
        if (label) label.textContent = favorited ? 'Retirer des favoris' : 'Ajouter aux favoris';
    }

    async function toggleFavorite(btn) {
        const payload = {
            item_type: btn.dataset.itemType,
            item_id: btn.dataset.itemId,
        };

        btn.disabled = true;
        let result;
        try {
            const response = await fetch('/api/favorites/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });

            // Session absente ou expiree : on renvoie vers la connexion en
            // conservant la page courante comme destination de retour.
            if (response.status === 401) {
                window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
                return;
            }
            result = await response.json();
        } catch (err) {
            toast('Impossible de contacter le serveur.');
            return;
        } finally {
            btn.disabled = false;
        }

        if (!result.success) {
            toast(result.message || 'Une erreur est survenue.');
            return;
        }

        paintFavorite(btn, result.data.favorited);
        toast(result.message);

        // Sur la page des favoris, une suppression doit faire disparaitre la carte.
        if (!result.data.favorited && btn.closest('[data-favorite-card]')) {
            const card = btn.closest('[data-favorite-card]');
            card.remove();
            refreshFavoritesCount();
        }
    }

    /** Met a jour le compteur et l'etat vide de la page des favoris. */
    function refreshFavoritesCount() {
        const remaining = document.querySelectorAll('[data-favorite-card]').length;

        document.querySelectorAll('[data-favorites-count]').forEach((el) => {
            el.textContent = remaining;
        });

        // Masque une section devenue vide, puis affiche l'etat vide global.
        document.querySelectorAll('[data-favorites-group]').forEach((group) => {
            if (group.querySelectorAll('[data-favorite-card]').length === 0) group.hidden = true;
        });

        const empty = document.querySelector('[data-favorites-empty]');
        if (empty && remaining === 0) empty.hidden = false;
    }

    function initFavoriteToggles() {
        document.querySelectorAll('[data-fav-toggle]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleFavorite(btn);
            });
        });
    }

    // Accessible aux vues EJS qui souhaitent ouvrir la modale par programme.
    window.openFileModal = openFileModal;
    window.closeFileModal = closeFileModal;

    /**
     * Remplit le formulaire de profil avec les donnees du compte connecte.
     * Sans cela, la page afficherait les valeurs d'exemple laissees dans la
     * maquette HTML, qui ne correspondent a aucun utilisateur reel.
     */
    async function hydrateProfileForm() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        let user = null;
        try {
            const r = await fetch('/api/auth/me', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const data = await r.json();
            if (data.success && data.data.authenticated) user = data.data.user;
        } catch (err) {
            return;
        }
        if (!user) return;

        ['nom', 'prenom', 'email', 'niveau'].forEach((field) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) input.value = user[field] ?? '';
        });

        // Initiales de l'avatar de l'en-tete de page.
        const avatar = document.querySelector('[data-user-initials]');
        if (avatar) {
            avatar.textContent = `${(user.prenom || '')[0] || ''}${(user.nom || '')[0] || ''}`.toUpperCase();
        }
        document.querySelectorAll('[data-user-fullname]').forEach((el) => {
            el.textContent = `${user.prenom} ${user.nom}`.trim();
        });
    }

    /**
     * Adapte l'en-tete a l'etat de connexion : remplace « Connexion / Creer un
     * compte » par « Mon profil / Deconnexion » quand une session est active.
     */
    async function refreshAuthState() {
        const slots = document.querySelectorAll('[data-auth-slot]');
        if (slots.length === 0) return;

        let user = null;
        try {
            const r = await fetch('/api/auth/me', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const data = await r.json();
            if (data.success && data.data.authenticated) user = data.data.user;
        } catch (err) {
            return; // hors ligne ou API indisponible : on laisse l'en-tete tel quel
        }
        if (!user) return;

        slots.forEach((slot) => {
            const mode = slot.dataset.authSlot;
            if (mode === 'anonymous') {
                slot.hidden = true;
            } else if (mode === 'authenticated') {
                slot.hidden = false;
                const nameEl = slot.querySelector('[data-user-name]');
                if (nameEl) nameEl.textContent = `${user.prenom} ${user.nom}`.trim();
            }
        });
    }

    if (document.readyState !== 'loading') init();
    else document.addEventListener('DOMContentLoaded', init);
})();
