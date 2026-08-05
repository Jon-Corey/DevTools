import { Zip, ZipDeflate } from '/assets/js/vendor/fflate/fflate.js';

/**
 * List of image formats that can be shown natively by the browser. Used to determine whether to show a preview or just an icon for uploaded files.
 */
export const previewableImageFormats = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'svg', 'bmp'];

/**
 * Formats a number of bytes into a human-readable string.
 * @param {number} size The size in bytes to format.
 * @returns {string} The formatted file size string (e.g. "1.23 MB", "456 B").
 */
export function formatFileSize(size) {
    const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
    let decimals = 2;

    let unitIndex = 0;
    while (size >= 1024 && unitIndex < sizeUnits.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    if (unitIndex === 0) {
        // For bytes, show no decimal places
        decimals = 0;
    }

    return `${size.toFixed(decimals)} ${sizeUnits[unitIndex]}`;
}

/**
 * Downloads the provided file.
 * @param {File} file The file to download.
 */
export function downloadFile(file) {
    const url = URL.createObjectURL(file);

    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Downloads a file from the provided URL. Does not revoke the URL.
 * @param {string} url The Object URL to download from.
 * @param {string} fileName The name to give the downloaded file.
 */
export function downloadFileFromUrl(url, fileName) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
}

/**
 * Downloads multiple files as a ZIP archive.
 * @param {File[]} files The files to include in the ZIP archive.
 * @param {string} zipFileName The name of the resulting ZIP file.
 * @returns {Promise<void>}
 */
export async function downloadFilesAsZip(files, zipFileName = 'files.zip') {
    if (!files.length) {
        return;
    }

    // Don't attempt to compress already compressed formats
    const compressedFormats = [
        "jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif",
        "mp4", "m4v", "mov", "mkv", "webm", "avi",
        "mp3", "aac", "m4a", "ogg", "opus", "flac",
        "pdf", "docx", "xlsx", "pptx", "epub", "odt", "ods", "odp",
        "woff", "woff2",
        "zip", "rar", "7z", "gz", "tgz", "bz2", "xz", "lz", "lzma", "zst",
        "swf", "jar", "apk"
    ];

    const existingNames = [];
    const zipChunks = [];
    const zip = new Zip(streamHandler);

    for (const file of files) {
        const ext = getFileExtension(file.name);
        const isCompressed = compressedFormats.includes(ext);

        const uniqueFileName = getUniqueFileName(file.name, existingNames);
        existingNames.push(uniqueFileName);

        const zipFile = new ZipDeflate(uniqueFileName, { level: isCompressed ? 0 : 9 });
        zip.add(zipFile);
        const fileData = new Uint8Array(await file.arrayBuffer());
        zipFile.push(fileData, true);
    }

    zip.end();

    function streamHandler(err, data, final) {
        if (err) {
            console.error('Error creating ZIP file:', err);
            return;
        }

        if (data && data.length > 0) {
            zipChunks.push(data.slice());
        }

        if (final) {
            const file = new File(zipChunks, zipFileName, { type: 'application/zip' });
            downloadFile(file);
        }
    }
}

/**
 * Gets a unique file name by appending a counter if the name already exists in the provided list.
 * @param {string} fileName The original file name.
 * @param {string[]} existingNames The list of existing file names to check against.
 * @returns {string} A unique file name.
 */
export function getUniqueFileName(fileName, existingNames = []) {
    if (!existingNames.includes(fileName)) {
        return fileName;
    }

    const nameWithoutExtension = getFileNameWithoutExtension(fileName);
    const extension = getFileExtension(fileName);
    let counter = 1;
    let newFileName;

    do {
        newFileName = `${nameWithoutExtension} (${counter})${extension ? '.' + extension : ''}`;
        counter++;
    } while (existingNames.includes(newFileName));

    return newFileName;
}

/**
 * Gets the file name without its extension.
 * @param {string} fileName The original file name.
 * @returns {string} The file name without the extension.
 */
export function getFileNameWithoutExtension(fileName) {
    return fileName.replace(/\.[^.]+$/, '');
}

/**
 * Gets the file extension from a file name.
 * @param {string} fileName The original file name.
 * @returns {string} The file extension, or an empty string if none exists.
 */
export function getFileExtension(fileName) {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Converts an SVG file to a PNG file.
 * @param {File} file The SVG file to convert.
 * @param {Object} options Conversion options.
 * @param {number} [options.width] If provided, sets the width of the output PNG. If height is not provided, the height will be scaled to maintain the aspect ratio.
 * @param {number} [options.height] If provided, sets the height of the output PNG. If width is not provided, the width will be scaled to maintain the aspect ratio.
 * @param {boolean} [options.stretch] If width and height are both provided, this option determines whether to stretch the image to fill the full area (true) or maintain the aspect ratio and fit inside the full area (false). Default is false.
 * @param {number} [options.padding] A number between 0 and 49. The amount of padding to add around the image as a percentage. For example, a value of 10 on an image that is 200x200 pixels will result in the image being 160x160 pixels with 20 pixels of padding on each side. Default is 0 (no padding).
 * @param {string} [options.backgroundColor] A CSS color string to use as the background color of the output PNG. If not provided, the background will be transparent.
 * @param {{type: "linear" | "radial", stops: {color: string, offset: number}[], rotation?: number}} [options.backgroundGradient] A GradientData object to use as the background of the output PNG. If provided, this will override the backgroundColor option.
 * @param {number} [options.backgroundBorderRadius] A number between 0 and 50. The border radius percentage to apply to the background. Default is 0 (no border radius). For example, 10 will result in a border radius of 10%.
 * @returns {Promise<File>} A promise that resolves to a PNG file.
 */
export async function convertSvgToPng(file, options = {}) {
    file = await ensureSvgHasXmlns(file);
    const url = URL.createObjectURL(file);

    try {
        const dimensions = await getSvgDimensions(file);
        const image = await loadImage(url);

        let totalWidth = dimensions.width;
        let totalHeight = dimensions.height;

        if (options.width && options.height) {
            totalWidth = options.width;
            totalHeight = options.height;
        } else if (options.width) {
            const scale = options.width / totalWidth;
            totalWidth = options.width;
            totalHeight = Math.ceil(totalHeight * scale);
        } else if (options.height) {
            const scale = options.height / totalHeight;
            totalWidth = Math.ceil(totalWidth * scale);
            totalHeight = options.height;
        }

        let x = 0;
        let y = 0;
        let imageWidth = totalWidth;
        let imageHeight = totalHeight;

        if (options.padding) {
            const padding = Math.max(0, Math.min(50, options.padding));
            const paddingPixelsX = Math.round((padding / 100) * totalWidth);
            const paddingPixelsY = Math.round((padding / 100) * totalHeight);

            x = paddingPixelsX;
            y = paddingPixelsY;
            imageWidth = totalWidth - (2 * paddingPixelsX);
            imageHeight = totalHeight - (2 * paddingPixelsY);
        }

        if (options.width && options.height && !options.stretch && imageWidth > 0 && imageHeight > 0) {
            const scale = Math.min(imageWidth / dimensions.width, imageHeight / dimensions.height);
            const fittedWidth = Math.max(1, Math.round(dimensions.width * scale));
            const fittedHeight = Math.max(1, Math.round(dimensions.height * scale));

            x += Math.round((imageWidth - fittedWidth) / 2);
            y += Math.round((imageHeight - fittedHeight) / 2);
            imageWidth = fittedWidth;
            imageHeight = fittedHeight;
        }

        const canvas = new OffscreenCanvas(totalWidth, totalHeight);
        const context = canvas.getContext('2d');

        if (options.backgroundGradient) {
            const radiusPercentage = Math.max(0, Math.min(50, options.backgroundBorderRadius || 0));
            const borderRadius = Math.min(totalWidth, totalHeight) * (radiusPercentage / 100);

            if (options.backgroundGradient.type === 'linear') {
                // The +90deg offset aligns rotation=0 with a vertical top-to-bottom gradient.
                const angle = ((options.backgroundGradient.rotation || 0) + 90) * (Math.PI / 180);
                const centerX = totalWidth / 2;
                const centerY = totalHeight / 2;
                const directionX = Math.cos(angle);
                const directionY = Math.sin(angle);

                // Intersect the gradient direction with the canvas bounds so the gradient
                // follows the requested angle correctly for non-square dimensions.
                const tx = Math.abs(directionX) < Number.EPSILON ? Number.POSITIVE_INFINITY : (totalWidth / 2) / Math.abs(directionX);
                const ty = Math.abs(directionY) < Number.EPSILON ? Number.POSITIVE_INFINITY : (totalHeight / 2) / Math.abs(directionY);
                const halfLength = Math.min(tx, ty);

                const x0 = centerX + directionX * halfLength;
                const y0 = centerY + directionY * halfLength;
                const x1 = centerX - directionX * halfLength;
                const y1 = centerY - directionY * halfLength;

                const gradient = context.createLinearGradient(x0, y0, x1, y1);
                for (const stop of options.backgroundGradient.stops) {
                    gradient.addColorStop(stop.offset, stop.color);
                }
                
                context.fillStyle = gradient;
                context.beginPath();
                context.roundRect(0, 0, totalWidth, totalHeight, borderRadius);
                context.fill();
            } else if (options.backgroundGradient.type === 'radial') {
                const x0 = totalWidth / 2;
                const y0 = totalHeight / 2;
                const r0 = 0;
                const r1 = Math.hypot(totalWidth / 2, totalHeight / 2);

                const gradient = context.createRadialGradient(x0, y0, r0, x0, y0, r1);
                for (const stop of options.backgroundGradient.stops) {
                    gradient.addColorStop(stop.offset, stop.color);
                }

                context.fillStyle = gradient;
                context.beginPath();
                context.roundRect(0, 0, totalWidth, totalHeight, borderRadius);
                context.fill();
            }
        } else if (options.backgroundColor) {
            const radiusPercentage = Math.max(0, Math.min(50, options.backgroundBorderRadius || 0));
            const borderRadius = Math.min(totalWidth, totalHeight) * (radiusPercentage / 100);

            context.fillStyle = options.backgroundColor;
            context.beginPath();
            context.roundRect(0, 0, totalWidth, totalHeight, borderRadius);
            context.fill();
        }

        context.drawImage(image, x, y, imageWidth, imageHeight);

        const pngBlob = await canvas.convertToBlob({ type: 'image/png' });

        return new File([pngBlob], getFileNameWithoutExtension(file.name) + '.png', { type: 'image/png' });
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Ensures that an SVG file has the xmlns attribute.
 * @param {File} file The SVG file to check.
 * @returns {Promise<File>} A promise that resolves to the SVG file with the xmlns attribute.
 */
export async function ensureSvgHasXmlns(file) {
    const text = await file.text();

    if (text.includes('xmlns=')) {
        return file;
    }

    const patched = text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');

    return new File([patched], file.name, { type: file.type });
}

/**
 * Gets the dimensions of a raster image file (PNG, JPEG, etc.) in pixels.
 * @param {File} file The image file to get the dimensions of.
 * @returns {Promise<{width: number, height: number}>} A promise that resolves to an object containing the width and height of the image in pixels.
 */
export async function getRasterImageDimensions(file) {
    const url = URL.createObjectURL(file);

    try {
        const image = await loadImage(url);
        return {
            width: image.naturalWidth,
            height: image.naturalHeight
        };
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Gets the dimensions of an SVG file in pixels. If the SVG has width and height attributes, those are used. If not, the viewBox attribute is used to calculate the dimensions. If neither is present, a default size of 100x100 pixels is returned.
 * @param {File} file The SVG file to get the dimensions of.
 * @returns {Promise<{width: number, height: number}>} A promise that resolves to an object containing the width and height of the SVG in pixels.
 */
export async function getSvgDimensions(file) {
    const text = await file.text();
    const rootSvgElementOpeningTagMatch = text.match(/<svg[^>]*>/i);
    if (!rootSvgElementOpeningTagMatch || rootSvgElementOpeningTagMatch.length === 0) {
        // Return a default size of 100x100 pixels.
        return {
            width: 100,
            height: 100
        };
    }
    const rootSvgElement = rootSvgElementOpeningTagMatch[0];

    const widthMatch = rootSvgElement.match(/\swidth="(\S+)"/i);
    const heightMatch = rootSvgElement.match(/\sheight="(\S+)"/i);

    let widthPixels = null;
    let heightPixels = null;
    let viewBoxWidth = null;
    let viewBoxHeight = null;

    if (widthMatch && widthMatch[1]) {
        widthPixels = convertLengthToPixels(widthMatch[1]);

        if (widthPixels !== null && widthPixels <= 0) {
            widthPixels = null;
        }
    }
    if (heightMatch && heightMatch[1]) {
        heightPixels = convertLengthToPixels(heightMatch[1]);

        if (heightPixels !== null && heightPixels <= 0) {
            heightPixels = null;
        }
    }

    // We have both a valid width and height, so return them as-is
    if (widthPixels !== null && heightPixels !== null) {
        return {
            width: widthPixels,
            height: heightPixels
        };
    }

    const viewBoxMatch = rootSvgElement.match(/\sviewBox="-?[0-9]*.?[0-9]*\s-?[0-9]*.?[0-9]*\s(-?[0-9]*.?[0-9]*)\s(-?[0-9]*.?[0-9]*)"/i);
    if (viewBoxMatch && viewBoxMatch[1] && viewBoxMatch[2]) {
        const width = parseFloat(viewBoxMatch[1]);
        const height = parseFloat(viewBoxMatch[2]);
        if (!isNaN(width)) {
            viewBoxWidth = Math.round(width);
        }
        if (!isNaN(height)) {
            viewBoxHeight = Math.round(height);
        }
    }

    // We don't have a valid width or height, but we do have a valid viewBox, so return the viewBox dimensions
    if (widthPixels === null && heightPixels === null && viewBoxWidth !== null && viewBoxHeight !== null) {
        return {
            width: viewBoxWidth,
            height: viewBoxHeight
        };
    }

    // We have a valid width or height, but not both. If we have a viewBox, we can calculate the missing dimension based on the aspect ratio of the viewBox.
    if (viewBoxWidth !== null && viewBoxHeight !== null) {
        if (widthPixels !== null && heightPixels === null) {
            const aspectRatio = viewBoxWidth / viewBoxHeight;
            return {
                width: widthPixels,
                height: Math.round(widthPixels / aspectRatio)
            };
        }

        if (heightPixels !== null && widthPixels === null) {
            const aspectRatio = viewBoxWidth / viewBoxHeight;
            return {
                width: Math.round(heightPixels * aspectRatio),
                height: heightPixels
            };
        }
    }

    // We don't have enough information to determine the dimensions, so return a default size of 100x100 pixels.
    return {
        width: 100,
        height: 100
    };
}

/**
 * Converts a length string (e.g., "10px", "2em", "50%") to pixels.
 * @param {string} lengthString The length string to convert (e.g., "10px", "2em", "50%").
 * @param {number} remSize The size of 1rem in pixels. Default is 16.
 * @returns {number|null} The length in pixels, or null if the input is invalid.
 */
export function convertLengthToPixels(lengthString, remSize = 16) {
    const match = lengthString.match(/(-?[0-9]*.?[0-9]*)\s*([^\s0-9\-\.]*)/i);
    if (!match || match.length < 2) {
        return null;
    }

    const value = parseFloat(match[1]);
    if (isNaN(value)) {
        return null;
    }

    if (match.length < 3) {
        // No units, so assume pixels
        return Math.round(value);
    }

    const unit = match[2].toLowerCase();

    switch (unit) {
        case 'px':
            return Math.round(value);
        case 'cm':
            return Math.round(value * 37.8);
        case 'mm':
            return Math.round(value * 3.78);
        case 'q':
            return Math.round(value * 0.945);
        case 'in':
            return Math.round(value * 96);
        case 'pc':
            return Math.round(value * 16);
        case 'pt':
            return Math.round(value * 1.3333);
        case 'em':
        case 'rem':
            return Math.round(value * remSize);
        case '%':
        case 'vw':
        case 'vh':
        case 'vmin':
        case 'vmax':
            // Assuming percentages are of 100rem (10% == 10rem)
            return Math.round(value * remSize);
        case 'ch':
            // Assuming 1ch = 1/2 of 1rem
            return Math.round(value * (remSize / 2));
        default:
            // Unknown unit, return the value as is
            return Math.round(value);
    }
}

/**
 * Generates a UUID (Universally Unique Identifier). Uses the native crypto.randomUUID() if available, otherwise falls back to using crypto.getRandomValues(). Works in both secure and insecure contexts.
 * @param {boolean} includeDashes Whether to include dashes in the UUID. Default is true.
 * @param {boolean} uppercase Whether to return the UUID in uppercase. Default is false.
 * @returns {string} The generated UUID.
 */
export function generateUUID(includeDashes = true, uppercase = false) {
    let uuid = '';

    if (crypto.randomUUID) {
        uuid = crypto.randomUUID();
    } else {
        // Fallback to crypto.getRandomValues if crypto.randomUUID is not available
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Set version to 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Set variant to 10

        uuid = [...bytes].map((b, i) => {
            const hex = b.toString(16).padStart(2, '0');
            return [4, 6, 8, 10].includes(i) ? '-' + hex : hex;
        }).join('');
    }

    if (!includeDashes) {
        uuid = uuid.replace(/-/g, '');
    }
    if (uppercase) {
        uuid = uuid.toUpperCase();
    }
    return uuid;
}

/**
 * Loads an image from a given source URL and returns a promise that resolves to the loaded Image object. Allows for loading an image in a standard async flow, rather than putting logic in an onload callback.
 * @param {string} src The source URL of the image.
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the loaded Image object.
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}
