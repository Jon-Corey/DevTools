import { optimize } from '/assets/js/vendor/svgo/svgo.js';
import QrCodeWithLogo from '/assets/js/vendor/qrcode-with-logos/qrcode-with-logos.js';
import { transformImage, compressImage } from '/assets/js/magick-utils.js';
import { getContrastRatio, adjustToTargetContrast, convertFileToBase64, downloadFile, getFileExtension } from '/assets/js/utils.js';

const tabPanel = document.getElementById('tab-panel');

const urlInput = document.getElementById('url');

const textInput = document.getElementById('text');

const wifiSsidInput = document.getElementById('wifi-ssid');
const wifiHiddenCheckbox = document.getElementById('wifi-hidden');
const wifiSecurityTypeSelect = document.getElementById('wifi-security-type');
const wifiPasswordInput = document.getElementById('wifi-password');

const emailAddressInput = document.getElementById('email-address');
const emailSubjectInput = document.getElementById('email-subject');
const emailBodyInput = document.getElementById('email-body');
const smsNumberInput = document.getElementById('sms-number');
const smsMessageInput = document.getElementById('sms-message');

const phoneNumberInput = document.getElementById('phone-number');

const vcardGivenNameInput = document.getElementById('vcard-given-name');
const vcardFamilyNameInput = document.getElementById('vcard-family-name');
const vcardPrefixInput = document.getElementById('vcard-prefix');
const vcardSuffixInput = document.getElementById('vcard-suffix');
const vcardFullNameInput = document.getElementById('vcard-full-name');
const vcardPhoneInput = document.getElementById('vcard-phone');
const vcardEmailInput = document.getElementById('vcard-email');
const vcardWebsiteInput = document.getElementById('vcard-website');
const vcardOrganizationInput = document.getElementById('vcard-organization');
const vcardTitleInput = document.getElementById('vcard-title');

const foregroundColorInput = document.getElementById('foreground-color');
const backgroundColorInput = document.getElementById('background-color');
const contrastOutput = document.getElementById('contrast');
const fixForegroundColorButton = document.getElementById('fix-foreground-color');
const fixBackgroundColorButton = document.getElementById('fix-background-color');
const styleSelect = document.getElementById('style');

const imageInput = document.getElementById('image');

const outputCard = document.getElementById('output-card');
const errorContainer = document.getElementById('error-container');
const errorMessageElement = document.getElementById('error-message');
const previewImg = document.getElementById('preview');
const downloadPngButton = document.getElementById('download-png');
const downloadSvgButton = document.getElementById('download-svg');
const outputContainer = document.getElementById('output-container');
const noOutputMessage = document.getElementById('no-output-message');

const tabNames = {
    url: 'URL / Link',
    wifi: 'Wi-Fi',
    email: 'Email',
    sms: 'SMS',
    phone: 'Phone',
    text: 'Plain Text',
    vcard: 'Contact / vCard'
}
const styles = {
    square: {
        dots: 'square',
        corners: 'square'
    },
    rounded: {
        dots: 'rounded',
        corners: 'rounded'
    },
    fluid: {
        dots: 'fluid',
        corners: 'rounded'
    },
    dots: {
        dots: 'dot',
        corners: 'circle'
    }
}

let debounceTimeoutId;
let fullNameEdited = false;

initialize();

function initialize() {
    tabPanel.addEventListener('change', () => debounceInputChanged());

    urlInput.addEventListener('input', () => debounceInputChanged());

    textInput.addEventListener('input', () => debounceInputChanged());

    wifiSsidInput.addEventListener('input', () => debounceInputChanged());
    wifiHiddenCheckbox.addEventListener('input', () => debounceInputChanged());
    wifiSecurityTypeSelect.addEventListener('input', () => {
        wifiPasswordInput.disabled = wifiSecurityTypeSelect.value === 'nopass';
        debounceInputChanged();
    });
    wifiPasswordInput.addEventListener('input', () => debounceInputChanged());

    emailAddressInput.addEventListener('input', () => debounceInputChanged());
    emailSubjectInput.addEventListener('input', () => debounceInputChanged());
    emailBodyInput.addEventListener('input', () => debounceInputChanged());

    smsNumberInput.addEventListener('input', () => debounceInputChanged());
    smsMessageInput.addEventListener('input', () => debounceInputChanged());

    phoneNumberInput.addEventListener('input', () => debounceInputChanged());

    vcardGivenNameInput.addEventListener('input', () => debounceInputChanged(true));
    vcardFamilyNameInput.addEventListener('input', () => debounceInputChanged(true));
    vcardPrefixInput.addEventListener('input', () => debounceInputChanged(true));
    vcardSuffixInput.addEventListener('input', () => debounceInputChanged(true));
    vcardFullNameInput.addEventListener('input', () => {
        fullNameEdited = true;
        debounceInputChanged();
    });
    vcardPhoneInput.addEventListener('input', () => debounceInputChanged());
    vcardEmailInput.addEventListener('input', () => debounceInputChanged());
    vcardWebsiteInput.addEventListener('input', () => debounceInputChanged());
    vcardOrganizationInput.addEventListener('input', () => debounceInputChanged());
    vcardTitleInput.addEventListener('input', () => debounceInputChanged());

    foregroundColorInput.addEventListener('change', () => debounceInputChanged());
    backgroundColorInput.addEventListener('change', () => debounceInputChanged());
    fixForegroundColorButton.addEventListener('click', fixForegroundColor);
    fixBackgroundColorButton.addEventListener('click', fixBackgroundColor);
    styleSelect.addEventListener('input', () => debounceInputChanged());

    imageInput.addEventListener('change', () => debounceInputChanged());

    downloadPngButton.addEventListener('click', downloadPng);
    downloadSvgButton.addEventListener('click', downloadSvg);
}

// Event Handlers

function debounceInputChanged(updateFullName = false) {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = setTimeout(async () => {
        await inputChanged(updateFullName);
    }, 100);
}

async function inputChanged(updateFullName = false) {
    // Auto-update full name if it hasn't been manually edited
    if (vcardFullNameInput.value.trim() === '') {
        fullNameEdited = false;
    }
    if (!fullNameEdited && updateFullName) {
        vcardFullNameInput.value = generateFullName();
    }

    // Update the contrast display and buttons
    const foregroundColor = foregroundColorInput.value;
    const backgroundColor = backgroundColorInput.value;
    const contrastRatio = getContrastRatio(foregroundColor, backgroundColor);
    let contrastDescription = '';
    switch (true) {
        case contrastRatio >= 10:
            contrastDescription = '<i class="ti ti-check text-success"></i> Excellent';
            break;
        case contrastRatio >= 7:
            contrastDescription = '<i class="ti ti-check text-success"></i> Good';
            break;
        case contrastRatio >= 4.5:
            contrastDescription = '<i class="ti ti-minus text-warning"></i> Fair';
            break;
        case contrastRatio >= 3:
            contrastDescription = '<i class="ti ti-x text-danger"></i> Poor';
            break;
        default:
            contrastDescription = '<i class="ti ti-x text-danger"></i> Bad';
            break;
    }

    contrastOutput.innerHTML = `${contrastRatio} (${contrastDescription})`;

    fixForegroundColorButton.disabled = getContrastRatio(foregroundColor, backgroundColor) >= 7 || adjustToTargetContrast(foregroundColor, backgroundColor, 7).hitTarget === false;
    fixBackgroundColorButton.disabled = getContrastRatio(foregroundColor, backgroundColor) >= 7 || adjustToTargetContrast(backgroundColor, foregroundColor, 7).hitTarget === false;

    // Get the QR code text content based on the current tab
    const qrCodeTextContent = getQrCodeTextContent();

    // Update the QR code preview with the new content
    await updateQrCodePreview(qrCodeTextContent);
}

function fixForegroundColor() {
    foregroundColorInput.value = adjustToTargetContrast(foregroundColorInput.value, backgroundColorInput.value, 7).color;
    inputChanged();
}

function fixBackgroundColor() {
    backgroundColorInput.value = adjustToTargetContrast(backgroundColorInput.value, foregroundColorInput.value, 7).color;
    inputChanged();
}

async function downloadPng() {
    const content = getQrCodeTextContent();
    if (content.trim() === '') {
        return;
    }

    const foregroundColor = foregroundColorInput.valueAsHex;
    const backgroundColor = backgroundColorInput.valueAsHex;
    const dotsStyle = styles[styleSelect.value].dots;
    const cornersStyle = styles[styleSelect.value].corners;

    const config = {
        content: content,
        width: 1000,
        download: true,
        downloadName: 'qr-code.png',
        dotsOptions: {
            color: foregroundColor,
            type: dotsStyle
        },
        cornersOptions: {
            color: foregroundColor,
            type: cornersStyle
        },
        nodeQrCodeOptions: {
            margin: 20,
            color: {
                dark: foregroundColor,
                light: backgroundColor
            }
        }
    };

    if (imageInput.file) {
        const logoUrl = await getLogoUrlForRasterQrCode(imageInput.file);
        config.logo = {
            src: logoUrl,
            bgColor: backgroundColor
        };

        if (dotsStyle === 'square') {
            config.logo.borderRadius = 0;
        }
    }

    new QrCodeWithLogo(config);
}

async function downloadSvg() {
    const content = getQrCodeTextContent();
    if (content.trim() === '') {
        return;
    }

    const foregroundColor = foregroundColorInput.valueAsHex;
    const backgroundColor = backgroundColorInput.valueAsHex;
    const dotsStyle = styles[styleSelect.value].dots;
    const cornersStyle = styles[styleSelect.value].corners;

    const config = {
        content: content,
        width: 1000,
        renderer: 'svg',
        dotsOptions: {
            color: foregroundColor,
            type: dotsStyle
        },
        cornersOptions: {
            color: foregroundColor,
            type: cornersStyle
        },
        nodeQrCodeOptions: {
            margin: 20,
            color: {
                dark: foregroundColor,
                light: backgroundColor
            }
        }
    };

    if (imageInput.file) {
        const logoUrl = await convertFileToBase64(imageInput.file);
        config.logo = {
            src: logoUrl,
            bgColor: backgroundColor
        };

        if (dotsStyle === 'square') {
            config.logo.borderRadius = 0;
        }

        // Optimize logo image
        if (getFileExtension(imageInput.file.name) === 'svg') {
            const optimizedSvgLogoFile = await optimizeSVG(imageInput.file);
            const optimizedLogoUrl = await convertFileToBase64(optimizedSvgLogoFile);
            config.logo.src = optimizedLogoUrl;
        } else {
            const testQrCode = new QrCodeWithLogo(config);

            const testSvgContent = await testQrCode.getSvgString();
            const { width, height } = getEmbeddedImageDimensions(testSvgContent);

            const shrunkImage = await transformImage(imageInput.file, {
                width: width,
                height: height,
                format: 'jpeg',
                backgroundColor: backgroundColor
            });
            const compressedImage = await compressImage(shrunkImage);
            const compressedLogoUrl = await convertFileToBase64(compressedImage);

            config.logo.src = compressedLogoUrl;
        }
    }

    const qrCode = new QrCodeWithLogo(config);
    const svgContent = await qrCode.getSvgString();

    const svgFile = new File([svgContent], 'qr-code.svg', { type: 'image/svg+xml' });
    const optimizedSvgFile = await optimizeSVG(svgFile);
    downloadFile(optimizedSvgFile);
}

// Utility Functions

function getQrCodeTextContent() {
    const tabName = tabPanel.currentTabName;

    if (tabName === tabNames.url) {
        return normalizeUrl(urlInput.value);
    } else if (tabName === tabNames.text) {
        return textInput.value;
    } else if (tabName === tabNames.wifi) {
        if (wifiSsidInput.value.trim() === '') {
            return '';
        }
        const ssid = wifiSsidInput.value;
        const hidden = wifiHiddenCheckbox.checked;
        const security = wifiSecurityTypeSelect.value;
        const password = wifiPasswordInput.value;

        let content = `WIFI:T:${security};S:${escapeWifiValue(ssid)};`;
        if (security !== 'nopass') {
            if (password === '') {
                return '';
            }
            content += `P:${escapeWifiValue(password)};`;
        }
        if (hidden) {
            content += `H:true;`;
        }
        content += ';';
        return content;
    } else if (tabName === tabNames.email) {
        const address = emailAddressInput.value.trim();
        if (address === '') {
            return '';
        }

        const params = [];
        if (emailSubjectInput.value !== '') {
            params.push(`subject=${encodeURIComponent(emailSubjectInput.value)}`);
        }
        if (emailBodyInput.value !== '') {
            params.push(`body=${encodeURIComponent(emailBodyInput.value)}`);
        }

        const encodedAddress = encodeURIComponent(address).replace(/%40/g, '@');
        return `mailto:${encodedAddress}${params.length > 0 ? '?' + params.join('&') : ''}`;
    } else if (tabName === tabNames.sms) {
        const number = normalizePhoneNumber(smsNumberInput.value);
        if (number === '') {
            return '';
        }
        const message = smsMessageInput.value;
        return `sms:${number}${message !== '' ? '?body=' + encodeURIComponent(message) : ''}`;
    } else if (tabName === tabNames.phone) {
        const number = normalizePhoneNumber(phoneNumberInput.value);
        if (number === '') {
            return '';
        }
        return `tel:${number}`;
    } else if (tabName === tabNames.vcard) {
        const fullName = vcardFullNameInput.value;
        const prefix = vcardPrefixInput.value;
        const givenName = vcardGivenNameInput.value;
        const familyName = vcardFamilyNameInput.value;
        const suffix = vcardSuffixInput.value;
        const phone = vcardPhoneInput.value;
        const email = vcardEmailInput.value;
        const website = vcardWebsiteInput.value.trim();
        const organization = vcardOrganizationInput.value;
        const title = vcardTitleInput.value;

        if (fullName.trim() === '') {
            return '';
        }

        // vCard 3.0 requires both FN and N
        const lines = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${escapeVCardText(fullName)}`,
            `N:${escapeVCardText(familyName)};${escapeVCardText(givenName)};;${escapeVCardText(prefix)};${escapeVCardText(suffix)}`
        ];
        if (phone) {
            lines.push(`TEL:${escapeVCardText(phone)}`);
        }
        if (email) {
            lines.push(`EMAIL:${escapeVCardText(email)}`);
        }
        if (website) {
            // URL is a URI value, not a text value, so it must not be escaped (only line breaks are removed)
            lines.push(`URL:${website.replace(/[\r\n]+/g, '')}`);
        }
        if (organization) {
            lines.push(`ORG:${escapeVCardText(organization)}`);
        }
        if (title) {
            lines.push(`TITLE:${escapeVCardText(title)}`);
        }
        lines.push('END:VCARD');
        return lines.join('\r\n');
    }
    return '';
}

/**
 * Trims a URL and adds https:// if it doesn't already have a scheme.
 */
function normalizeUrl(url) {
    const trimmed = url.trim();
    if (trimmed === '') {
        return '';
    }

    // A scheme followed by only a port number (e.g. "localhost:3000") is a host, not a scheme
    if (/^[a-z][a-z0-9+.-]*:(?!\d+(?:[/?#]|$))/i.test(trimmed)) {
        return trimmed;
    }
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }
    return `https://${trimmed}`;
}

function normalizePhoneNumber(number) {
    return number.replace(/[\s\-.()]/g, '');
}

function escapeWifiValue(text) {
    const escaped = text.replace(/[\\;,:"]/g, '\\$&');
    // Values that are only hex digits must be quoted so they aren't parsed as hex-encoded strings
    return /^[0-9a-f]+$/i.test(text) ? `"${escaped}"` : escaped;
}

function escapeVCardText(text) {
    return text
        .replace(/[\\;,]/g, '\\$&')
        .replace(/\r\n|\r|\n/g, '\\n');
}

function generateFullName() {
    const prefix = vcardPrefixInput.value.trim();
    const givenName = vcardGivenNameInput.value.trim();
    const familyName = vcardFamilyNameInput.value.trim();
    const suffix = vcardSuffixInput.value.trim();

    const fullName = [prefix, givenName, familyName, suffix].filter(Boolean).join(' ');
    return fullName;
}

async function updateQrCodePreview(content) {
    if (content.trim() === '') {
        outputCard.classList.remove('danger');
        errorContainer.style.display = 'none';
        outputContainer.style.display = 'none';
        noOutputMessage.style.display = '';
        previewImg.src = '';
        return;
    }

    const foregroundColor = foregroundColorInput.valueAsHex;
    const backgroundColor = backgroundColorInput.valueAsHex;
    const dotsStyle = styles[styleSelect.value].dots;
    const cornersStyle = styles[styleSelect.value].corners;

    const config = {
        content: content,
        width: 1000,
        image: previewImg,
        dotsOptions: {
            color: foregroundColor,
            type: dotsStyle
        },
        cornersOptions: {
            color: foregroundColor,
            type: cornersStyle
        },
        nodeQrCodeOptions: {
            margin: 20,
            color: {
                dark: foregroundColor,
                light: backgroundColor
            }
        },
        onError: showError
    };

    if (imageInput.file) {
        const logoUrl = await getLogoUrlForRasterQrCode(imageInput.file);
        config.logo = {
            src: logoUrl,
            bgColor: backgroundColor
        };

        if (dotsStyle === 'square') {
            config.logo.borderRadius = 0;
        }
    }

    outputCard.classList.remove('danger');
    errorContainer.style.display = 'none';
    outputContainer.style.display = '';
    noOutputMessage.style.display = 'none';
    new QrCodeWithLogo(config);
}

function showError(error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (/amount of data is too big/i.test(errorMessage)) {
        errorMessageElement.innerText = 'The amount of data is too big for a QR code. Reduce the amount of content and try again.';
    } else {
        errorMessageElement.innerText = 'An unexpected error occurred: ' + errorMessage;
    }
    errorContainer.style.display = '';
    outputContainer.style.display = 'none';
    noOutputMessage.style.display = 'none';
    outputCard.classList.add('danger');
}

async function getLogoUrlForRasterQrCode(file) {
    const compatibleFile = await transformImage(file, {
        width: 400,
        height: 400,
        format: 'png'
    });
    return await convertFileToBase64(compatibleFile);
}

function getEmbeddedImageDimensions(svgContent) {
    const widthRegex = /<image\s[^>]*width="([0-9]+)"/;
    const heightRegex = /<image\s[^>]*height="([0-9]+)"/;

    const widthMatch = svgContent.match(widthRegex);
    const heightMatch = svgContent.match(heightRegex);

    const width = widthMatch ? parseInt(widthMatch[1], 10) : null;
    const height = heightMatch ? parseInt(heightMatch[1], 10) : null;

    return { width, height };
}

async function optimizeSVG(file) {
    const text = await file.text();
    const result = optimize(text);
    return new File([result.data], file.name, { type: 'image/svg+xml' });
}
