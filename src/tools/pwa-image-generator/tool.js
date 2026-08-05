import Prism from '/assets/js/vendor/prism/prism.js'
import '/assets/js/vendor/prism/prism-json.js';
import { transformImage } from '/assets/js/magick-utils.js';
import { downloadFile, downloadFilesAsZip, getFileExtension, getRasterImageDimensions } from '/assets/js/utils.js';
import '/assets/components/file-item.js';

const imageTooSmallWarning = document.getElementById('image-too-small-warning');

const fileInput = document.getElementById('file-input');

const regularPreviewImage = document.getElementById('regular-preview-image');
const maskablePreviewImage = document.getElementById('maskable-preview-image');

const regularPaddingInput = document.getElementById('regular-padding'); 
const maskablePaddingInput = document.getElementById('maskable-padding'); 
const backgroundColorInput = document.getElementById('background-color');

const generateButton = document.getElementById('generate-button');
const downloadButton = document.getElementById('download-button');

const generatedImagesList = document.getElementById('generated-images');
const metaTagsContainer = document.getElementById('meta-tags');
const webAppManifestContainer = document.getElementById('web-app-manifest');

const generatedImagesDetails = document.getElementById('generated-images-details');
const metaTagsDetails = document.getElementById('meta-tags-details');
const webAppManifestDetails = document.getElementById('web-app-manifest-details');
const documentationDetails = document.getElementById('documentation-details');

const regularPaddingKey = 'pwa-image-generator.regularPadding';
const maskablePaddingKey = 'pwa-image-generator.maskablePadding';
const backgroundColorKey = 'pwa-image-generator.backgroundColor';

const generatedImagesDetailsKey = 'pwa-image-generator.generatedImagesDetailsOpen';
const metaTagsDetailsKey = 'pwa-image-generator.metaTagsDetailsOpen';
const webAppManifestDetailsKey = 'pwa-image-generator.webAppManifestDetailsOpen';
const documentationDetailsKey = 'pwa-image-generator.documentationDetailsOpen';

// Source: https://developer.apple.com/design/human-interface-guidelines/layout/
// dpr: Device Pixel Ratio (how many pixels per point)
// width: Width of the screen in points - smaller than height since portrait orientation is assumed
// height: Height of the screen in points - larger than width since portrait orientation is assumed
const splashScreenSizes = [
    { dpr: 2, width: 1024, height: 1366 },
    { dpr: 2, width: 1032, height: 1376 },
    { dpr: 2, width: 320, height: 568 },
    { dpr: 2, width: 375, height: 667 },
    { dpr: 2, width: 414, height: 896 },
    { dpr: 2, width: 744, height: 1133 },
    { dpr: 2, width: 768, height: 1024 },
    { dpr: 2, width: 810, height: 1080 },
    { dpr: 2, width: 820, height: 1180 },
    { dpr: 2, width: 834, height: 1112 },
    { dpr: 2, width: 834, height: 1194 },
    { dpr: 2, width: 834, height: 1210 },
    { dpr: 3, width: 360, height: 780 },
    { dpr: 3, width: 375, height: 812 },
    { dpr: 3, width: 390, height: 844 },
    { dpr: 3, width: 393, height: 852 },
    { dpr: 3, width: 402, height: 874 },
    { dpr: 3, width: 414, height: 736 },
    { dpr: 3, width: 414, height: 896 },
    { dpr: 3, width: 420, height: 912 },
    { dpr: 3, width: 428, height: 926 },
    { dpr: 3, width: 430, height: 932 },
    { dpr: 3, width: 440, height: 956 }
];

let regularPreviewUpdateTimeoutId;
let maskablePreviewUpdateTimeoutId;

let generatedImages = [];

initialize();

function initialize() {
    // Initialize Prism
    Prism.manual = true;

    // Load settings from localStorage
    regularPaddingInput.value = localStorage.getItem(regularPaddingKey) || '0';
    maskablePaddingInput.value = localStorage.getItem(maskablePaddingKey) || '10';
    backgroundColorInput.value = localStorage.getItem(backgroundColorKey) || '#ffffff';

    generatedImagesDetails.open = localStorage.getItem(generatedImagesDetailsKey) === 'true';
    metaTagsDetails.open = localStorage.getItem(metaTagsDetailsKey) === 'true';
    webAppManifestDetails.open = localStorage.getItem(webAppManifestDetailsKey) === 'true';
    documentationDetails.open = localStorage.getItem(documentationDetailsKey) === 'true';

    // Add event listeners
    fileInput.addEventListener('change', fileInputChanged);
    regularPaddingInput.addEventListener('change', regularPaddingChanged);
    maskablePaddingInput.addEventListener('change', maskablePaddingChanged);
    backgroundColorInput.addEventListener('change', backgroundColorChanged);
    generateButton.addEventListener('click', generateImages);
    downloadButton.addEventListener('click', downloadBundle);

    generatedImagesDetails.addEventListener('toggle', () => {
        if (generatedImagesDetails.open) {
            localStorage.setItem(generatedImagesDetailsKey, 'true');
        } else {
            localStorage.removeItem(generatedImagesDetailsKey);
        }
    });
    metaTagsDetails.addEventListener('toggle', () => {
        if (metaTagsDetails.open) {
            localStorage.setItem(metaTagsDetailsKey, 'true');
        } else {
            localStorage.removeItem(metaTagsDetailsKey);
        }
    });
    webAppManifestDetails.addEventListener('toggle', () => {
        if (webAppManifestDetails.open) {
            localStorage.setItem(webAppManifestDetailsKey, 'true');
        } else {
            localStorage.removeItem(webAppManifestDetailsKey);
        }
    });
    documentationDetails.addEventListener('toggle', () => {
        if (documentationDetails.open) {
            localStorage.setItem(documentationDetailsKey, 'true');
        } else {
            localStorage.removeItem(documentationDetailsKey);
        }
    });
}

async function fileInputChanged() {
    reset();
    if (!fileInput.files || fileInput.files.length === 0) {
        return;
    }

    const file = fileInput.files[0];
    const fileExtension = getFileExtension(file.name).toLowerCase();

    if (fileExtension !== 'svg') {
        // For non-SVG images, check the dimensions
        const dimensions = await getRasterImageDimensions(file);
        if (dimensions.width < 512 || dimensions.height < 512) {
            imageTooSmallWarning.style.display = 'block';
            return;
        }
    }

    imageTooSmallWarning.style.display = '';
    await updateRegularPreviewImage();
    await updateMaskablePreviewImage();
    regularPaddingInput.disabled = false;
    maskablePaddingInput.disabled = false;
    backgroundColorInput.disabled = false;
    generateButton.disabled = false;
}

async function backgroundColorChanged() {
    localStorage.setItem(backgroundColorKey, backgroundColorInput.value);
    debounceRegularPreviewUpdate();
    debounceMaskablePreviewUpdate();
}

async function regularPaddingChanged() {
    localStorage.setItem(regularPaddingKey, regularPaddingInput.value);
    debounceRegularPreviewUpdate();
}

async function maskablePaddingChanged() {
    localStorage.setItem(maskablePaddingKey, maskablePaddingInput.value);
    debounceMaskablePreviewUpdate();
}

function debounceRegularPreviewUpdate() {
    clearTimeout(regularPreviewUpdateTimeoutId);
    regularPreviewUpdateTimeoutId = setTimeout(() => {
        void updateRegularPreviewImage();
    }, 100);
}

function debounceMaskablePreviewUpdate() {
    clearTimeout(maskablePreviewUpdateTimeoutId);
    maskablePreviewUpdateTimeoutId = setTimeout(() => {
        void updateMaskablePreviewImage();
    }, 100);
}

async function updateRegularPreviewImage() {
    if (!fileInput.files || fileInput.files.length === 0) {
        return;
    }
    const file = fileInput.files[0];
    
    URL.revokeObjectURL(regularPreviewImage.style.backgroundImage.slice(5, -2));

    const previewImage = await transformImage(file, {
        width: 320,
        height: 320,
        backgroundColor: backgroundColorInput.value,
        padding: parseInt(regularPaddingInput.value, 10)
    });

    const previewImageUrl = URL.createObjectURL(previewImage);
    regularPreviewImage.style.backgroundImage = `url(${previewImageUrl})`;
}

async function updateMaskablePreviewImage() {
    if (!fileInput.files || fileInput.files.length === 0) {
        return;
    }
    const file = fileInput.files[0];

    URL.revokeObjectURL(maskablePreviewImage.style.backgroundImage.slice(5, -2));

    const previewImage = await transformImage(file, {
        width: 400,
        height: 400,
        backgroundColor: backgroundColorInput.value,
        padding: parseInt(maskablePaddingInput.value, 10)
    });

    const previewImageUrl = URL.createObjectURL(previewImage);
    maskablePreviewImage.style.backgroundImage = `url(${previewImageUrl})`;
}

function reset() {
    URL.revokeObjectURL(regularPreviewImage.style.backgroundImage.slice(5, -2));
    URL.revokeObjectURL(maskablePreviewImage.style.backgroundImage.slice(5, -2));

    generatedImages = [];

    imageTooSmallWarning.style.display = '';
    regularPreviewImage.style.backgroundImage = '';
    maskablePreviewImage.style.backgroundImage = '';
    regularPaddingInput.disabled = true;
    maskablePaddingInput.disabled = true;
    backgroundColorInput.disabled = true;
    generateButton.disabled = true;
    downloadButton.disabled = true;
    generatedImagesList.innerHTML = '';
    metaTagsContainer.innerHTML = '';
    webAppManifestContainer.innerHTML = '';

    generatedImagesDetails.style.display = '';
    metaTagsDetails.style.display = '';
    webAppManifestDetails.style.display = '';
}

async function generateImages() {
    generatedImagesList.innerHTML = '';
    metaTagsContainer.textContent = 'Loading...';
    webAppManifestContainer.textContent = 'Loading...';
    generateButton.textContent = 'Generating...';
    generateButton.disabled = true;

    generatedImages = [];

    if (!fileInput.files || fileInput.files.length === 0) {
        metaTagsContainer.textContent = '';
        webAppManifestContainer.textContent = '';
        generateButton.textContent = 'Generate';
        generateButton.disabled = false;
        return;
    }
    const file = fileInput.files[0];

    const backgroundColor = backgroundColorInput.value;
    const regularPadding = parseInt(regularPaddingInput.value, 10);
    const maskablePadding = parseInt(maskablePaddingInput.value, 10);

    let metaTagsHtml = '';
    let webAppManifestJson = {
        name: 'My App',
        start_url: '/',
        display: 'standalone',
        icons: []
    };

    // Favicons
    metaTagsHtml += '<!-- Favicons -->\n';
    generatedImages.push(await generateImage(file, { fileName: 'favicon-16', format: 'PNG', width: 16, height: 16 }));
    metaTagsHtml += `<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16.png">\n`;
    generatedImages.push(await generateImage(file, { fileName: 'favicon-32', format: 'PNG', width: 32, height: 32 }));
    metaTagsHtml += `<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">\n`;
    if (getFileExtension(file.name).toUpperCase() === 'SVG') {
        const svgFile = new File([file], 'favicon.svg', { type: 'image/svg+xml' });
        generatedImages.push(svgFile);
        renderImageToList(svgFile);
        metaTagsHtml += `<link rel="icon" type="image/svg+xml" sizes="any" href="/images/favicon.svg">\n`;
    } else {
        generatedImages.push(await generateImage(file, { fileName: 'favicon-48', format: 'PNG', width: 48, height: 48 }));
        metaTagsHtml += `<link rel="icon" type="image/png" sizes="48x48" href="/images/favicon-48.png">\n`;
    }

    // Apple Touch Icon
    metaTagsHtml += '\n<!-- Apple Touch Icon -->\n';
    generatedImages.push(await generateImage(file, { fileName: 'icon-180', format: 'PNG', width: 180, height: 180, backgroundColor: backgroundColor, padding: regularPadding }));
    metaTagsHtml += `<link rel="apple-touch-icon" sizes="180x180" href="/images/icon-180.png">\n`;

    // Manifest Icons
    metaTagsHtml += '\n<!-- PWA Manifest -->\n';
    metaTagsHtml += `<link rel="manifest" href="/manifest.webmanifest">\n`;

    generatedImages.push(await generateImage(file, { fileName: 'icon-192', format: 'PNG', width: 192, height: 192, backgroundColor: backgroundColor, padding: regularPadding }));
    webAppManifestJson.icons.push({ src: '/images/icon-192.png', sizes: '192x192', type: 'image/png' });
    generatedImages.push(await generateImage(file, { fileName: 'icon-512', format: 'PNG', width: 512, height: 512, backgroundColor: backgroundColor, padding: regularPadding }));
    webAppManifestJson.icons.push({ src: '/images/icon-512.png', sizes: '512x512', type: 'image/png' });
    generatedImages.push(await generateImage(file, { fileName: 'icon-192-maskable', format: 'PNG', width: 192, height: 192, backgroundColor: backgroundColor, padding: maskablePadding }));
    webAppManifestJson.icons.push({ src: '/images/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' });
    generatedImages.push(await generateImage(file, { fileName: 'icon-512-maskable', format: 'PNG', width: 512, height: 512, backgroundColor: backgroundColor, padding: maskablePadding }));
    webAppManifestJson.icons.push({ src: '/images/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' });

    // Splash Screens
    metaTagsHtml += '\n<!-- Splash Screens -->\n';
    for (const size of splashScreenSizes) {
        const pixelWidth = size.width * size.dpr;
        const pixelHeight = size.height * size.dpr;

        generatedImages.push(await generateImage(file, { fileName: `splash-${pixelWidth}x${pixelHeight}`, format: 'PNG', width: pixelWidth, height: pixelHeight, backgroundColor: backgroundColor, padding: maskablePadding }));
        metaTagsHtml += `<link rel="apple-touch-startup-image" href="/images/splash-${pixelWidth}x${pixelHeight}.png" media="screen and (device-width: ${size.width}px) and (device-height: ${size.height}px) and (-webkit-device-pixel-ratio: ${size.dpr}) and (orientation: portrait)">\n`;

        generatedImages.push(await generateImage(file, { fileName: `splash-${pixelHeight}x${pixelWidth}`, format: 'PNG', width: pixelHeight, height: pixelWidth, backgroundColor: backgroundColor, padding: maskablePadding }));
        metaTagsHtml += `<link rel="apple-touch-startup-image" href="/images/splash-${pixelHeight}x${pixelWidth}.png" media="screen and (device-width: ${size.height}px) and (device-height: ${size.width}px) and (-webkit-device-pixel-ratio: ${size.dpr}) and (orientation: landscape)">\n`;
    }
    metaTagsHtml = metaTagsHtml.trimEnd('\n');

    // Meta Tags and Manifest
    metaTagsContainer.textContent = metaTagsHtml;
    webAppManifestContainer.textContent = JSON.stringify(webAppManifestJson, null, 4);

    Prism.highlightAll();

    generatedImagesDetails.style.display = 'block';
    metaTagsDetails.style.display = 'block';
    webAppManifestDetails.style.display = 'block';

    generateButton.textContent = 'Generate';
    generateButton.disabled = false;
    downloadButton.disabled = false;
}

async function generateImage(file, options) {
    const generatedImage = await transformImage(file, options);
    renderImageToList(generatedImage);
    return generatedImage;
}

function renderImageToList(file) {
    const fileItem = document.createElement('file-item');
    fileItem.file = file;
    fileItem.setAttribute('button-icon', 'download');
    fileItem.setAttribute('button-label', 'Download file');
    fileItem.addEventListener('button-clicked', () => downloadFile(file));
    generatedImagesList.appendChild(fileItem);
}

async function downloadBundle() {
    if (generatedImages.length === 0) {
        return;
    }

    const filesToDownload = [...generatedImages];
    filesToDownload.push(generateReadmeFile());

    await downloadFilesAsZip(filesToDownload, 'pwa-bundle.zip');
}

function generateReadmeFile() {
    const content = `# PWA Bundle

This bundle contains the generated images, meta tags, and web app manifest for your Progressive Web App (PWA).

## Images

Place all images in the \`/images\` directory of your web application.

## Meta Tags

Add the following meta tags to the \`<head>\` section of each of your HTML files:

\`\`\`html
${metaTagsContainer.textContent}
\`\`\`

## Web App Manifest

Save the following JSON as \`manifest.webmanifest\` in the root of your web application:

\`\`\`json
${webAppManifestContainer.textContent}
\`\`\`
`;

    return new File([content], 'README.md', { type: 'text/markdown' });
}
