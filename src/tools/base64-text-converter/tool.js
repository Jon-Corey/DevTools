const inputContainer = document.getElementById('input-container');
const input = document.getElementById('input');
const validationMessage = document.getElementById('validation-message');
const conversionTypeSelect = document.getElementById('conversion');
const output = document.getElementById('output');
const copyButton = document.getElementById('copy-button');

const conversionTypeKey = 'base64-text-converter.conversionType';

initialize();

function initialize() {
    // Load settings from localStorage
    const conversionType = localStorage.getItem(conversionTypeKey) || 'encode-base64';
    conversionTypeSelect.value = conversionType;

    // Add event listeners
    input.addEventListener('input', convert);
    conversionTypeSelect.addEventListener('change', () => {
        localStorage.setItem(conversionTypeKey, conversionTypeSelect.value);
        convert();
    });
    copyButton.addEventListener('click', copyToClipboard);

    // Hide copy button if clipboard API is not available
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        copyButton.style.display = 'none';
    }
}

function convert() {
    const text = input.value;
    const conversionType = conversionTypeSelect.value;
    const isValid = checkInputValidity();

    if (!isValid) {
        output.textContent = '';
        return;
    }

    if (conversionType === 'encode-base64') {
        output.textContent = encodeToBase64(text);
    } else if (conversionType === 'encode-url-safe') {
        output.textContent = encodeToBase64Url(text);
    } else if (conversionType === 'decode') {
        output.textContent = decodeBase64(text);
    }
}

function checkInputValidity() {
    const text = input.value;
    const conversionType = conversionTypeSelect.value;

    if (text === '') {
        inputContainer.classList.remove('invalid');
        validationMessage.textContent = '';
        return false;
    }

    if (conversionType === 'decode' && isBase64(text) === false && isBase64Url(text) === false) {
        inputContainer.classList.add('invalid');
        validationMessage.textContent = 'Input is not valid Base64.';
        return false;
    }

    inputContainer.classList.remove('invalid');
    validationMessage.textContent = '';
    return true;
}

function isBase64(text) {
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(text) && text.length % 4 === 0;
}

function isBase64Url(text) {
    const urlSafeBase64Regex = /^[A-Za-z0-9\-_]+={0,2}$/;
    return urlSafeBase64Regex.test(text) && text.length % 4 !== 1;
}

function encodeToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    const binaryString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
}

function encodeToBase64Url(text) {
    const base64 = encodeToBase64(text);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64(text) {
    if (isBase64Url(text)) {
        text = text.replace(/-/g, '+').replace(/_/g, '/');
        while (text.length % 4) {
            text += '=';
        }
    }

    const binaryString = atob(text);
    const bytes = Uint8Array.from(binaryString, m => m.codePointAt(0));
    return new TextDecoder().decode(bytes);
}

async function copyToClipboard() {
    const text = output.textContent;
    await navigator.clipboard.writeText(text);
    copyButton.classList.add('show-alternate-content');
    setTimeout(() => {
        copyButton.classList.remove('show-alternate-content');
    }, 1000);
}
