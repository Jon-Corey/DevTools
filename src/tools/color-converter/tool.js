import { colordx, extend } from '/assets/js/vendor/colordx/colordx.js';
import lab from '/assets/js/vendor/colordx/lab.js';
import lch from '/assets/js/vendor/colordx/lch.js';
import cmyk from '/assets/js/vendor/colordx/cmyk.js';
import hsv from '/assets/js/vendor/colordx/hsv.js';
import hwb from '/assets/js/vendor/colordx/hwb.js';
import p3 from '/assets/js/vendor/colordx/p3.js';
import rec2020 from '/assets/js/vendor/colordx/rec2020.js';
import a98rgb from '/assets/js/vendor/colordx/a98rgb.js';
import prophoto from '/assets/js/vendor/colordx/prophoto.js';
import names from '/assets/js/vendor/colordx/names.js';

extend([lab, lch, cmyk, hsv, hwb, p3, rec2020, a98rgb, prophoto, names]);

const colorInput = document.getElementById('color-input');
const outputTable = document.getElementById('output-table');
const outputHex = document.getElementById('output-hex');
const outputRgb = document.getElementById('output-rgb');
const outputHsl = document.getElementById('output-hsl');
const outputHsv = document.getElementById('output-hsv');
const outputHwb = document.getElementById('output-hwb');
const outputLab = document.getElementById('output-lab');
const outputLch = document.getElementById('output-lch');
const outputOklab = document.getElementById('output-oklab');
const outputOklch = document.getElementById('output-oklch');
const outputP3 = document.getElementById('output-p3');
const outputXyz = document.getElementById('output-xyz');
const outputXyzD65 = document.getElementById('output-xyz-d65');
const outputCmyk = document.getElementById('output-cmyk');
const outputRec2020 = document.getElementById('output-rec2020');
const outputA98rgb = document.getElementById('output-a98rgb');
const outputProphoto = document.getElementById('output-prophoto');
const outputCssName = document.getElementById('output-css-name');

const copyButtons = document.querySelectorAll('button[data-copy-target]');

initialize();

function initialize() {
    // Add event listeners
    colorInput.addEventListener('change', colorInputChanged);
    copyButtons.forEach(button => {
        button.addEventListener('click', copyButtonClicked);
    });

    // Hide copy buttons if clipboard API is not available
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        outputTable.classList.add('copy-unavailable');
    }

    colorInputChanged();
}

// Event Handlers

function colorInputChanged() {
    const colorValue = colorInput.value;
    const color = colordx(colorValue);

    outputHex.textContent = color.toHex();
    outputRgb.textContent = color.toRgbString();
    outputHsl.textContent = color.toHslString();
    outputHsv.textContent = color.toHsvString();
    outputHwb.textContent = color.toHwbString();
    outputLab.textContent = color.toLabString();
    outputLch.textContent = color.toLchString();
    outputOklab.textContent = color.toOklabString();
    outputOklch.textContent = color.toOklchString();
    outputP3.textContent = color.toP3String();
    outputXyz.textContent = color.toXyzString();
    outputXyzD65.textContent = color.toXyzD65String();
    outputCmyk.textContent = color.toCmykString();
    outputRec2020.textContent = color.toRec2020String();
    outputA98rgb.textContent = color.toA98String();
    outputProphoto.textContent = color.toProphotoString();
    outputCssName.textContent = color.toName({ closest: true });
}

async function copyButtonClicked(event) {
    const button = event.currentTarget;
    const targetId = button.getAttribute('data-copy-target');
    const targetElement = document.getElementById(targetId);
    const colorValue = targetElement.textContent;

    await navigator.clipboard.writeText(colorValue);
    button.classList.add('show-alternate-content');
    setTimeout(() => {
        button.classList.remove('show-alternate-content');
    }, 1000);
}
