import { generateUUID } from '/assets/js/utils.js';

const uppercaseCheckbox = document.getElementById('uppercase');
const dashesCheckbox = document.getElementById('include-dashes');
const copyButton = document.getElementById('copy-button');
const regenerateButton = document.getElementById('regenerate-button');
const outputElement = document.getElementById('output');

initialize();

function initialize() {
    // Add event listeners
    uppercaseCheckbox.addEventListener('change', updateUUID);
    dashesCheckbox.addEventListener('change', updateUUID);
    copyButton.addEventListener('click', copyToClipboard);
    regenerateButton.addEventListener('click', updateUUID);

    // Hide copy button if clipboard API is not available
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        copyButton.style.display = 'none';
    }

    // Generate initial UUID
    updateUUID();
}

function updateUUID() {
    outputElement.textContent = generateUUID(dashesCheckbox.checked, uppercaseCheckbox.checked);
}

async function copyToClipboard() {
    const uuid = outputElement.textContent;
    await navigator.clipboard.writeText(uuid);
    copyButton.classList.add('show-alternate-content');
    setTimeout(() => {
        copyButton.classList.remove('show-alternate-content');
    }, 1000);
}
