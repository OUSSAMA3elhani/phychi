/**
 * Controller pour la generation dynamique de sitemap.xml
 * Conforme aux standards sitemaps.org pour l'indexation Search Console.
 */
const Chapter = require('../models/Chapter');
const Exercise = require('../models/Exercise');

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
            const baseUrl = process.env.SITE_URL || `${protocol}://${host}`;

            const [chapters, exercises] = await Promise.all([
                Chapter.findAll().catch(() => []),
                Exercise.findAll().catch(() => []),
            ]);

            const staticPages = [
                { url: '/', priority: '1.0', changefreq: 'daily' },
                { url: '/cours', priority: '0.9', changefreq: 'daily' },
                { url: '/chapitres', priority: '0.9', changefreq: 'daily' },
                { url: '/exercices-physique', priority: '0.9', changefreq: 'daily' },
                { url: '/exercices-chimie', priority: '0.9', changefreq: 'daily' },
                { url: '/recherche', priority: '0.7', changefreq: 'weekly' },
                { url: '/apropos', priority: '0.6', changefreq: 'monthly' },
                { url: '/contact', priority: '0.5', changefreq: 'monthly' },
                { url: '/faq', priority: '0.6', changefreq: 'weekly' },
                { url: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
                { url: '/politique-confidentialite', priority: '0.3', changefreq: 'yearly' },
            ];

            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

            // Pages statiques
            for (const page of staticPages) {
                xml += '  <url>\n';
                xml += `    <loc>${escapeXml(baseUrl + page.url)}</loc>\n`;
                xml += `    <lastmod>${formatDate()}</lastmod>\n`;
                xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
                xml += `    <priority>${page.priority}</priority>\n`;
                xml += '  </url>\n';
            }

            // Chapitres dynamiques (/chapitres/:id)
            for (const chapter of chapters) {
                xml += '  <url>\n';
                xml += `    <loc>${escapeXml(baseUrl + '/chapitres/' + chapter.id)}</loc>\n`;
                xml += `    <lastmod>${formatDate(chapter.created_at)}</lastmod>\n`;
                xml += '    <changefreq>weekly</changefreq>\n';
                xml += '    <priority>0.8</priority>\n';
                xml += '  </url>\n';
            }

            // Exercices dynamiques (/exercices/:id)
            for (const exercise of exercises) {
                xml += '  <url>\n';
                xml += `    <loc>${escapeXml(baseUrl + '/exercices/' + exercise.id)}</loc>\n`;
                xml += `    <lastmod>${formatDate(exercise.created_at)}</lastmod>\n`;
                xml += '    <changefreq>weekly</changefreq>\n';
                xml += '    <priority>0.8</priority>\n';
                xml += '  </url>\n';
            }

            xml += '</urlset>';

            res.header('Content-Type', 'application/xml; charset=utf-8');
            res.send(xml);
        } catch (err) {
            next(err);
        }
    },
};

module.exports = sitemapController;
