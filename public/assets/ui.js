/**
 * PhyChi - Comportements d'interface partagés
 * Bascule de thème, menu mobile et ombre d'en-tête au défilement.
 * Complémentaire à script.js (favoris, filtres, recherche, toasts).
 */
(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ready(function () {
        // --- Bascule du thème (clé partagée avec script.js) ---
        function syncThemeMeta(isDark) {
            var metaTags = document.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-navbutton-color"]');
            var color = isDark ? '#0f172a' : '#ffffff';
            metaTags.forEach(function (m) { m.setAttribute('content', color); });
        }

        var themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var isDark = document.documentElement.classList.toggle('dark-theme');
                syncThemeMeta(isDark);
                try {
                    localStorage.setItem('psychi_theme', isDark ? 'dark' : 'light');
                } catch (e) { /* stockage indisponible */ }
            });
        }
        syncThemeMeta(document.documentElement.classList.contains('dark-theme'));

        // --- Menu mobile ---
        var menuBtn = document.getElementById('mobile-menu-btn');
        var menu = document.getElementById('mobile-menu');
        var iconMenu = document.getElementById('icon-menu');
        var iconClose = document.getElementById('icon-close');

        if (menuBtn && menu && iconMenu && iconClose) {
            menuBtn.addEventListener('click', function () {
                var isOpen = menu.classList.toggle('hidden') === false;
                menuBtn.setAttribute('aria-expanded', String(isOpen));
                iconMenu.classList.toggle('hidden', isOpen);
                iconClose.classList.toggle('hidden', !isOpen);
            });

            // Referme le menu au passage en affichage bureau
            var desktop = window.matchMedia('(min-width: 1280px)');
            var closeOnDesktop = function (e) {
                if (e.matches) {
                    menu.classList.add('hidden');
                    menuBtn.setAttribute('aria-expanded', 'false');
                    iconMenu.classList.remove('hidden');
                    iconClose.classList.add('hidden');
                }
            };
            if (desktop.addEventListener) {
                desktop.addEventListener('change', closeOnDesktop);
            } else if (desktop.addListener) {
                desktop.addListener(closeOnDesktop);
            }
        }

        // --- Ombre de l'en-tête au défilement ---
        var header = document.getElementById('site-header');
        if (header) {
            var onScroll = function () {
                header.classList.toggle('shadow-soft', window.scrollY > 8);
            };
            onScroll();
            window.addEventListener('scroll', onScroll, { passive: true });
        }
    });
})();
