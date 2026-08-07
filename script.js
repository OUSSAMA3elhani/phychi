/**
 * PhyChi - Script JavaScript Principal (v2.0 - Corrigé)
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initFavoritesManager();
    initDynamicFilters();
    initFormValidation();
    initLiveSearch();
    initSmoothScroll();
});

/**
 * 1. GESTION DU THÈME (CLAIR / SOMBRE)
 */
function initThemeToggle() {
    const userMenu = document.querySelector('.user-menu ul');
    if (!userMenu) return;

    if (document.getElementById('theme-toggle-btn')) return;

    const themeLi = document.createElement('li');
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.id = 'theme-toggle-btn';
    themeBtn.style.cssText = 'background:none; border:none; cursor:pointer; font-size:0.825rem; font-weight:600; color:var(--color-text-light); padding:0;';

    const savedTheme = localStorage.getItem('psychi_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark-theme');
        themeBtn.textContent = '☀️ Mode Clair';
    } else {
        document.documentElement.classList.remove('dark-theme');
        themeBtn.textContent = '🌙 Mode Sombre';
    }

    themeLi.appendChild(themeBtn);
    userMenu.appendChild(themeLi);

    themeBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark-theme');
        if (isDark) {
            localStorage.setItem('psychi_theme', 'dark');
            themeBtn.textContent = '☀️ Mode Clair';
        } else {
            localStorage.setItem('psychi_theme', 'light');
            themeBtn.textContent = '🌙 Mode Sombre';
        }
    });
}

/**
 * 2. GESTION DES FAVORIS (COMPATIBLE <button> ET <a href="favoris.html">)
 */
function initFavoritesManager() {
    let favorites = JSON.parse(localStorage.getItem('psychi_favorites')) || [];

    // Sélectionne aussi bien les liens <a> que les <button> liés aux favoris
    const favElements = document.querySelectorAll('.card-actions button, .card-actions a[href*="favoris"]');

    favElements.forEach((el) => {
        const card = el.closest('article, .favorite-card, .exercise-card, .course-card, .solution-card');
        if (!card) return;

        const cardTitleEl = card.querySelector('h3, h4');
        if (!cardTitleEl) return;

        const itemTitle = cardTitleEl.textContent.trim();
        const isAlreadyFav = favorites.some(fav => fav.title === itemTitle);

        // Mise à jour de l'état visuel initial
        if (isAlreadyFav) {
            el.textContent = 'Retirer des favoris';
            if (el.tagName.toLowerCase() === 'a') {
                el.style.backgroundColor = 'var(--accent-rose)';
                el.style.color = '#ffffff';
            } else {
                el.style.borderColor = 'var(--accent-rose)';
            }
        }

        // Interception du clic (bloque la redirection des liens <a>)
        el.addEventListener('click', (e) => {
            e.preventDefault();
            let updatedFavs = JSON.parse(localStorage.getItem('psychi_favorites')) || [];
            const existsIndex = updatedFavs.findIndex(fav => fav.title === itemTitle);

            if (existsIndex > -1) {
                // Retirer des favoris
                updatedFavs.splice(existsIndex, 1);
                el.textContent = 'Ajouter aux favoris';
                if (el.tagName.toLowerCase() === 'a') {
                    el.style.backgroundColor = 'var(--primary-light)';
                    el.style.color = 'var(--primary)';
                } else {
                    el.style.borderColor = '';
                }
                showToast('Élément retiré de vos favoris');

                // Sur favoris.html, masquer la carte immédiatement
                if (window.location.pathname.includes('favoris.html') && el.tagName.toLowerCase() === 'button') {
                    card.style.display = 'none';
                }
            } else {
                // Ajouter aux favoris
                updatedFavs.push({
                    title: itemTitle,
                    url: window.location.href,
                    date: new Date().toLocaleDateString('fr-FR')
                });
                el.textContent = 'Retirer des favoris';
                if (el.tagName.toLowerCase() === 'a') {
                    el.style.backgroundColor = 'var(--accent-rose)';
                    el.style.color = '#ffffff';
                } else {
                    el.style.borderColor = 'var(--accent-rose)';
                }
                showToast('Élément ajouté à vos favoris !');
            }

            localStorage.setItem('psychi_favorites', JSON.stringify(updatedFavs));
        });
    });
}

/**
 * 3. FILTRAGE EN TEMPS RÉEL
 */
function initDynamicFilters() {
    const filterForm = document.querySelector('.filter-section form');
    if (!filterForm) return;

    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const domaineVal = filterForm.querySelector('#domaine, #matiere, #categorie')?.value || 'tous';
        const niveauVal = filterForm.querySelector('#niveau')?.value || 'tous';
        const difficulteVal = filterForm.querySelector('#difficulte')?.value || 'toutes';

        const cards = document.querySelectorAll('.exercise-card, .course-card, .solution-card, .favorite-card');
        let countVisible = 0;

        cards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            let matchesDomaine = (domaineVal === 'tous' || domaineVal === 'toutes') || cardText.includes(domaineVal.toLowerCase());
            let matchesNiveau = (niveauVal === 'tous') || cardText.includes(niveauVal.toLowerCase());
            let matchesDiff = (difficulteVal === 'toutes') || cardText.includes(difficulteVal.toLowerCase());

            if (matchesDomaine && matchesNiveau && matchesDiff) {
                card.style.display = 'flex';
                countVisible++;
            } else {
                card.style.display = 'none';
            }
        });

        showToast(`${countVisible} résultat(s) trouvé(s).`);
    });
}

/**
 * 4. VALIDATION ET SÉCURISATION DES FORMULAIRES
 */
function initFormValidation() {
    const registerForm = document.querySelector('form[action*="login.html"]');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            const pwd = registerForm.querySelector('#password');
            const pwdConfirm = registerForm.querySelector('#password_confirm');

            if (pwd && pwdConfirm && pwd.value !== pwdConfirm.value) {
                e.preventDefault();
                alert('Attention : Les deux mots de passe ne sont pas identiques.');
                pwdConfirm.focus();
            }
        });
    }

    const contactForm = document.querySelector('form[action*="contact.html"]');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Votre message a bien été envoyé !');
            contactForm.reset();
        });
    }
}

/**
 * 5. RECHERCHE EN DIRECT
 */
function initLiveSearch() {
    const searchInput = document.querySelector('.search-form-section input[type="search"]');
    const resultCards = document.querySelectorAll('.result-card');

    if (!searchInput || resultCards.length === 0) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        resultCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? 'flex' : 'none';
        });
    });
}

/**
 * 6. DÉPLACEMENT DOUX
 */
function initSmoothScroll() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * NOTIFICATION TOAST TEMPORAIRE
 */
function showToast(message) {
    let toast = document.getElementById('psychi-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'psychi-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: var(--primary);
            color: #ffffff;
            padding: 0.85rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            font-weight: 600;
            font-size: 0.9rem;
            z-index: 2000;
            transition: opacity 0.3s ease, transform 0.3s ease;
            opacity: 0;
            transform: translateY(20px);
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}