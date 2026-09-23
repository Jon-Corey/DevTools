import { previewableImageFormats, formatFileSize, getFileExtension, ensureSvgHasXmlns, getSvgDimensions } from '/assets/js/utils.js';

class FileItem extends HTMLElement {
    static observedAttributes = ['button-icon', 'button-label', 'ask-for-dimensions-for-svg', 'original-file-size'];

    static defaultFileIcon = 'ti-file';
    static fileIcons = [
        {
            // Image
            extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'avif', 'heic', 'heif', 'apng'],
            icon: 'ti-photo'
        },
        {
            // Video
            extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mpeg', 'mpg'],
            icon: 'ti-video'
        },
        {
            // Font
            extensions: ['woff', 'woff2', 'ttf', 'otf'],
            icon: 'ti-file-typography'
        }
    ]

    static css = `
        .root {
            list-style: none;
            container-type: inline-size;
        }

        .layout {
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-rows: auto auto;
            grid-template-areas:
                "preview name button"
                "preview size button";
            column-gap: 1rem;
            background-color: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 1rem;
            align-items: center;
        }

        .layout.show-dimensions {
            grid-template-areas:
                "preview name dimensions button"
                "preview size dimensions button";
        }

        .layout .preview-container {
            grid-area: preview;
        }

        .layout .preview-container img {
            display: block;
            width: 3rem;
            height: 3rem;
            object-fit: cover;
            border-radius: var(--border-radius);
        }

        .layout .preview-container .ti {
            font-size: 3rem;
        }

        .layout .name {
            grid-area: name;
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .layout .size {
            grid-area: size;
            color: var(--color-text-muted);
            font-size: 0.875rem;
            letter-spacing: 1px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .layout .dimensions {
            display: none;
            color: var(--color-text-muted);
            font-size: 0.875rem;
            letter-spacing: 1px;
        }

        .layout.show-dimensions .dimensions {
            grid-area: dimensions;
            display: flex;
            flex-direction: row;
            column-gap: 0;
            row-gap: 0.5rem;
            align-items: center;
            flex-wrap: wrap;
        }

        .layout button {
            grid-area: button;
            width: 3rem;
            height: 3rem;
        }

        button, .button {
            background-color: transparent;
            color: var(--color-text);
            border: none;

            display: inline-block;
            font-family: inherit;
            font-size: 1.25rem;
            line-height: normal;
            font-weight: 500;
            border-radius: var(--border-radius);
            text-align: center;
            transition: color var(--transition-duration) var(--transition-timing-function);
            padding: 0.5rem;
            cursor: pointer;
            box-sizing: border-box;
            touch-action: manipulation;
        }

        button:hover, .button:hover {
            color: var(--color-text-highlight);
        }

        button:active, .button:active {
            color: var(--color-text-muted);
        }

        label {
            display: flex;
            flex-direction: column;
        }

        input {
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            background-color: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 0.5rem;
            transition: border-color var(--transition-duration) var(--transition-timing-function);
            width: 5rem;
            max-width: 100%;
            box-sizing: border-box;
        }

        input:hover, input:active {
            border-color: var(--color-border-highlight);
        }

        input.invalid, .invalid input {
            border-color: var(--color-danger);
        }

        input:focus-visible {
            outline: solid 2px var(--color-primary);
            border-color: transparent;
        }

        .toggle-button input[type="checkbox"] {
            position: absolute;
            clip: rect(0, 0, 0, 0);
            pointer-events: none;
        }

        .alternate-content {
            display: none !important;
        }

        .toggle-button:has(input[type="checkbox"]:checked) .default-content {
            display: none !important;
        }

        .toggle-button:has(input[type="checkbox"]:checked) .alternate-content {
            display: block !important;
        }

        .text-danger {
            color: var(--color-text-danger);
        }

        .text-success {
            color: var(--color-text-success);
        }

        @container (width < 500px) {
            .layout.show-dimensions {
                grid-template-areas:
                "preview name button"
                "preview size button"
                "dimensions dimensions dimensions";
            }

            .layout.show-dimensions .dimensions {
                margin-top: 1rem;
            }
        }

        @container (width < 230px) {
            .layout.show-dimensions .dimensions {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    `;

    /* Shadow DOM Structure:
    <li class="root">
        <div class="layout">
            <div class="preview-container">
                    <img src="..." alt="">
            </div>
            <span class="name">filename.ext</span>
            <span class="size">481 B</span>
            <div class="dimensions">
                <label>
                    Width (px)
                    <input class="width" name="width" type="number" min="1" value="100">
                </label>
                <label class="button toggle-button">
                    <input type="checkbox" class="aspect-ratio-locked" name="aspect-ratio-locked" aria-label="Lock the aspect ratio to the image's original aspect ratio" checked />
                    <div class="default-content"><i class="ti ti-link"></i></div>
                    <div class="alternate-content"><i class="ti ti-link-off"></i></div>
                </label>
                <label>
                    Height (px)
                    <input class="height" name="height" type="number" min="1" value="100">
                </label>
            </div>
            <button type="button" aria-label="Remove file">X</button>
        </div>
    </li>
    */

    #file = null;
    #aspectRatio = 0;

    get file() {
        return this.#file;
    }

    set file(file) {
        if (file instanceof File) {
            this.#file = file;
            this.updateUI();
        } else {
            this.#file = null;
            this.updateUI();
        }
    }

    get width() {
        const widthInput = this.shadowRoot?.querySelector('.width');
        const parsed = widthInput ? parseInt(widthInput.value, 10) : NaN;
        return isFinite(parsed) ? parsed : null;
    }

    get height() {
        const heightInput = this.shadowRoot?.querySelector('.height');
        const parsed = heightInput ? parseInt(heightInput.value, 10) : NaN;
        return isFinite(parsed) ? parsed : null;
    }

    constructor() {
        super();
    }

    async connectedCallback() {
        this.upgradeProperty('file');
        this.upgradeProperty('width');
        this.upgradeProperty('height');

        const buttonIcon = this.getAttribute('button-icon') || 'ti-x';
        const buttonLabel = this.getAttribute('button-label') || 'Remove file';

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const iconStyleSheet = new CSSStyleSheet();
            iconStyleSheet.replaceSync(await fetch('/assets/css/tabler-icons.css').then(res => res.text()));

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(FileItem.css);
            shadow.adoptedStyleSheets = [styleSheet, iconStyleSheet];

            const li = document.createElement('li');
            li.classList.add('root');
            shadow.appendChild(li);

            const layoutDiv = document.createElement('div');
            layoutDiv.classList.add('layout');
            li.appendChild(layoutDiv);

            const previewContainer = document.createElement('div');
            previewContainer.classList.add('preview-container');
            layoutDiv.appendChild(previewContainer);

            const fileIcon = document.createElement('i');
            fileIcon.className = 'ti ti-file';
            previewContainer.appendChild(fileIcon);

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('name');
            nameSpan.textContent = 'No file selected';
            layoutDiv.appendChild(nameSpan);

            const sizeSpan = document.createElement('span');
            sizeSpan.classList.add('size');
            sizeSpan.textContent = '0 B';
            layoutDiv.appendChild(sizeSpan);

            const dimensionsDiv = document.createElement('div');
            dimensionsDiv.classList.add('dimensions');
            layoutDiv.appendChild(dimensionsDiv);

            const widthLabel = document.createElement('label');
            widthLabel.textContent = 'Width (px)';
            dimensionsDiv.appendChild(widthLabel);

            const widthInput = document.createElement('input');
            widthInput.type = 'number';
            widthInput.min = '1';
            widthInput.value = '100';
            widthInput.name = 'width';
            widthInput.classList.add('width');
            widthLabel.appendChild(widthInput);

            widthInput.onchange = this.widthChanged.bind(this);

            const aspectRatioLabel = document.createElement('label');
            aspectRatioLabel.classList.add('button', 'toggle-button');
            dimensionsDiv.appendChild(aspectRatioLabel);

            const aspectRatioInput = document.createElement('input');
            aspectRatioInput.type = 'checkbox';
            aspectRatioInput.classList.add('aspect-ratio-locked');
            aspectRatioInput.name = 'aspect-ratio-locked';
            aspectRatioInput.ariaLabel = 'Lock the aspect ratio to the image\'s original aspect ratio';
            aspectRatioInput.checked = true;
            aspectRatioLabel.appendChild(aspectRatioInput);

            aspectRatioInput.onchange = this.aspectRatioLockChanged.bind(this);

            const defaultContentDiv = document.createElement('div');
            defaultContentDiv.classList.add('default-content');
            aspectRatioLabel.appendChild(defaultContentDiv);

            const linkIcon = document.createElement('i');
            linkIcon.className = 'ti ti-link';
            defaultContentDiv.appendChild(linkIcon);

            const alternateContentDiv = document.createElement('div');
            alternateContentDiv.classList.add('alternate-content');
            aspectRatioLabel.appendChild(alternateContentDiv);

            const linkOffIcon = document.createElement('i');
            linkOffIcon.className = 'ti ti-link-off';
            alternateContentDiv.appendChild(linkOffIcon);

            const heightLabel = document.createElement('label');
            heightLabel.textContent = 'Height (px)';
            dimensionsDiv.appendChild(heightLabel);

            const heightInput = document.createElement('input');
            heightInput.type = 'number';
            heightInput.min = '1';
            heightInput.value = '100';
            heightInput.name = 'height';
            heightInput.classList.add('height');
            heightLabel.appendChild(heightInput);

            heightInput.onchange = this.heightChanged.bind(this);

            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label', buttonLabel);
            layoutDiv.appendChild(button);

            const buttonIconElement = document.createElement('i');
            buttonIconElement.className = `ti ${buttonIcon}`;
            button.appendChild(buttonIconElement);

            button.onclick = this.fireButtonClickedEvent.bind(this);
        }

        this.updateUI();
    }

    upgradeProperty(propertyName) {
        if (Object.prototype.hasOwnProperty.call(this, propertyName)) {
            const propertyValue = this[propertyName];
            delete this[propertyName];
            this[propertyName] = propertyValue;
        }
    }

    disconnectedCallback() {
        this.revokePreviewUrl();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.shadowRoot) return;

        if (name === 'button-icon') {
            const buttonIcon = this.shadowRoot.querySelector('button .ti');
            if (buttonIcon) {
                buttonIcon.className = `ti ${newValue}`;
            }
        } else if (name === 'button-label') {
            const button = this.shadowRoot.querySelector('button');
            if (button) {
                if (newValue === null) {
                    button.removeAttribute('aria-label');
                } else {
                    button.setAttribute('aria-label', newValue);
                }
            }
        } else if (name === 'ask-for-dimensions-for-svg') {
            if (this.#file) {
                this.updateUI();
            }
        } else if (name === 'original-file-size') {
            if (this.#file) {
                this.updateUI();
            }
        }
    }

    fireButtonClickedEvent() {
        this.dispatchEvent(new CustomEvent('button-clicked'));
    }

    fireDimensionsChangedEvent() {
        const width = this.width;
        const height = this.height;
        this.dispatchEvent(new CustomEvent('dimensions-changed', {
            detail: { width, height }
        }));
    }

    aspectRatioLockChanged() {
        const aspectRatioInput = this.shadowRoot?.querySelector('.aspect-ratio-locked');
        const widthInput = this.shadowRoot?.querySelector('.width');
        const heightInput = this.shadowRoot?.querySelector('.height');

        if (!aspectRatioInput || !widthInput || !heightInput) return;

        if (aspectRatioInput.checked) {
            const width = parseInt(widthInput.value, 10);

            if (isFinite(width)) {
                const aspectRatio = this.#aspectRatio;
                heightInput.value = Math.round(width / aspectRatio);
            }
        }

        this.fireDimensionsChangedEvent();
    }

    widthChanged() {
        const aspectRatioInput = this.shadowRoot?.querySelector('.aspect-ratio-locked');
        const widthInput = this.shadowRoot?.querySelector('.width');
        const heightInput = this.shadowRoot?.querySelector('.height');

        if (!aspectRatioInput || !widthInput || !heightInput) return;

        if (aspectRatioInput.checked) {
            const width = parseInt(widthInput.value, 10);

            if (isFinite(width)) {
                const aspectRatio = this.#aspectRatio;
                heightInput.value = Math.round(width / aspectRatio);
            }
        }

        this.fireDimensionsChangedEvent();
    }

    heightChanged() {
        const aspectRatioInput = this.shadowRoot?.querySelector('.aspect-ratio-locked');
        const widthInput = this.shadowRoot?.querySelector('.width');
        const heightInput = this.shadowRoot?.querySelector('.height');

        if (!aspectRatioInput || !widthInput || !heightInput) return;

        if (aspectRatioInput.checked) {
            const height = parseInt(heightInput.value, 10);

            if (isFinite(height)) {
                const aspectRatio = this.#aspectRatio;
                widthInput.value = Math.round(height * aspectRatio);
            }
        }

        this.fireDimensionsChangedEvent();
    }

    async updateUI() {
        if (!this.shadowRoot) return;

        const showDimensions = this.hasAttribute('ask-for-dimensions-for-svg')
            && this.#file
            && getFileExtension(this.#file.name) === 'svg';
        const originalFileSize = this.getAttribute('original-file-size');

        const layoutDiv = this.shadowRoot.querySelector('.layout');
        const previewContainer = this.shadowRoot.querySelector('.preview-container');
        const nameSpan = this.shadowRoot.querySelector('.name');
        const sizeSpan = this.shadowRoot.querySelector('.size');

        this.revokePreviewUrl();

        layoutDiv.classList.toggle('show-dimensions', showDimensions);
        if (showDimensions) {
            const widthInput = this.shadowRoot.querySelector('.width');
            const heightInput = this.shadowRoot.querySelector('.height');
            if (widthInput && heightInput) {
                const dimensions = await getSvgDimensions(this.#file);
                this.#aspectRatio = dimensions.width / dimensions.height;
                widthInput.value = dimensions.width;
                heightInput.value = dimensions.height;
                
                this.fireDimensionsChangedEvent();
            }
        }

        if (this.#file) {
            const extension = getFileExtension(this.#file.name);
            if (previewableImageFormats.includes(extension)) {
                previewContainer.innerHTML = '';
                const img = document.createElement('img');
                img.alt = '';
                img.classList.add('preview');
                img.src = await this.getPreviewUrl(this.#file);
                previewContainer.appendChild(img);
            } else {
                previewContainer.innerHTML = `<i class="ti ${this.getFileIcon(extension)}"></i>`;
            }

            nameSpan.textContent = this.#file.name;
            if (originalFileSize) {
                const reductionPercentage = Math.round((1 - (this.#file.size / originalFileSize)) * 10000) / 100;
                if (reductionPercentage > 0) {
                    sizeSpan.innerHTML = `${formatFileSize(this.#file.size)} <span class="text-success">(-${reductionPercentage}%)</span>`;
                } else if (reductionPercentage === 0) {
                    sizeSpan.textContent = `${formatFileSize(this.#file.size)} (No change)`;
                } else {
                    sizeSpan.innerHTML = `${formatFileSize(this.#file.size)} <span class="text-danger">(+${Math.abs(reductionPercentage)}%)</span>`;
                }
            } else {
                sizeSpan.textContent = formatFileSize(this.#file.size);
            }
        } else {
            previewContainer.innerHTML = `<i class="ti ${FileItem.defaultFileIcon}"></i>`;

            nameSpan.textContent = 'No file selected';
            sizeSpan.textContent = '0 B';
        }
    }

    async getPreviewUrl(file) {
        const extension = getFileExtension(file.name);
        if (previewableImageFormats.includes(extension)) {
            if (extension === 'svg') {
                return URL.createObjectURL(await ensureSvgHasXmlns(file));
            }
            return URL.createObjectURL(file);
        }
        return '';
    }

    revokePreviewUrl() {
        const previewImage = this.shadowRoot.querySelector('.preview');
        if (previewImage) {
            URL.revokeObjectURL(previewImage.src);
        }
    }

    getFileIcon(fileExtension) {
        let icon = FileItem.defaultFileIcon;

        for (const fileType of FileItem.fileIcons) {
            if (fileType.extensions.includes(fileExtension)) {
                icon = fileType.icon;
                break;
            }
        }

        return icon;
    }
}

if (!customElements.get('file-item')) {
    customElements.define('file-item', FileItem);
}
