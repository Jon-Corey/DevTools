class RangeInput extends HTMLElement {
    static observedAttributes = ['label', 'default-value', 'min', 'max', 'step', 'disabled'];

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

        fieldset > input[type="number"] {
            flex: 0 0 auto;
            width: 5rem;
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

        input[type="range"] {
            padding: 0;
            accent-color: var(--color-primary);
        }

        input[type="range"], input[type="number"] {
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
        <legend>Padding</legend>
        <input type="range" value="0" min="0" max="100" step="1">
        <input type="number" value="0" min="0" max="100" step="1">
    </fieldset>
    */

    #value = 0;

    get value() {
        return this.#value;
    }

    set value(newValue) {
        this.#value = newValue;

        if (this.shadowRoot) {
            const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
            const numberInput = this.shadowRoot.querySelector('input[type="number"]');

            if (rangeInput) {
                rangeInput.value = this.#value;
            }
            if (numberInput) {
                numberInput.value = this.#value;
            }
        }
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

        this.#value = this.getAttribute('default-value') ? Number(this.getAttribute('default-value')) : 0;
    }

    connectedCallback() {
        this.upgradeProperty('value');
        this.upgradeProperty('disabled');

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(RangeInput.css);
            shadow.adoptedStyleSheets = [styleSheet];

            // Get attributes
            const label = this.getAttribute('label') || 'Number';
            const min = this.getAttribute('min') ? Number(this.getAttribute('min')) : 0;
            const max = this.getAttribute('max') ? Number(this.getAttribute('max')) : 100;
            const step = this.getAttribute('step') ? Number(this.getAttribute('step')) : 1;

            // Fieldset
            const fieldset = document.createElement('fieldset');
            shadow.appendChild(fieldset);

            // Legend
            const legend = document.createElement('legend');
            legend.textContent = label;
            fieldset.appendChild(legend);

            // Range input
            const rangeInput = document.createElement('input');
            rangeInput.type = 'range';
            rangeInput.value = this.#value;
            rangeInput.min = min;
            rangeInput.max = max;
            rangeInput.step = step;
            if (this.hasAttribute('disabled')) {
                rangeInput.disabled = true;
            }
            fieldset.appendChild(rangeInput);

            rangeInput.oninput = () => this.onRangeInputChanged();

            // Number input
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.value = this.#value;
            numberInput.min = min;
            numberInput.max = max;
            numberInput.step = step;
            if (this.hasAttribute('disabled')) {
                numberInput.disabled = true;
            }
            fieldset.appendChild(numberInput);

            numberInput.oninput = () => this.onNumberInputChanged();
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
        } else if (name === 'min') {
            const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
            const numberInput = this.shadowRoot.querySelector('input[type="number"]');

            const number = newValue ? Number(newValue) : 0; 

            if (rangeInput) {
                rangeInput.min = number;
            }
            if (numberInput) {
                numberInput.min = number;
            }
        } else if (name === 'max') {
            const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
            const numberInput = this.shadowRoot.querySelector('input[type="number"]');

            const number = newValue ? Number(newValue) : 100;

            if (rangeInput) {
                rangeInput.max = number;
            }
            if (numberInput) {
                numberInput.max = number;
            }
        } else if (name === 'step') {
            const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
            const numberInput = this.shadowRoot.querySelector('input[type="number"]');

            const number = newValue ? Number(newValue) : 1;

            if (rangeInput) {
                rangeInput.step = number;
            }
            if (numberInput) {
                numberInput.step = number;
            }
        } else if (name === 'disabled') {
            const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
            const numberInput = this.shadowRoot.querySelector('input[type="number"]');

            const isDisabled = this.hasAttribute('disabled');

            if (rangeInput) {
                rangeInput.disabled = isDisabled;
            }
            if (numberInput) {
                numberInput.disabled = isDisabled;
            }
        }
    }

    onRangeInputChanged() {
        const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
        const numberInput = this.shadowRoot.querySelector('input[type="number"]');

        if (!rangeInput || !numberInput) {
            return;
        }

        this.#value = rangeInput.value;
        numberInput.value = this.#value;

        this.fireChangeEvent();
    }

    onNumberInputChanged() {
        const rangeInput = this.shadowRoot.querySelector('input[type="range"]');
        const numberInput = this.shadowRoot.querySelector('input[type="number"]');

        if (!rangeInput || !numberInput) {
            return;
        }

        // Check if value is a valid number between min and max
        const number = Number(numberInput.value);
        if (isNaN(number) || number < Number(numberInput.min) || number > Number(numberInput.max)) {
            numberInput.classList.add('invalid');
            return;
        }
        numberInput.classList.remove('invalid');

        this.#value = numberInput.value;
        rangeInput.value = this.#value;

        this.fireChangeEvent();
    }

    fireChangeEvent() {
        const event = new CustomEvent('change', {
            detail: { value: this.#value }
        });
        this.dispatchEvent(event);
    }
}

if (!customElements.get('range-input')) {
    customElements.define('range-input', RangeInput);
}
