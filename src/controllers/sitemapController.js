/**
 * Controller pour la génération dynamique de sitemap.xml
 * Conforme aux standards sitemaps.org pour l'indexation Search Console.
 */
const Chapter = require('../models/Chapter');
const Exercise = require('../models/Exercise');
const Concours = require('../models/Concours');
const Book = require('../models/Book');

function formatDate(date) {
    if (!date) return new Date().toISOString().split('T')[0];
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
}

function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const sitemapController = {
    async getSitemap(req, res, next) {
        try {
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
            const host = req.get('host') || 'phychemia.com';
            const baseUrl = (process.env.SITE_URL || `${protocol}://${host}`).replace(/\/+$/, '');

            const [chapters, exercises, concoursList, booksList] = await Promise.all([
                Chapter.findAll().catch(() => []),
                Exercise.findAll().catch(() => []),
                Concours.findAll().catch(() => []),
                Book.findAll().catch(() => []),
            ]);

            const staticPages = [
                { url: '/', priority: '1.0', changefreq: 'daily' },
                { url: '/cours', priority: '0.9', changefreq: 'daily' },
                { url: '/cours/physique', priority: '0.9', changefreq: 'daily' },
                { url: '/cours/chimie', priority: '0.9', changefreq: 'daily' },
                { url: '/chapitres', priority: '0.9', changefreq: 'daily' },
                { url: '/exercices', priority: '0.9', changefreq: 'daily' },
                { url: '/exercices-physique', priority: '0.9', changefreq: 'daily' },
                { url: '/exercices-chimie', priority: '0.9', changefreq: 'daily' },
                { url: '/concours', priority: '0.9', changefreq: 'daily' },
                { url: '/concours/physique', priority: '0.8', changefreq: 'daily' },
                { url: '/concours/chimie', priority: '0.8', changefreq: 'daily' },
                { url: '/livres', priority: '0.9', changefreq: 'daily' },
                { url: '/livres/physique', priority: '0.8', changefreq: 'daily' },
                { url: '/livres/chimie', priority: '0.8', changefreq: 'daily' },
                { url: '/recherche', priority: '0.7', changefreq: 'weekly' },
                { url: '/apropos', priority: '0.6', changefreq: 'monthly' },
                { url: '/contact', priority: '0.5', changefreq: 'monthly' },
                { url: '/faq', priority: '0.6', changefreq: 'weekly' },
                { url: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
                { url: '/politique-confidentialite', priority: '0.3', changefreq: 'yearly' },
            ];

            const urlEntries = [];
            const seenUrls = new Set();

            function addUrl(path, priority = '0.5', changefreq = 'weekly', lastmod = null) {
                const normalizedPath = path.startsWith('/') ? path : '/' + path;
                const loc = `${baseUrl}${normalizedPath}`;
                if (seenUrls.has(loc)) return;
                seenUrls.add(loc);
                urlEntries.push({
                    loc,
                    lastmod: formatDate(lastmod),
                    changefreq,
                    priority,
                });
            }

            // 1. Pages statiques et sections principales
            for (const page of staticPages) {
                addUrl(page.url, page.priority, page.changefreq);
            }

            // 2. Chapitres & Cours dynamiques (/chapitres/:id et /cours/:id)
            for (const chapter of chapters) {
                if (chapter && chapter.id) {
                    addUrl(`/chapitres/${chapter.id}`, '0.8', 'weekly', chapter.created_at);
                    addUrl(`/cours/${chapter.id}`, '0.8', 'weekly', chapter.created_at);
                }
            }

            // 3. Exercices dynamiques (/exercices/:id)
            for (const exercise of exercises) {
                if (exercise && exercise.id) {
                    addUrl(`/exercices/${exercise.id}`, '0.8', 'weekly', exercise.created_at);
                }
            }

            // 4. Concours & Annales dynamiques (/concours/:id)
            for (const concours of concoursList) {
                if (concours && concours.id) {
                    addUrl(`/concours/${concours.id}`, '0.8', 'weekly', concours.created_at);
                }
            }

            // 5. Livres & Manuels dynamiques (/livres/:id)
            for (const book of booksList) {
                if (book && book.id) {
                    addUrl(`/livres/${book.id}`, '0.8', 'weekly', book.created_at);
                }
            }

            // Construction du document XML
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

            for (const entry of urlEntries) {
                xml += '  <url>\n';
                xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
                xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`;
                xml += `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`;
                xml += `    <priority>${escapeXml(entry.priority)}</priority>\n`;
                xml += '  </url>\n';
            }

            xml += '</urlset>';

            res.header('Content-Type', 'application/xml; charset=utf-8');
            res.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
            res.send(xml);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = sitemapController;
