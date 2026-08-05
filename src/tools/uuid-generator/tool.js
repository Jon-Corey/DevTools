import { generateUUID } from '/assets/js/utils.js';

const uppercaseCheckbox = document.getElementById('uppercase');
const dashesCheckbox = document.getElementById('include-dashes');
const copyButton = document.getElementById('copy-button');
const regenerateButton = document.getElementById('regenerate-button');
const outputElement = document.getElementById('output');

const uppercaseKey = 'uuid-generator.uppercase';
const dashesKey = 'uuid-generator.include-dashes';

initialize();

function initialize() {
    // Load settings from localStorage
    const uppercase = (localStorage.getItem(uppercaseKey) || 'false') === 'true';
    const includeDashes = (localStorage.getItem(dashesKey) || 'true') === 'true';

    uppercaseCheckbox.checked = uppercase;
    dashesCheckbox.checked = includeDashes;

    // Add event listeners
    uppercaseCheckbox.addEventListener('change', () => {
        localStorage.setItem(uppercaseKey, uppercaseCheckbox.checked);
        updateUUID();
    });
    dashesCheckbox.addEventListener('change', () => {
        localStorage.setItem(dashesKey, dashesCheckbox.checked);
        updateUUID();
    });
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
