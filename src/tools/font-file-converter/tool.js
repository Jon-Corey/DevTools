import '/assets/components/file-input.js';
import { WoffCompressionContext } from '/assets/js/vendor/glypht/glypht.js';
import { downloadFile, downloadFilesAsZip, getFileNameWithoutExtension, getFileExtension } from '/assets/js/utils.js';
import '/assets/components/file-item.js';

const fileInput = document.getElementById('file-input');

const outputTtfCheckbox = document.getElementById('output-ttf');
const outputWoffCheckbox = document.getElementById('output-woff');
const outputWoff2Checkbox = document.getElementById('output-woff2');

const convertButton = document.getElementById('convert-button');

const downloadAllButton = document.getElementById('download-all-button');

const generatedFilesList = document.getElementById('generated-files');

let generatedFiles = [];

await customElements.whenDefined('file-input');
initialize();

function initialize() {
    // Add event listeners
    fileInput.addEventListener('change', inputChanged);
    convertButton.addEventListener('click', convertButtonClicked);
    downloadAllButton.addEventListener('click', downloadAll);

    outputTtfCheckbox.addEventListener('change', inputChanged);
    outputWoffCheckbox.addEventListener('change', inputChanged);
    outputWoff2Checkbox.addEventListener('change', inputChanged);
}

// Event Handlers

function inputChanged() {
    const formatCount = [outputTtfCheckbox, outputWoffCheckbox, outputWoff2Checkbox].filter(checkbox => checkbox.checked).length;
    if (fileInput.files.length > 0 && formatCount > 0) {
        convertButton.disabled = false;
    } else {
        convertButton.disabled = true;
    }
}

async function convertButtonClicked() {
    if (!fileInput.files.length) {
        return;
    }

    downloadAllButton.disabled = true;
    convertButton.disabled = true;
    convertButton.textContent = 'Converting...';

    generatedFilesList.innerHTML = '';

    // Progress bar
    const progressBar = document.createElement('progress');
    progressBar.value = 0;
    progressBar.max = getNumberOfOutputFiles();
    progressBar.id = 'progress-bar';
    generatedFilesList.appendChild(progressBar);

    generatedFiles = [];
    await convertFonts(progressBar);

    generatedFilesList.innerHTML = '';
    generatedFiles.forEach(file => {
        const fileItem = document.createElement('file-item');
        fileItem.file = file;
        fileItem.setAttribute('button-icon', 'ti-download');
        fileItem.setAttribute('button-label', 'Download file');
        fileItem.addEventListener('button-clicked', () => downloadFile(file));
        generatedFilesList.appendChild(fileItem);
    });

    downloadAllButton.disabled = false;
    convertButton.textContent = 'Convert';
    convertButton.disabled = false;
}

async function downloadAll() {
    // Zip all files and trigger download
    await downloadFilesAsZip(generatedFiles, 'converted-fonts.zip');
}

// Utility Functions

async function convertFonts(progressBar) {
    const files = fileInput.files;
    if (!files.length) {
        return;
    }

    const formats = [];
    if (outputTtfCheckbox.checked) { formats.push('ttf'); }
    if (outputWoffCheckbox.checked) { formats.push('woff'); }
    if (outputWoff2Checkbox.checked) { formats.push('woff2'); }

    const compressor = new WoffCompressionContext();

    for (const file of files) {
        // If performance is an issue, we can consider reading and converting files in parallel
        const fontData = new Uint8Array(await file.arrayBuffer());
        const fileExtension = getFileExtension(file.name);
        const fileNameWithoutExtension = getFileNameWithoutExtension(file.name);

        for (const format of formats) {
            if (format === fileExtension || (format === 'ttf' && fileExtension === 'otf')) {
                // No conversion needed, just make sure it has the correct MIME type
                generatedFiles.push(new File([fontData], `${fileNameWithoutExtension}.${fileExtension}`, { type: `font/${fileExtension}` }));
                continue;
            }

            if (format === 'ttf') {
                // Decompress WOFF/WOFF2 to TTF/OTF
                const convertedFontData = await compressor.decompressToTTF(fontData, { transfer: false });
                generatedFiles.push(new File([convertedFontData], `${fileNameWithoutExtension}.ttf`, { type: 'font/ttf' }));
            } else if (format === 'woff' && fileExtension === 'woff2'
                || format === 'woff2' && fileExtension === 'woff') {
                // To convert between WOFF and WOFF2, we need to decompress to TTF first, then compress to the target format
                const ttfData = await compressor.decompressToTTF(fontData, { transfer: false });
                const convertedFontData = await compressor.compressFromTTF(ttfData, {
                    algorithm: format,
                    transfer: false
                });
                generatedFiles.push(new File([convertedFontData], `${fileNameWithoutExtension}.${format}`, { type: `font/${format}` }));
            } else {
                // Compress TTF/OTF to WOFF/WOFF2
                const convertedFontData = await compressor.compressFromTTF(fontData, {
                    algorithm: format,
                    transfer: false
                });
                generatedFiles.push(new File([convertedFontData], `${fileNameWithoutExtension}.${format}`, { type: `font/${format}` }));
            }
            if (progressBar) {
                progressBar.value = generatedFiles.length;
            }
        }
    }

    compressor.destroy();
}

function getNumberOfOutputFiles() {
    const inputCount = fileInput.files.length;
    const formatCount = [outputTtfCheckbox, outputWoffCheckbox, outputWoff2Checkbox].filter(checkbox => checkbox.checked).length;
    return inputCount * formatCount;
}
