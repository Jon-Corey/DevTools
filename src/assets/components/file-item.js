import { previewableImageFormats, formatFileSize, getFileExtension, ensureSvgHasXmlns, getSvgDimensions } from '/assets/js/utils.js';

class FileItem extends HTMLElement {
    static observedAttributes = ['button-icon', 'button-label', 'ask-for-dimensions-for-svg'];

    static buttonIcons = {
        x: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>',
        download: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>'
    }

    static defaultFileIcon = '<svg class="icon" viewBox="0 0 24 24"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" /></svg>';
    static fileIcons = [
        {
            // Image
            extensions: ['png', 'jpeg', 'jpg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'avif', 'heic', 'heif', 'apng'],
            icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 8h.01" /><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12" /><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" /><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" /></svg>'
        },
        {
            // Video
            extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mpeg', 'mpg'],
            icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4" /><path d="M3 8a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8" /></svg>'
        },
        {
            // Font
            extensions: ['woff', 'woff2', 'ttf', 'otf'],
            icon: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" /><path d="M11 18h2" /><path d="M12 18v-7" /><path d="M9 12v-1h6v1" /></svg>'
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

        .layout .preview-container img, .layout .preview-container .icon {
            display: block;
            width: 3rem;
            height: 3rem;
            object-fit: cover;
            border-radius: var(--border-radius);
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

        .icon {
            display: inline-block;
            width: 1em;
            height: 1em;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
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

        button .icon, .button .icon {
            vertical-align: -0.125em;
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
                    <div class="default-content"><svg class="icon" viewBox="0 0 24 24">...</svg></div>
                    <div class="alternate-content"><svg class="icon" viewBox="0 0 24 24">...</svg></div>
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

    connectedCallback() {
        this.upgradeProperty('file');
        this.upgradeProperty('width');
        this.upgradeProperty('height');

        const buttonIcon = this.getAttribute('button-icon') || 'x';
        const buttonLabel = this.getAttribute('button-label') || 'Remove file';

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(FileItem.css);
            shadow.adoptedStyleSheets = [styleSheet];

            const li = document.createElement('li');
            li.classList.add('root');
            shadow.appendChild(li);

            const layoutDiv = document.createElement('div');
            layoutDiv.classList.add('layout');
            li.appendChild(layoutDiv);

            const previewContainer = document.createElement('div');
            previewContainer.classList.add('preview-container');
            layoutDiv.appendChild(previewContainer);

            previewContainer.innerHTML = FileItem.defaultFileIcon;

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
            defaultContentDiv.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M9 15l3 -3m2 -2l1 -1" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" /><path d="M3 3l18 18" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></svg>';
            aspectRatioLabel.appendChild(defaultContentDiv);

            const alternateContentDiv = document.createElement('div');
            alternateContentDiv.classList.add('alternate-content');
            alternateContentDiv.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M9 15l6 -6" /><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" /><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></svg>';
            aspectRatioLabel.appendChild(alternateContentDiv);

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
            button.innerHTML = FileItem.buttonIcons[buttonIcon] || FileItem.buttonIcons['x'];
            layoutDiv.appendChild(button);

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
            const button = this.shadowRoot.querySelector('button');
            if (button) {
                button.innerHTML = FileItem.buttonIcons[newValue] || FileItem.buttonIcons['x'];
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
                previewContainer.innerHTML = this.getFileIcon(extension);
            }

            nameSpan.textContent = this.#file.name;
            sizeSpan.textContent = formatFileSize(this.#file.size);
        } else {
            previewContainer.innerHTML = FileItem.defaultFileIcon;

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
