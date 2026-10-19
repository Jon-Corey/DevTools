import { getContrastRatio, adjustToTargetContrast, formatAsHexWithoutAlpha } from '/assets/js/utils.js';

const foregroundColorInput = document.getElementById('foreground-color');
const fixForeground45Button = document.getElementById('fix-foreground-4-5');
const fixForeground7Button = document.getElementById('fix-foreground-7');

const backgroundColorInput = document.getElementById('background-color');
const fixBackground45Button = document.getElementById('fix-background-4-5');
const fixBackground7Button = document.getElementById('fix-background-7');

const switchColorsButton = document.getElementById('switch-colors-button');

const contrastRatioElement = document.getElementById('contrast-ratio');

const normalTextAaResultElement = document.getElementById('normal-text-aa-result');
const normalTextAaaResultElement = document.getElementById('normal-text-aaa-result');
const normalTextPreviewElement = document.getElementById('normal-text-preview');

const largeTextAaResultElement = document.getElementById('large-text-aa-result');
const largeTextAaaResultElement = document.getElementById('large-text-aaa-result');
const largeTextPreviewElement = document.getElementById('large-text-preview');

const uiAaResultElement = document.getElementById('ui-aa-result');
const uiPreviewElement = document.getElementById('ui-preview');

const foregroundColorKey = 'contrast-checker.foreground-color';
const backgroundColorKey = 'contrast-checker.background-color';

initialize();

function initialize() {
    // Load settings from localStorage
    foregroundColorInput.value = localStorage.getItem(foregroundColorKey) || '#000000';
    backgroundColorInput.value = localStorage.getItem(backgroundColorKey) || '#ffffff';

    // Add event listeners
    foregroundColorInput.addEventListener('change', foregroundColorInputChanged);
    backgroundColorInput.addEventListener('change', backgroundColorInputChanged);
    switchColorsButton.addEventListener('click', switchColors);
    fixForeground45Button.addEventListener('click', () => fixForeground(4.5));
    fixForeground7Button.addEventListener('click', () => fixForeground(7));
    fixBackground45Button.addEventListener('click', () => fixBackground(4.5));
    fixBackground7Button.addEventListener('click', () => fixBackground(7));

    updateContrastResults();
}

// Event Handlers

function foregroundColorInputChanged() {
    localStorage.setItem(foregroundColorKey, foregroundColorInput.value);

    updateContrastResults();
}

function backgroundColorInputChanged() {
    localStorage.setItem(backgroundColorKey, backgroundColorInput.value);

    updateContrastResults();
}

function switchColors() {
    const tempColor = foregroundColorInput.value;
    foregroundColorInput.value = backgroundColorInput.value;
    backgroundColorInput.value = tempColor;

    localStorage.setItem(foregroundColorKey, foregroundColorInput.value);
    localStorage.setItem(backgroundColorKey, backgroundColorInput.value);

    updateContrastResults();
}

function fixForeground(targetRatio) {
    foregroundColorInput.value = adjustToTargetContrast(foregroundColorInput.value, backgroundColorInput.value, targetRatio).color;
    localStorage.setItem(foregroundColorKey, foregroundColorInput.value);

    updateContrastResults();
}

function fixBackground(targetRatio) {
    backgroundColorInput.value = adjustToTargetContrast(backgroundColorInput.value, foregroundColorInput.value, targetRatio).color;
    localStorage.setItem(backgroundColorKey, backgroundColorInput.value);

    updateContrastResults();
}

function updateContrastResults() {
    const contrastRatio = getContrastRatio(foregroundColorInput.value, backgroundColorInput.value);
    contrastRatioElement.textContent = contrastRatio + ':1';

    // Pass/Fail results
    normalTextAaResultElement.classList.toggle('show-alternate-content', contrastRatio < 4.5);
    normalTextAaaResultElement.classList.toggle('show-alternate-content', contrastRatio < 7);
    largeTextAaResultElement.classList.toggle('show-alternate-content', contrastRatio < 3);
    largeTextAaaResultElement.classList.toggle('show-alternate-content', contrastRatio < 4.5);
    uiAaResultElement.classList.toggle('show-alternate-content', contrastRatio < 3);

    // Previews
    normalTextPreviewElement.style.color = formatAsHexWithoutAlpha(foregroundColorInput.value);
    normalTextPreviewElement.style.backgroundColor = formatAsHexWithoutAlpha(backgroundColorInput.value);
    largeTextPreviewElement.style.color = formatAsHexWithoutAlpha(foregroundColorInput.value);
    largeTextPreviewElement.style.backgroundColor = formatAsHexWithoutAlpha(backgroundColorInput.value);
    uiPreviewElement.style.color = formatAsHexWithoutAlpha(foregroundColorInput.value);
    uiPreviewElement.style.backgroundColor = formatAsHexWithoutAlpha(backgroundColorInput.value);

    // Enable/disable fix buttons
    fixForeground45Button.disabled = contrastRatio >= 4.5 || adjustToTargetContrast(foregroundColorInput.value, backgroundColorInput.value, 4.5).hitTarget === false;
    fixForeground7Button.disabled = contrastRatio >= 7 || adjustToTargetContrast(foregroundColorInput.value, backgroundColorInput.value, 7).hitTarget === false;
    fixBackground45Button.disabled = contrastRatio >= 4.5 || adjustToTargetContrast(backgroundColorInput.value, foregroundColorInput.value, 4.5).hitTarget === false;
    fixBackground7Button.disabled = contrastRatio >= 7 || adjustToTargetContrast(backgroundColorInput.value, foregroundColorInput.value, 7).hitTarget === false;
}
