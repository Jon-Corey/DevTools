import { optimize } from '/assets/js/vendor/svgo/svgo.js';
import { downloadFile, downloadFilesAsZip } from '/assets/js/utils.js';
import '/assets/components/file-item.js';

const fileInput = document.getElementById('file-input');

const downloadAllButton = document.getElementById('download-all-button');
const fileOutputList = document.getElementById('file-output');

let optimizedFiles = [];

await initialize();

async function initialize() {
    // Add event listeners
    fileInput.addEventListener('change', fileInputChanged);
    downloadAllButton.addEventListener('click', downloadAll);
}

// Event Handlers

async function fileInputChanged() {
    optimizedFiles = [];
    fileOutputList.innerHTML = '';

    if (fileInput.files.length === 0) {
        downloadAllButton.disabled = true;
        return;
    }

    for (const file of fileInput.files) {
        const optimizedFile = await optimizeSVG(file);
        optimizedFiles.push(optimizedFile);
        renderFileToList(optimizedFile, file.size);
    }

    downloadAllButton.disabled = false;
}

function downloadAll() {
    downloadFilesAsZip(optimizedFiles, 'optimized-svgs.zip');
}

// Utility Functions

async function optimizeSVG(file) {
    const text = await file.text();
    const result = optimize(text);
    return new File([result.data], file.name, { type: 'image/svg+xml' });
}

function renderFileToList(file, originalSize) {
    const fileItem = document.createElement('file-item');
    fileItem.file = file;
    fileItem.setAttribute('button-icon', 'ti-download');
    fileItem.setAttribute('button-label', 'Download file');
    fileItem.setAttribute('original-file-size', originalSize);
    fileItem.addEventListener('button-clicked', () => downloadFile(file));
    fileOutputList.appendChild(fileItem);
}
