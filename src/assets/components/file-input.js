import '/assets/components/file-item.js';
import { generateUUID, getFileExtension } from '/assets/js/utils.js';

class FileInput extends HTMLElement {
    static observedAttributes = ['accept', 'multiple', 'ask-for-dimensions-for-svg'];

    static singleText = 'Drop a file here or click to browse';
    static multipleText = 'Drop files here or click to browse';

    static css = `
        label {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            background-color: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 0.5rem;
            transition: border-color var(--transition-duration) var(--transition-timing-function);
            width: 100%;
            height: 10rem;
            margin-block-end: 1rem;
            box-sizing: border-box;
            text-align: center;
            cursor: pointer;
        }

        label:hover {
            border-color: var(--color-border-highlight);
        }

        label.dragover {
            outline: solid 2px var(--color-primary);
            border-color: transparent;
        }

        label .icon {
            display: inline-block;
            width: 3rem;
            height: 3rem;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            pointer-events: none;
        }

        .error-message {
            color: var(--color-status-text);
            background-color: var(--color-warning);
            border: 1px solid var(--color-warning);
            border-radius: var(--border-radius);
            padding: 1rem;
            white-space: pre-wrap;
            display: none;
        }

        ul {
            list-style: none;
            padding: 0;
            margin-inline: 0;
            margin-block-start: 0;
            margin-block-end: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
    `;

    /* Shadow DOM Structure:
    <label>
        <svg class="icon" viewBox="0 0 24 24">...</svg>
        <span class="label-text">Drop a file here or click to browse</span>
        <input type="file" style="display: none;" accept="...">
    </label>
    <ul>
        <file-item></file-item>
    </ul>
    */

    constructor() {
        super();

        this._items = [];
    }

    get value() {
        return Object.freeze(this._items.map(item => Object.freeze({ ...item })));
    }

    get files() {
        return Object.freeze(this._items.map(item => item.file));
    }

    connectedCallback() {
        this.upgradeProperty('value');
        this.upgradeProperty('files');

        const multiple = this.hasAttribute('multiple');

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(FileInput.css);
            shadow.adoptedStyleSheets = [styleSheet];

            // Label / dropzone
            const label = document.createElement('label');
            label.tabIndex = 0;
            label.role = 'button';
            label.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>';
            shadow.appendChild(label);

            const labelText = document.createElement('span');
            labelText.className = 'label-text';
            labelText.textContent = multiple ? FileInput.multipleText : FileInput.singleText;
            label.appendChild(labelText);

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

            // Hidden file input
            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            if (this.hasAttribute('accept')) {
                input.accept = this.getAttribute('accept');
            }
            if (multiple) {
                input.multiple = true;
            }
            label.appendChild(input);

            input.onchange = async (e) => {
                const selectedFiles = Array.from(input.files);
                await this.handleFiles(selectedFiles);
            };

            // Output list
            const list = document.createElement('ul');
            list.style.display = this._items.length > 0 ? '' : 'none';
            shadow.appendChild(list);
        }
    }

    upgradeProperty(propertyName) {
        if (Object.prototype.hasOwnProperty.call(this, propertyName)) {
            const propertyValue = this[propertyName];
            delete this[propertyName];
            this[propertyName] = propertyValue;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this.shadowRoot) {
            // Not yet initialized, ignore changes
            return;
        }

        if (name === 'accept') {
            const input = this.shadowRoot.querySelector('input');

            input.accept = newValue;
        } else if (name === 'multiple') {
            const input = this.shadowRoot.querySelector('input');
            const labelText = this.shadowRoot.querySelector('.label-text');

            const multiple = this.hasAttribute('multiple');
            input.multiple = multiple;

            if (multiple) {
                labelText.textContent = FileInput.multipleText;
            } else {
                labelText.textContent = FileInput.singleText;
            }
        } else if (name === 'ask-for-dimensions-for-svg') {
            const fileItems = this.shadowRoot.querySelectorAll('file-item');

            for (const fileItem of fileItems) {
                if (this.hasAttribute('ask-for-dimensions-for-svg')) {
                    fileItem.setAttribute('ask-for-dimensions-for-svg', '');
                } else {
                    fileItem.removeAttribute('ask-for-dimensions-for-svg');
                }
            }

            if (!this.hasAttribute('ask-for-dimensions-for-svg')) {
                for (const item of this._items) {
                    delete item.width;
                    delete item.height;
                }

                this.fireChangeEvent();
            }
        }
    }

    fireChangeEvent() {
        const event = new CustomEvent('change', {
            detail: {
                files: this.files,
                value: this.value
            }
        });
        this.dispatchEvent(event);
    }

    async handleFiles(files) {
        files = files.filter(file => this.isValidFile(file));
        files = files.filter(file => !this.isDuplicate(file));

        if (this.hasAttribute('multiple') === false) {
            files = files.slice(0, 1);
        }

        if (files.length === 0) {
            return;
        }

        if (this.hasAttribute('multiple') === false) {
            this.removeAllFiles();
        }

        const list = this.shadowRoot.querySelector('ul');
        for (const file of files) {
            const item = {
                id: generateUUID(),
                file
            };

            this._items.push(item);

            const fileItem = document.createElement('file-item');
            fileItem.file = file;
            fileItem.setAttribute('button-label', `Remove file ${file.name}`);
            fileItem.dataset.id = item.id;
            if (this.hasAttribute('ask-for-dimensions-for-svg')) {
                fileItem.setAttribute('ask-for-dimensions-for-svg', '');
            }
            list.appendChild(fileItem);

            fileItem.addEventListener('button-clicked', () => {
                this.removeFile(item.id);
            });

            fileItem.addEventListener('dimensions-changed', (e) => {
                this.updateItemDimensions(item.id, e.detail?.width, e.detail?.height);
            });
        }

        list.style.display = this._items.length > 0 ? '' : 'none';
        
        this.fireChangeEvent();
    }

    updateItemDimensions(id, width, height) {
        const item = this._items.find(existingItem => existingItem.id === id);
        if (!item) {
            return;
        }

        if (!this.hasAttribute('ask-for-dimensions-for-svg') || getFileExtension(item.file.name) !== 'svg') {
            if ('width' in item || 'height' in item) {
                delete item.width;
                delete item.height;
                this.fireChangeEvent();
            }

            return;
        }

        const parsedWidth = Number.parseInt(width, 10);
        const parsedHeight = Number.parseInt(height, 10);
        const changed = item.width !== parsedWidth || item.height !== parsedHeight;

        if (Number.isFinite(parsedWidth) && Number.isFinite(parsedHeight)) {
            item.width = parsedWidth;
            item.height = parsedHeight;
        } else {
            delete item.width;
            delete item.height;
        }

        if (changed) {
            this.fireChangeEvent();
        }
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

    isDuplicate(file) {
        return this._items.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified);
    }

    removeFile(id) {
        this._items = this._items.filter(item => item.id !== id);

        const fileItem = this.shadowRoot.querySelector(`file-item[data-id="${id}"]`);
        if (fileItem) {
            fileItem.remove();
        }

        // Hide list if no files left
        const list = this.shadowRoot.querySelector('ul');
        list.style.display = this._items.length > 0 ? '' : 'none';

        this.fireChangeEvent();
    }

    removeAllFiles() {
        if (!this.shadowRoot) {
            return;
        }

        this._items = [];

        const list = this.shadowRoot.querySelector('ul');
        list.innerHTML = '';
        list.style.display = 'none';
    }
}

if (!customElements.get('file-input')) {
    customElements.define('file-input', FileInput);
}
