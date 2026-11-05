const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const errorMessage = document.getElementById('error-message');
const aspectRatioOutput = document.getElementById('aspect-ratio');
const decimalAspectRatioOutput = document.getElementById('decimal-aspect-ratio');
const closestCommonAspectRatioOutput = document.getElementById('closest-common-aspect-ratio');
const closestCommonAspectRatioDifferenceOutput = document.getElementById('closest-common-aspect-ratio-difference');

const commonAspectRatios = [
    [1, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [3, 5],
    [4, 5],
    [5, 7],
    [9, 16],
    [9, 21],
    [9, 32],
    [10, 16]
];
for (const ratio of [...commonAspectRatios]) {
    if (ratio[0] !== ratio[1]) {
        commonAspectRatios.push([ratio[1], ratio[0]]);
    }
}

initialize();

function initialize() {
    // Add event listeners
    widthInput.addEventListener('input', updateAspectRatio);
    heightInput.addEventListener('input', updateAspectRatio);
}

function updateAspectRatio() {
    const width = Number(widthInput.value);
    const height = Number(heightInput.value);

    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 0 || height < 0) {
        errorMessage.style.display = 'block';
        resetOutputs();
        return;
    }
    errorMessage.style.display = '';

    if (width === 0 || height === 0) {
        resetOutputs();
        return;
    }

    const divisor = getGreatestCommonDivisor(width, height);
    aspectRatioOutput.textContent = `${width / divisor}:${height / divisor}`;

    const decimalRatio = width / height;
    decimalAspectRatioOutput.textContent = formatNumber(decimalRatio, 4);

    let closestRatio = commonAspectRatios[0];
    let smallestDifference = getRatioDifference(decimalRatio, closestRatio[0] / closestRatio[1]);

    for (const ratio of commonAspectRatios) {
        const difference = getRatioDifference(decimalRatio, ratio[0] / ratio[1]);
        if (difference < smallestDifference) {
            closestRatio = ratio;
            smallestDifference = difference;
        }
    }

    if (smallestDifference > 0.5) {
        closestCommonAspectRatioOutput.textContent = 'None';
        closestCommonAspectRatioDifferenceOutput.textContent = '';
        return;
    }

    closestCommonAspectRatioOutput.textContent = `${closestRatio[0]}:${closestRatio[1]}`;
    if (smallestDifference === 0) {
        closestCommonAspectRatioDifferenceOutput.textContent = '(exact match)';
    } else {
        closestCommonAspectRatioDifferenceOutput.textContent = `(${formatNumber(smallestDifference * 100, 2)}% difference)`;
    }
}

function getRatioDifference(a, b) {
    return 1 - Math.min(a, b) / Math.max(a, b);
}

function getGreatestCommonDivisor(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}

function formatNumber(value, decimals) {
    let formatted = value.toFixed(decimals).replace(/\.?0+$/, '');

    if (value > 0 && formatted === '0') {
        formatted = `< 0.${'0'.repeat(decimals - 1)}1`;
    }

    return formatted;
}

function resetOutputs() {
    aspectRatioOutput.textContent = '-';
    decimalAspectRatioOutput.textContent = '-';
    closestCommonAspectRatioOutput.textContent = '-';
    closestCommonAspectRatioDifferenceOutput.textContent = '';
}
