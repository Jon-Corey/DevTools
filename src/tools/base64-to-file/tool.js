import { downloadFile } from '/assets/js/utils.js';

const base64Container = document.getElementById('base64-container');
const base64Input = document.getElementById('base64');
const validationMessage = document.getElementById('validation-message');
const fileNameInput = document.getElementById('file-name');
const fileExtensionInput = document.getElementById('file-extension');
const fileItem = document.getElementById('file-item');

initialize();

function initialize() {
    // Add event listeners
    base64Input.addEventListener('input', () => handleChange(true));
    fileNameInput.addEventListener('input', () => handleChange());
    fileExtensionInput.addEventListener('input', () => handleChange());
    fileItem.addEventListener('button-clicked', () => downloadFile(fileItem.file));
}

function hideFile() {
    fileItem.style.display = 'none';
    fileItem.file = null;
}

function handleChange(updateFileExtension = false) {
    const text = base64Input.value.replace(/\s+/g, '');

    if (text === '') {
        base64Container.classList.remove('invalid');
        validationMessage.textContent = '';
        hideFile();
        return;
    }

    const parts = getBase64Parts(text);

    if (!parts) {
        base64Container.classList.add('invalid');
        validationMessage.textContent = 'Input is not valid Base64.';
        hideFile();
        return;
    }

    base64Container.classList.remove('invalid');
    validationMessage.textContent = '';

    if (updateFileExtension && fileExtensionInput.value.trim() === '' && parts.mimeType) {
        fileExtensionInput.value = getExtensionForMimeType(parts.mimeType);
    }

    const fileExtension = sanitizeFileExtension(fileExtensionInput.value);
    if (fileExtension === '') {
        hideFile();
        return;
    }

    const fileName = sanitizeFileName(fileNameInput.value.trim());
    const file = new File([Uint8Array.from(atob(parts.base64), c => c.charCodeAt(0))], `${fileName}.${fileExtension}`, { type: parts.mimeType || getMimeType(fileExtension) });
    fileItem.file = file;
    fileItem.style.display = 'block';
}

function getBase64Parts(text) {
    const prefixRegex = /^data:([A-Za-z0-9!#$&^_.+\-]+\/[A-Za-z0-9!#$&^_.+\-]+)?(?:;[A-Za-z0-9!#$&^_.+\-]+=[^;,]*)*;base64,/i;
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;

    const prefixMatch = text.match(prefixRegex);
    const mimeType = prefixMatch ? (prefixMatch[1] || '').toLowerCase() || null : null;
    const base64 = prefixMatch ? text.slice(prefixMatch[0].length) : text;

    if (base64Regex.test(base64) && base64.length % 4 === 0) {
        return { mimeType, base64 };
    }

    return null;
}

function getExtensionForMimeType(mimeType) {
    const extensions = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/pjpeg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/avif': 'avif',
        'image/tiff': 'tiff',
        'image/heic': 'heic',
        'image/heif': 'heif',
        'application/pdf': 'pdf',
        'application/json': 'json',
        'application/xml': 'xml',
        'text/xml': 'xml',
        'application/zip': 'zip',
        'application/x-zip-compressed': 'zip',
        'application/gzip': 'gz',
        'application/x-gzip': 'gz',
        'application/x-tar': 'tar',
        'application/x-7z-compressed': '7z',
        'application/vnd.rar': 'rar',
        'application/x-rar-compressed': 'rar',
        'application/rtf': 'rtf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/wasm': 'wasm',
        'application/javascript': 'js',
        'text/javascript': 'js',
        'text/plain': 'txt',
        'text/html': 'html',
        'text/css': 'css',
        'text/csv': 'csv',
        'text/markdown': 'md',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/webm': 'weba',
        'audio/mp4': 'm4a',
        'audio/aac': 'aac',
        'audio/flac': 'flac',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogv',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi',
        'font/ttf': 'ttf',
        'font/otf': 'otf',
        'font/woff': 'woff',
        'font/woff2': 'woff2'
    };

    // Unknown types (including application/octet-stream) are left blank for the user to fill in
    return extensions[mimeType.toLowerCase()] || '';
}

function getMimeType(fileExtension) {
    // Aims to get the mime type for previewable file types in order to correctly render a preview in the UI
    const mimeTypes = {
        'png': 'image/png',
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp'
    };
    return mimeTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
}

function sanitizeFileName(fileName) {
    let result = fileName
        .replace(/[^A-Za-z0-9 _\.\-\(\)]/g, '_')
        .replace(/[. ]+$/g, '');

    if (result === '') {
        result = 'file';
    }

    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(result)) {
        result = '_' + result;
    }

    return result;
}

function sanitizeFileExtension(fileExtension) {
    return fileExtension.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}
