import { colordx, extend, getFormat } from '/assets/js/vendor/colordx/colordx.js';
import names from '/assets/js/vendor/colordx/names.js';
import a11y from '/assets/js/vendor/colordx/a11y.js';

extend([names, a11y]);

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
    const contrastRatio = colordx(foregroundColorInput.value).contrast(colordx(backgroundColorInput.value));
    contrastRatioElement.textContent = contrastRatio.toFixed(2) + ':1';

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

// Utility Functions

function formatAsHexWithoutAlpha(color, defaultColor = '#000000') {
    let colorObject = colordx(color);

    if (colorObject.isValid() === false) {
        return defaultColor;
    }

    colorObject = colorObject.alpha(1);

    return colorObject.toHex();
}

function adjustToTargetContrast(adjustColor, fixedColor, targetRatio) {
    const step = 0.01;
    const white = '#ffffff';
    const black = '#000000';

    const colorFormat = getFormat(adjustColor);

    const adjustColordx = colordx(adjustColor);
    const fixedColordx = colordx(fixedColor);
    
    let lightenedColor = adjustColordx;
    let darkenedColor = adjustColordx;

    while (lightenedColor.contrast(fixedColordx) < targetRatio
        && darkenedColor.contrast(fixedColordx) < targetRatio) {
        lightenedColor = lightenedColor.lighten(step);
        darkenedColor = darkenedColor.darken(step);

        if (formatAsHexWithoutAlpha(lightenedColor) === white && formatAsHexWithoutAlpha(darkenedColor) === black) {
            // We've reached both ends of the spectrum without hitting the target ratio
            break;
        }
    }

    const lightenedContrast = lightenedColor.contrast(fixedColordx);
    const darkenedContrast = darkenedColor.contrast(fixedColordx);

    if (lightenedContrast >= darkenedContrast) {
        const outputColor = convertColorToFormat(lightenedColor, colorFormat);
        return { hitTarget: lightenedContrast >= targetRatio, color: outputColor };
    } else {
        const outputColor = convertColorToFormat(darkenedColor, colorFormat);
        return { hitTarget: darkenedContrast >= targetRatio, color: outputColor };
    }
}

function convertColorToFormat(colordx, format) {
    switch (format) {
        case 'rgb':
            return colordx.toRgbString();
        case 'hsl':
            return colordx.toHslString(3);
        case 'oklch':
            return colordx.toOklchString(3);
        case 'oklab':
            return colordx.toOklabString(3);
        default:
            return colordx.toHex();
    }
}
