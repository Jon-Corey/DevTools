import '/assets/components/file-input.js';
import '/assets/components/color-input.js';
import '/assets/components/range-input.js';
import { transformImage } from '/assets/js/magick-utils.js';
import { downloadFile, downloadFilesAsZip, getFileExtension } from '/assets/js/utils.js';
import '/assets/components/file-item.js';

const fileInput = document.getElementById('file-input');
const formatSelect = document.getElementById('format-select');
const convertButton = document.getElementById('convert-button');

const optionsRow = document.getElementById('options-row');

const backgroundColorCard = document.getElementById('background-color-card');
const backgroundColorInput = document.getElementById('background-color');

const qualityCard = document.getElementById('quality-card');
const qualityInput = document.getElementById('quality');

const sizesRow = document.getElementById('sizes-row');
const size16x16Checkbox = document.getElementById('size-16x16');
const size24x24Checkbox = document.getElementById('size-24x24');
const size32x32Checkbox = document.getElementById('size-32x32');
const size48x48Checkbox = document.getElementById('size-48x48');
const size64x64Checkbox = document.getElementById('size-64x64');
const size128x128Checkbox = document.getElementById('size-128x128');
const size256x256Checkbox = document.getElementById('size-256x256');

const downloadAllButton = document.getElementById('download-all-button');
const convertedImagesList = document.getElementById('converted-images');

const options = {
    // backgroundColor: if format doesn't support transparency (e.g. JPEG)
    // quality: for lossy formats (e.g. JPEG, WebP)
    // sizes: for ICO since it can contain multiple sizes in one file
    PNG: [],
    JPEG: ['backgroundColor', 'quality'],
    WEBP: ['quality'],
    GIF: [],
    AVIF: ['quality'],
    BMP: ['backgroundColor'],
    TIFF: [],
    ICO: ['sizes']
}

let convertedImages = [];

await customElements.whenDefined('file-input');
await customElements.whenDefined('color-input');
await customElements.whenDefined('range-input');
await initialize();

async function initialize() {
    // Add event listeners
    fileInput.addEventListener('change', fileInputChanged);
    formatSelect.addEventListener('change', formatSelectChanged);
    convertButton.addEventListener('click', convertButtonClicked);

    downloadAllButton.addEventListener('click', downloadAll);

    formatSelectChanged();
}

// Event Handlers

function fileInputChanged() {
    if (fileInput.value.length > 0) {
        convertButton.disabled = false;
    } else {
        convertButton.disabled = true;
    }
}

function formatSelectChanged() {
    const selectedFormatOptions = options[formatSelect.value];

    if (selectedFormatOptions.includes('backgroundColor')) {
        optionsRow.style.display = 'flex';
        backgroundColorCard.style.display = 'block';
    } else {
        backgroundColorCard.style.display = 'none';
    }

    if (selectedFormatOptions.includes('quality')) {
        optionsRow.style.display = 'flex';
        qualityCard.style.display = 'flex';
    } else {
        qualityCard.style.display = 'none';
    }

    if (selectedFormatOptions.includes('backgroundColor') === false
        && selectedFormatOptions.includes('quality') === false) {
        optionsRow.style.display = 'none';
    }

    if (selectedFormatOptions.includes('sizes')) {
        sizesRow.style.display = 'flex';
    } else {
        sizesRow.style.display = 'none';
    }
}

async function convertButtonClicked() {
    if (fileInput.value.length === 0) {
        return;
    }

    downloadAllButton.disabled = true;
    convertButton.disabled = true;
    convertButton.textContent = 'Converting...';

    convertedImagesList.innerHTML = '';
    convertedImages = [];

    const destinationFormat = formatSelect.value.toUpperCase();
    const destinationOptions = options[destinationFormat];

    for (const fileValue of fileInput.value) {
        const options = {
            format: destinationFormat,
            stretch: true // For SVG files where the user has changed the aspect ratio, we want to stretch the image to fit the new dimensions
        };

        if (destinationOptions.includes('backgroundColor')) {
            options.backgroundColor = backgroundColorInput.value;
        }
        if (destinationOptions.includes('quality')) {
            options.quality = Number.parseInt(qualityInput.value, 10);
        }
        if (destinationOptions.includes('sizes')) {
            const selectedSizes = [];

            if (size16x16Checkbox.checked) selectedSizes.push(16);
            if (size24x24Checkbox.checked) selectedSizes.push(24);
            if (size32x32Checkbox.checked) selectedSizes.push(32);
            if (size48x48Checkbox.checked) selectedSizes.push(48);
            if (size64x64Checkbox.checked) selectedSizes.push(64);
            if (size128x128Checkbox.checked) selectedSizes.push(128);
            if (size256x256Checkbox.checked) selectedSizes.push(256);

            options.sizes = selectedSizes;
        }
        if (getFileExtension(fileValue.file.name).toUpperCase() === 'SVG') {
            // If the source file is SVG, we need to specify the width and height for conversion
            options.width = fileValue.width;
            options.height = fileValue.height;
        }

        const convertedFile = await transformImage(fileValue.file, options);

        convertedImages.push(convertedFile);
        renderImageToList(convertedFile);
    }

    downloadAllButton.disabled = false;
    convertButton.textContent = 'Convert';
    convertButton.disabled = false;
}

function downloadAll() {
    downloadFilesAsZip(convertedImages, 'converted-images.zip');
}

// Utility Functions

function renderImageToList(file) {
    const fileItem = document.createElement('file-item');
    fileItem.file = file;
    fileItem.setAttribute('button-icon', 'ti-download');
    fileItem.setAttribute('button-label', 'Download file');
    fileItem.addEventListener('button-clicked', () => downloadFile(file));
    convertedImagesList.appendChild(fileItem);
}
