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

        // --- Moteur de Recherche Intelligente pour Tableaux Admin ---
        document.querySelectorAll('input[data-table-search]').forEach(function (searchInput) {
            var card = searchInput.closest('.overflow-hidden, .rounded-3xl, main') || document;
            var table = card.querySelector('table');
            if (!table) return;

            var rows = table.querySelectorAll('tbody tr:not([data-no-results])');
            var countBadge = searchInput.parentElement.querySelector('[data-search-count]');

            var tbody = table.querySelector('tbody');
            var noResultsRow = document.createElement('tr');
            noResultsRow.setAttribute('data-no-results', 'true');
            noResultsRow.className = 'hidden';
            var colCount = table.querySelectorAll('thead th').length || 4;
            noResultsRow.innerHTML = '<td colspan="' + colCount + '" class="px-6 py-12 text-center text-slate-400 text-sm"><div class="flex flex-col items-center justify-center gap-2"><svg class="h-8 w-8 text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg><span>Aucun résultat ne correspond à votre recherche.</span></div></td>';
            if (tbody) tbody.appendChild(noResultsRow);

            var filterRows = function () {
                var query = searchInput.value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                var visibleCount = 0;

                rows.forEach(function (row) {
                    if (row.hasAttribute('data-no-results')) return;
                    var text = row.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    var isMatch = !query || text.indexOf(query) !== -1;
                    row.style.display = isMatch ? '' : 'none';
                    if (isMatch) visibleCount++;
                });

                if (noResultsRow) {
                    noResultsRow.classList.toggle('hidden', visibleCount > 0 || !query);
                }

                if (countBadge) {
                    countBadge.textContent = query ? (visibleCount + ' / ' + rows.length) : '';
                }
            };

            searchInput.addEventListener('input', filterRows);
            searchInput.addEventListener('keyup', filterRows);
        });
    });
})();
