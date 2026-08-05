import { colordx, extend } from '/assets/js/vendor/colordx/colordx.js';
import names from '/assets/js/vendor/colordx/names.js';

class ColorInput extends HTMLElement {
    static observedAttributes = ['label', 'default-value', 'allow-alpha', 'disabled'];

    static css = `
        fieldset {
            border: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            flex-direction: row;
            gap: 0.5rem;
            text-align: start;

            max-width: 100%;
            box-sizing: border-box;
            min-inline-size: unset;
        }

        fieldset > legend {
            width: 100%;
        }

        fieldset > input {
            flex: 1 1 auto;
            width: 6rem;
        }

        fieldset > input[type="color"] {
            flex: 0 0 auto;
            width: 2.5rem;
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
            max-width: 100%;
            box-sizing: border-box;
        }

        input:hover, input:active {
            border-color: var(--color-border-highlight);
        }

        input.invalid {
            border-color: var(--color-danger);
        }

        input:focus-visible {
            outline: solid 2px var(--color-primary);
            border-color: transparent;
        }

        input[type="color"] {
            width: 2.5rem;
            height: 2.5rem;
            padding: 0;
            background-color: transparent;
            border: none;
        }

        input[type="color"]::-webkit-color-swatch {
            border-radius: var(--border-radius);
            border: var(--border);
            transition: border-color var(--transition-duration) var(--transition-timing-function);
        }

        input[type="color"]::-webkit-color-swatch:hover {
            border-color: var(--color-border-highlight);
        }

        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        input[type="color"]::-moz-color-swatch {
            border-radius: var(--border-radius);
            border: var(--border);
            transition: border-color var(--transition-duration) var(--transition-timing-function);
        }

        input[type="color"]::-moz-color-swatch:hover {
            border-color: var(--color-border-highlight);
        }

        input[type="text"], input[type="color"] {
            min-height: 2.5rem;
            box-sizing: border-box;
        }

        input:disabled, select:disabled, textarea:disabled {
            opacity: 0.7;
            pointer-events: none;
            filter: grayscale(1);
        }
    `;

    /* Shadow DOM Structure:
    <fieldset>
        <legend>Foreground Color</legend>
        <input type="color" value="#000000">
        <input type="text" value="#000000">
    </fieldset>
    */

    #value = '#000000';

    get value() {
        return this.#value;
    }

    set value(newValue) {
        this.#value = newValue;

        if (this.shadowRoot) {
            const colorInput = this.shadowRoot.querySelector('input[type="color"]');
            const textInput = this.shadowRoot.querySelector('input[type="text"]');

            if (colorInput) {
                colorInput.value = this.formatColorAsHex(this.#value);
            }
            if (textInput) {
                textInput.value = this.#value;
            }
        }
    }

    get valueAsHex() {
        return this.formatColorAsHex(this.#value);
    }

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(isDisabled) {
        if (Boolean(isDisabled)) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    constructor() {
        super();

        extend([names]);
        
        this.#value = this.getAttribute('default-value') || '#000000';
    }

    connectedCallback() {
        this.upgradeProperty('value');
        this.upgradeProperty('disabled');

        const allowAlpha = this.hasAttribute('allow-alpha');

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(ColorInput.css);
            shadow.adoptedStyleSheets = [styleSheet];

            // Fieldset
            const fieldset = document.createElement('fieldset');
            shadow.appendChild(fieldset);

            // Legend
            const legend = document.createElement('legend');
            legend.textContent = this.getAttribute('label') || 'Color';
            fieldset.appendChild(legend);

            // Color Input
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = this.formatColorAsHex(this.#value);
            /* Intentionally not adding alpha attribute since it results in a "color(srgb..." color,
                which is unsupported by colordx. Add this back once colordx supports this color format.
            if (allowAlpha) {
                colorInput.setAttribute('alpha', '');
            }*/
            if (this.hasAttribute('disabled')) {
                colorInput.disabled = true;
            }
            fieldset.appendChild(colorInput);

            colorInput.oninput = () => this.onColorInputChanged();

            // Text Input
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.value = this.#value;
            if (this.hasAttribute('disabled')) {
                textInput.disabled = true;
            }
            fieldset.appendChild(textInput);

            textInput.oninput = () => this.onTextInputChanged();
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

        if (name === 'label') {
            const legend = this.shadowRoot.querySelector('legend');
            if (legend) {
                legend.textContent = newValue;
            }
        /* Intentionally not adding alpha attribute since it results in a "color(srgb..." color,
            which is unsupported by colordx. Add this back once colordx supports this color format.
        } else if (name === 'allow-alpha') {
            const colorInput = this.shadowRoot.querySelector('input[type="color"]');
            if (colorInput) {
                if (newValue !== null) {
                    colorInput.setAttribute('alpha', '');
                } else {
                    colorInput.removeAttribute('alpha');
                }
            }
        */
        } else if (name === 'disabled') {
            const colorInput = this.shadowRoot.querySelector('input[type="color"]');
            const textInput = this.shadowRoot.querySelector('input[type="text"]');

            const isDisabled = this.hasAttribute('disabled');

            if (colorInput) {
                colorInput.disabled = isDisabled;
            }
            if (textInput) {
                textInput.disabled = isDisabled;
            }
        }
        // default-value intentionally ignored since it only applies at setup
    }

    onColorInputChanged() {
        const colorInput = this.shadowRoot.querySelector('input[type="color"]');
        const textInput = this.shadowRoot.querySelector('input[type="text"]');

        if (!colorInput || !textInput) {
            return;
        }

        this.#value = colorInput.value;
        textInput.value = this.#value;

        this.fireChangeEvent();
    }

    onTextInputChanged() {
        const colorInput = this.shadowRoot.querySelector('input[type="color"]');
        const textInput = this.shadowRoot.querySelector('input[type="text"]');

        if (!colorInput || !textInput) {
            return;
        }

        let colorObject = colordx(textInput.value);
        if (colorObject.isValid() === false) {
            colorObject = colordx('#' + textInput.value);
            if (colorObject.isValid() === true) {
                textInput.value = '#' + textInput.value;
            } else {
                textInput.classList.add('invalid');
                return;
            }
        }
        textInput.classList.remove('invalid');

        this.#value = textInput.value;
        colorInput.value = this.formatColorAsHex(this.#value);

        this.fireChangeEvent();
    }

    fireChangeEvent() {
        const event = new CustomEvent('change', {
            detail: { value: this.#value }
        });
        this.dispatchEvent(event);
    }

    formatColorAsHex(color) {
        const allowAlpha = this.hasAttribute('allow-alpha');
        let colorObject = colordx(color);

        if (colorObject.isValid() === false) {
            colorObject = colordx('#000000');
        }

        if (allowAlpha === false) {
            colorObject = colorObject.alpha(1);
        }

        return colorObject.toHex();
    }
}

if (!customElements.get('color-input')) {
    customElements.define('color-input', ColorInput);
}
