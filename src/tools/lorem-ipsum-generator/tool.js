const numberInput = document.getElementById('number');
const typeSelect = document.getElementById('type');
const startWithLoremIpsumCheckbox = document.getElementById('start-with-lorem-ipsum');

const regenerateButton = document.getElementById('regenerate-button');
const copyButton = document.getElementById('copy-button');
const outputElement = document.getElementById('output');

const words = [
    'ad', 'adipiscing', 'aliqua', 'aliquid', 'amet', 'anim',
    'assumenda', 'aute', 'cillum', 'commod', 'consectetur',
    'consequat', 'culpa', 'cupiditat', 'de', 'deserunt',
    'disti', 'do', 'dolor', 'dolore', 'duis', 'ea', 'eius',
    'elige', 'elit', 'enim', 'er', 'esse', 'est', 'et', 'eu',
    'ex', 'exceptur', 'exercitation', 'expedit', 'facer',
    'facilis', 'fugiat', 'harum', 'id', 'in', 'incididunt',
    'ipsum', 'irure', 'labore', 'laboris', 'laborum', 'liber',
    'lorem', 'magna', 'maxim', 'minim', 'mod', 'mollit', 'nam',
    'nisi', 'nobis', 'non', 'nostrud', 'nulla', 'obcaecat',
    'officia', 'omnis', 'pariatur', 'placeat', 'possim',
    'proident', 'qui', 'quis', 'quod', 'repellenda',
    'reprehenderit', 'reud', 'sed', 'sint', 'sit', 'soluta',
    'sunt', 'tempor', 'ullamco', 'ut', 'velit', 'veniam',
    'volupt', 'voluptate'
];
const sentenceEndPunctuation = ['.', '.', '.', '.', '.', '!', '?'];
const sentenceMiddlePunctuation = [',', ',', ',', ',', ';', ' —'];
const intro = 'lorem ipsum dolor sit amet, ';

const wordsPerSentence = { min: 8, max: 15 };
const sentencesPerParagraph = { min: 3, max: 7 };

// Set maximum limits to prevent performance issues
const maxWords = 100000;
const maxSentences = 10000;
const maxParagraphs = 1000;

const numberKey = 'lorem-ipsum-generator.number';
const typeKey = 'lorem-ipsum-generator.type';
const startWithLoremIpsumKey = 'lorem-ipsum-generator.start-with-lorem-ipsum';

initialize();

function initialize() {
    // Load settings from localStorage
    const savedNumber = (localStorage.getItem(numberKey) || '3');
    const savedType = (localStorage.getItem(typeKey) || 'sentences');
    const savedStartWithLoremIpsum = (localStorage.getItem(startWithLoremIpsumKey) || 'true') === 'true';

    numberInput.value = savedNumber;
    typeSelect.value = savedType;
    startWithLoremIpsumCheckbox.checked = savedStartWithLoremIpsum;

    // Add event listeners
    numberInput.addEventListener('input', () => {
        localStorage.setItem(numberKey, numberInput.value);
        generateLoremIpsum();
    });
    typeSelect.addEventListener('change', () => {
        localStorage.setItem(typeKey, typeSelect.value);
        generateLoremIpsum();
    });
    startWithLoremIpsumCheckbox.addEventListener('change', () => {
        localStorage.setItem(startWithLoremIpsumKey, startWithLoremIpsumCheckbox.checked);
        generateLoremIpsum();
    });
    regenerateButton.addEventListener('click', generateLoremIpsum);
    copyButton.addEventListener('click', copyToClipboard);

    // Hide copy button if clipboard API is not available
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        copyButton.style.display = 'none';
    }

    // Generate initial output
    generateLoremIpsum();
}

// Generation functions

function generateLoremIpsum() {
    let number = parseInt(numberInput.value) || 1;
    const type = typeSelect.value;
    const startWithLoremIpsum = startWithLoremIpsumCheckbox.checked;

    // Enforce maximum limits
    if (type === 'words' && number > maxWords) {
        number = maxWords;
        numberInput.value = maxWords;
    }
    if (type === 'sentences' && number > maxSentences) {
        number = maxSentences;
        numberInput.value = maxSentences;
    }
    if (type === 'paragraphs' && number > maxParagraphs) {
        number = maxParagraphs;
        numberInput.value = maxParagraphs;
    }
    if (number < 1) {
        number = 1;
        numberInput.value = 1;
    }

    const output = [];

    if (type === 'paragraphs') {
        for (let i = 0; i < number; i++) {
            output.push(generateParagraph(startWithLoremIpsum));
        }
        outputElement.innerHTML = output.map(p => `<p>${p}</p>`).join('');
    } else if (type === 'sentences') {
        for (let i = 0; i < number; i++) {
            output.push(generateSentence(startWithLoremIpsum && i === 0));
        }
        outputElement.innerHTML = output.join(' ');
    } else if (type === 'words') {
        for (let i = 0; i < number; i++) {
            output.push(getRandomWord());
        }
        outputElement.innerHTML = output.join(' ');
    }
}

function generateParagraph(startWithLoremIpsum) {
    const sentenceCount = getRandomInt(sentencesPerParagraph.min, sentencesPerParagraph.max);
    let output = '';
    for (let i = 0; i < sentenceCount; i++) {
        output += generateSentence(startWithLoremIpsum && i === 0) + ' ';
    }
    return output.trim();
}

function generateSentence(startWithLoremIpsum) {
    let wordCount = getRandomInt(wordsPerSentence.min, wordsPerSentence.max);
    let output = '';

    if (startWithLoremIpsum) {
        output += intro;
        wordCount -= intro.split(' ').length;
    }

    for (let i = 0; i < wordCount; i++) {
        output += getRandomWord();

        if (Math.random() < 0.1 && i < wordCount - 1) {
            output += sentenceMiddlePunctuation[getRandomInt(0, sentenceMiddlePunctuation.length - 1)];
        }

        output += ' ';
    }

    output = output.trim();
    output = output.charAt(0).toUpperCase() + output.slice(1);
    output += sentenceEndPunctuation[getRandomInt(0, sentenceEndPunctuation.length - 1)];

    return output;
}

function getRandomWord() {
    const index = getRandomInt(0, words.length - 1);
    return words[index];
}

// Utility functions

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function copyToClipboard() {
    let text = '';

    if (typeSelect.value === 'paragraphs') {
        // For paragraphs, copy the text content while adding newlines between paragraphs
        text = Array.from(outputElement.querySelectorAll('p')).map(p => p.textContent).join('\n\n');
    } else {
        text = outputElement.textContent;
    }
    
    await navigator.clipboard.writeText(text);
    copyButton.classList.add('show-alternate-content');
    setTimeout(() => {
        copyButton.classList.remove('show-alternate-content');
    }, 1000);
}
