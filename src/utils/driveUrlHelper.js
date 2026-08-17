/**
 * Smart URL Resolver for PhyChemia Assets (Google Drive, Cloudflare R2, Local Files, External URLs)
 */

const { parseDriveId, getPreviewUrl, getDownloadUrl } = require('../services/googleDriveService');

/**
 * Resolves a stored database asset path into clean web viewer & download links.
 * 
 * @param {string} rawUrl 
 * @returns {{
 *   raw: string,
 *   isDrive: boolean,
 *   isExternal: boolean,
 *   iframeUrl: string,
 *   downloadUrl: string
 * }}
 */
function resolveAssetUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return {
            raw: '',
            isDrive: false,
            isExternal: false,
            iframeUrl: '',
            downloadUrl: ''
        };
    }

    const trimmed = rawUrl.trim();
    const driveId = parseDriveId(trimmed);

    if (driveId || trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
        const id = driveId || parseDriveId(trimmed);
        const proxyPath = id ? `/api/pdf-proxy?id=${id}` : getPreviewUrl(trimmed);
        return {
            raw: trimmed,
            isDrive: true,
            isExternal: true,
            iframeUrl: proxyPath,
            downloadUrl: getDownloadUrl(trimmed)
        };
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return {
            raw: trimmed,
            isDrive: false,
            isExternal: true,
            iframeUrl: trimmed,
            downloadUrl: trimmed
        };
    }

    // Local file path (e.g. /assets/downloads/...)
    const cleanLocal = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return {
        raw: cleanLocal,
        isDrive: false,
        isExternal: false,
        iframeUrl: cleanLocal,
        downloadUrl: cleanLocal
    };
}

module.exports = {
    resolveAssetUrl
};
