import { compressImage } from '/assets/js/magick-utils.js';
import { downloadFile, downloadFilesAsZip } from '/assets/js/utils.js';
import '/assets/components/file-item.js';

const fileInput = document.getElementById('file-input');
const compressButton = document.getElementById('compress-button');

const downloadAllButton = document.getElementById('download-all-button');
const compressedImagesList = document.getElementById('compressed-images');
const loadingSpinner = document.querySelector('.loading-spinner');

let compressedImages = [];

await initialize();

async function initialize() {
    loadingSpinner.style.display = 'none';

    // Add event listeners
    fileInput.addEventListener('change', fileInputChanged);
    compressButton.addEventListener('click', compressButtonClicked);
    downloadAllButton.addEventListener('click', downloadAll);
}

// Event Handlers

function fileInputChanged() {
    if (fileInput.value.length > 0) {
        compressButton.disabled = false;
    } else {
        compressButton.disabled = true;
    }
}

async function compressButtonClicked() {
    if (fileInput.value.length === 0) {
        return;
    }

    downloadAllButton.disabled = true;
    compressButton.disabled = true;
    compressButton.textContent = 'Compressing...';
    loadingSpinner.style.display = 'block';

    compressedImagesList.innerHTML = '';
    compressedImages = [];

    for (const file of fileInput.files) {
        const compressedFile = await compressImage(file);

        compressedImages.push(compressedFile);
        renderImageToList(compressedFile, file.size);
    }

    downloadAllButton.disabled = false;
    compressButton.textContent = 'Compress';
    compressButton.disabled = false;
    loadingSpinner.style.display = 'none';
}

function downloadAll() {
    downloadFilesAsZip(compressedImages, 'compressed-images.zip');
}

// Utility Functions

function renderImageToList(file, originalSize) {
    const fileItem = document.createElement('file-item');
    fileItem.file = file;
    fileItem.setAttribute('button-icon', 'ti-download');
    fileItem.setAttribute('button-label', 'Download file');
    fileItem.setAttribute('original-file-size', originalSize);
    fileItem.addEventListener('button-clicked', () => downloadFile(file));
    compressedImagesList.appendChild(fileItem);
}
