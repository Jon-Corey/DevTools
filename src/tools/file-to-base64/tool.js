import '/assets/components/file-input.js';
import { createIconElement, previewableImageFormats, formatFileSize, getFileExtension, getFileNameWithoutExtension, ensureSvgHasXmlns, downloadFile, getFileIcon, convertFileToBase64 } from '/assets/js/utils.js';

const fileInput = document.getElementById('file-input');
const output = document.getElementById('output');

await customElements.whenDefined('file-input');
initialize();

function initialize() {
    fileInput.addEventListener('change', handleChange);

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        output.classList.add('copy-unavailable');
    }
}

async function handleChange() {
    /** @type {{ id: string, file: File }[]} */
    const value = fileInput.value;

    // Remove items that are no longer in the file input
    const currentIds = Array.from(output.querySelectorAll('li')).map(li => li.dataset.id);
    currentIds.forEach(id => {
        if (!value.some(item => item.id === id)) {
            removeItem(id);
        }
    });
    
    // Add new items that are not yet in the output
    value.forEach(async item => {
        if (!currentIds.includes(item.id)) {
            await addItem(item);
        }
    });
}

async function addItem(item) {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    output.appendChild(li);

    const previewContainer = document.createElement('div');
    previewContainer.classList.add('preview-container');
    li.appendChild(previewContainer);

    const extension = getFileExtension(item.file.name);
    if (previewableImageFormats.includes(extension)) {
        const img = document.createElement('img');
        img.alt = '';
        img.classList.add('preview');
        img.src = await getPreviewUrl(item.file);
        previewContainer.appendChild(img);
    } else {
        previewContainer.replaceChildren(createIconElement(getFileIcon(extension)));
    }

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.textContent = item.file.name;
    li.appendChild(nameSpan);

    const sizeSpan = document.createElement('span');
    sizeSpan.classList.add('size');
    sizeSpan.classList.add('text-subtle');
    sizeSpan.textContent = formatFileSize(item.file.size);
    li.appendChild(sizeSpan);

    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-button');
    removeButton.classList.add('icon-only-button');
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', 'Remove file');
    removeButton.addEventListener('click', () => fileInput.removeFile(item.id));
    li.appendChild(removeButton);

    const buttonIcon = createIconElement('ti-x');
    removeButton.appendChild(buttonIcon);

    const flexRow = document.createElement('div');
    flexRow.classList.add('flex-row');
    li.appendChild(flexRow);

    const copyDataUrlButton = document.createElement('button');
    copyDataUrlButton.classList.add('copy-button');
    copyDataUrlButton.classList.add('primary');
    addButtonContent(copyDataUrlButton, 'Copy Data URL', true);
    copyDataUrlButton.addEventListener('click', async (event) => await copyDataUrl(event, item.id));
    flexRow.appendChild(copyDataUrlButton);

    const copyBase64Button = document.createElement('button');
    copyBase64Button.classList.add('copy-button');
    addButtonContent(copyBase64Button, 'Copy Base64', true);
    copyBase64Button.addEventListener('click', async (event) => await copyBase64(event, item.id));
    flexRow.appendChild(copyBase64Button);

    const downloadAsTextButton = document.createElement('button');
    downloadAsTextButton.classList.add('download-button');
    addButtonContent(downloadAsTextButton, 'Download as Text', false);
    downloadAsTextButton.addEventListener('click', async (event) => await downloadAsText(event, item.id));
    flexRow.appendChild(downloadAsTextButton);
}

function removeItem(id) {
    const li = output.querySelector(`li[data-id="${id}"]`);
    if (li) {
        revokePreviewUrl(id);
        output.removeChild(li);
    }
}

async function copyDataUrl(event, id) {
    const button = event.currentTarget;
    const file = fileInput.value.find(f => f.id === id)?.file;

    if (file) {
        const base64 = await convertFileToBase64(file);
        await navigator.clipboard.writeText(base64);
        button.classList.add('show-alternate-content');
        setTimeout(() => button.classList.remove('show-alternate-content'), 1000);
    }
}

async function copyBase64(event, id) {
    const button = event.currentTarget;
    const file = fileInput.value.find(f => f.id === id)?.file;

    if (file) {
        const base64 = await convertFileToBase64(file);
        const base64Data = base64.split(',')[1];
        await navigator.clipboard.writeText(base64Data);
        button.classList.add('show-alternate-content');
        setTimeout(() => button.classList.remove('show-alternate-content'), 1000);
    }
}

async function downloadAsText(event, id) {
    const button = event.currentTarget;
    const file = fileInput.value.find(f => f.id === id)?.file;

    if (file) {
        const base64 = await convertFileToBase64(file);
        const textFile = new File([base64], `${getFileNameWithoutExtension(file.name)}-base64.txt`, { type: 'text/plain' });
        downloadFile(textFile);
        button.classList.add('show-alternate-content');
        setTimeout(() => button.classList.remove('show-alternate-content'), 1000);
    }
}

async function getPreviewUrl(file) {
    const extension = getFileExtension(file.name);
    if (previewableImageFormats.includes(extension)) {
        if (extension === 'svg') {
            return URL.createObjectURL(await ensureSvgHasXmlns(file));
        }
        return URL.createObjectURL(file);
    }
    return '';
}

function revokePreviewUrl(id) {
    const previewImage = output.querySelector(`li[data-id="${id}"] .preview`);
    if (previewImage) {
        URL.revokeObjectURL(previewImage.src);
    }
}

function addButtonContent(button, defaultText, isCopy) {
    // Default content
    const defaultContent = document.createElement('span');
    defaultContent.className = 'default-content';
    button.appendChild(defaultContent);

    const defaultIcon = createIconElement(isCopy ? 'ti-copy' : 'ti-download');
    defaultContent.appendChild(defaultIcon);

    const defaultTextNode = document.createTextNode(' ' + defaultText);
    defaultContent.appendChild(defaultTextNode);

    // Alternate content
    const alternateContent = document.createElement('span');
    alternateContent.className = 'alternate-content';
    button.appendChild(alternateContent);

    const alternateIcon = createIconElement('ti-check');
    alternateContent.appendChild(alternateIcon);

    const alternateTextNode = document.createTextNode(isCopy ? ' Copied!' : ' Downloaded!');
    alternateContent.appendChild(alternateTextNode);
}
