import { previewableImageFormats, getFileExtension, ensureSvgHasXmlns, getFileIcon } from '/assets/js/utils.js';

class SmallFileInput extends HTMLElement {
    static observedAttributes = ['accept'];

    static css = `
        .layout {
            display: grid;
            gap: 1rem;
            grid-template-columns: auto 1fr;
        }

        label {
            background-color: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 0.75rem;
            transition: border-color var(--transition-duration) var(--transition-timing-function);
            cursor: pointer;
        }

        label:hover {
            border-color: var(--color-border-highlight);
        }

        label.dragover {
            outline: solid 2px var(--color-primary);
            border-color: transparent;
        }

        .file-info {
            display: grid;
            gap: 0.5rem;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            background-color: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 0.5rem;
        }

        .preview-container img {
            display: block;
            width: 2rem;
            height: 2rem;
            object-fit: cover;
            border-radius: var(--border-radius);
        }

        .preview-container .ti {
            font-size: 2rem;
        }

        .name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        button {
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
            padding: 0.25rem;
            cursor: pointer;
            box-sizing: border-box;
            touch-action: manipulation;

            width: 2rem;
            height: 2rem;
        }

        button:hover {
            color: var(--color-text-highlight);
        }

        button:active {
            color: var(--color-text-muted);
        }
    `;

    /* Shadow DOM Structure:
    <div class="layout">
        <label>
            <i class="ti ti-upload"></i>
            <span class="label-text">Upload a file</span>
            <input type="file" style="display: none;" accept="...">
        </label>
        <div class="file-info">
            <div class="preview-container">
                <img src="..." alt="">
            </div>
            <span class="name">filename.ext</span>
            <button type="button" aria-label="Remove file">
                <i class="ti ti-x"></i>
            </button>
        </div>
    </div>
    */

    #file = null;

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

    constructor() {
        super();
    }

    async connectedCallback() {
        this.upgradeProperty('file');

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const iconStyleSheet = new CSSStyleSheet();
            iconStyleSheet.replaceSync(await fetch('/assets/css/tabler-icons.css').then(res => res.text()));

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(SmallFileInput.css);
            shadow.adoptedStyleSheets = [styleSheet, iconStyleSheet];

            const layout = document.createElement('div');
            layout.className = 'layout';
            shadow.appendChild(layout);

            // Label / dropzone
            const label = document.createElement('label');
            label.tabIndex = 0;
            label.role = 'button';
            layout.appendChild(label);

            label.ondragover = (e) => {
                e.preventDefault();
                label.classList.add('dragover');
            }
            label.ondragenter = (e) => {
                e.preventDefault();
                label.classList.add('dragover');
            }
            label.ondragleave = (e) => {
                e.preventDefault();
                label.classList.remove('dragover');
            }
            label.ondrop = async (e) => {
                e.preventDefault();
                label.classList.remove('dragover');
                const droppedFiles = Array.from(e.dataTransfer.files);
                await this.handleFiles(droppedFiles);
            }
            label.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    label.click();
                }
            };

            const icon = document.createElement('i');
            icon.className = 'ti ti-upload';
            label.appendChild(icon);

            const textNode = document.createTextNode(' ');
            label.appendChild(textNode);

            const span = document.createElement('span');
            span.className = 'label-text';
            span.textContent = 'Upload a file';
            label.appendChild(span);

            // Hidden file input
            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            if (this.hasAttribute('accept')) {
                input.accept = this.getAttribute('accept');
            }
            label.appendChild(input);

            input.onchange = async (e) => {
                const selectedFiles = Array.from(input.files);
                await this.handleFiles(selectedFiles);
            };

            // File info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.style.display = 'none';
            layout.appendChild(fileInfo);

            const previewContainer = document.createElement('div');
            previewContainer.className = 'preview-container';
            fileInfo.appendChild(previewContainer);

            const fileIcon = document.createElement('i');
            fileIcon.className = 'ti ti-file';
            previewContainer.appendChild(fileIcon);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = 'No file selected';
            fileInfo.appendChild(nameSpan);

            const removeButton = document.createElement('button');
            removeButton.ariaLabel = 'Remove file';
            fileInfo.appendChild(removeButton);

            removeButton.onclick = async () => {
                await this.removeFile();
            };

            const removeButtonIcon = document.createElement('i');
            removeButtonIcon.className = 'ti ti-x';
            removeButton.appendChild(removeButtonIcon);
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

        if (name === 'accept') {
            const input = this.shadowRoot.querySelector('input'); 
            if (input) {
                if (newValue?.trim()) {
                    input.accept = newValue;
                } else {
                    input.removeAttribute('accept');
                }
            }
        }
    }

    fireChangeEvent() {
        const event = new CustomEvent('change', {
            detail: { value: this.#file }
        });
        this.dispatchEvent(event);
    }

    async updateUI() {
        if (!this.shadowRoot) return;

        const fileInfo = this.shadowRoot.querySelector('.file-info');
        const previewContainer = this.shadowRoot.querySelector('.preview-container');
        const nameSpan = this.shadowRoot.querySelector('.name');

        this.revokePreviewUrl();

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
                previewContainer.innerHTML = `<i class="ti ${getFileIcon(extension)}"></i>`;
            }

            nameSpan.textContent = this.#file.name;

            fileInfo.style.display = '';
        } else {
            previewContainer.innerHTML = `<i class="ti ${getFileIcon('')}"></i>`;
            nameSpan.textContent = 'No file selected';
            fileInfo.style.display = 'none';
        }
    }

    async removeFile() {
        this.#file = null;
        this.fireChangeEvent();
        await this.updateUI();
    }

    async handleFiles(files) {
        files = files.filter(file => this.isValidFile(file));

        if (files.length === 0) {
            return;
        }

        this.#file = files[0];
        this.fireChangeEvent();
        await this.updateUI();
    }

    isValidFile(file) {
        const accept = this.getAttribute('accept');
        if (!accept) {
            return true; // No restrictions
        }

        const acceptedTypes = accept.split(',').map(s => s.trim().toLowerCase());
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        for (const type of acceptedTypes) {
            if (type.startsWith('.')) {
                // Extension match
                if (fileName.endsWith(type)) {
                    return true;
                }
            } else if (type.endsWith('/*')) {
                // Type match (e.g. image/*)
                const baseType = type.slice(0, -1);
                if (fileType.startsWith(baseType)) {
                    return true;
                }
            } else {
                // Exact type match
                if (fileType === type) {
                    return true;
                }
            }
        }
        return false;
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
}

if (!customElements.get('small-file-input')) {
    customElements.define('small-file-input', SmallFileInput);
}
