import { generateUUID } from '/assets/js/utils.js';

class TabPanel extends HTMLElement {
    static observedAttributes = [];

    static css = `
        :focus-visible {
            outline-color: var(--color-text-accent);
        }

        .tab-bar {
            display: flex;
            box-shadow: inset 0 -1px var(--color-border);
        }

        .scroll-button {
            flex: none;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--color-bg-muted);
            color: var(--color-text);
            border: var(--border);
            border-radius: var(--border-radius) var(--border-radius) 0 0;
            font-family: inherit;
            font-size: 1.25rem;
            padding: 0 0.5rem;
            cursor: pointer;
            touch-action: manipulation;
            transition: color var(--transition-duration) var(--transition-timing-function);
        }

        .scroll-button[hidden] {
            display: none;
        }

        .scroll-left {
            margin-right: 0.5rem;
        }

        .scroll-right {
            margin-left: 0.5rem;
        }

        ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            gap: 0.5rem;
            flex: 1 1 auto;
            min-width: 0;
            position: relative;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        ul::-webkit-scrollbar {
            display: none;
        }

        .tab {
            background-color: var(--color-bg-muted);
            color: var(--color-text);
            border: var(--border);
            border-radius: var(--border-radius) var(--border-radius) 0 0;

            display: inline-block;
            font-family: inherit;
            font-size: 1rem;
            line-height: normal;
            font-weight: 500;
            text-align: center;
            transition: color var(--transition-duration) var(--transition-timing-function);
            padding: 0.5rem 1rem;
            cursor: pointer;
            box-sizing: border-box;
            touch-action: manipulation;

            white-space: nowrap;
        }

        .tab.active {
            background-color: var(--color-bg);
            border-bottom-color: transparent;
        }

        .tab:hover, .scroll-button:hover {
            color: var(--color-text-highlight);
        }

        .tab:active, .scroll-button:active {
            color: var(--color-text-muted);
        }

        .tab[aria-disabled="true"], .scroll-button[aria-disabled="true"] {
            color: var(--color-text-muted);
            cursor: default;
            opacity: 0.5;
        }

        .panel-container {
            background-color: var(--color-bg);
            border-top: none;
            border-right: var(--border);
            border-left: var(--border);
            border-bottom: var(--border);
            border-radius: 0 0 var(--border-radius) var(--border-radius);
            padding: 1rem;
        }
    `;

    /* Shadow DOM Structure:
        <div class="tab-bar">
            <button type="button" class="scroll-button scroll-left" aria-label="Previous tab" hidden><i class="ti ti-chevron-left"></i></button>
            <ul role="tablist">
                <li role="presentation">
                    <button type="button" role="tab" class="tab active">Tab 1</button>
                </li>
                <li role="presentation">
                    <button type="button" role="tab" class="tab">Tab 2</button>
                </li>
            </ul>
            <button type="button" class="scroll-button scroll-right" aria-label="Next tab" hidden><i class="ti ti-chevron-right"></i></button>
        </div>
        <div class="panel-container">
            <slot></slot>
        </div>
    */

    static #iconStyleSheetPromise = null;

    static getIconStyleSheet() {
        TabPanel.#iconStyleSheetPromise ??= fetch('/assets/css/tabler-icons.css')
            .then(res => res.text())
            .then(text => {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(text);
                return sheet;
            });
        return TabPanel.#iconStyleSheetPromise;
    }

    #currentTab = 0;
    #selectedPanel = null;
    #tabIds = new WeakMap();
    #tabBar = null;
    #tablist = null;
    #slot = null;
    #prevButton = null;
    #nextButton = null;
    #resizeObserver = new ResizeObserver(() => this.updateOverflow());

    get currentTab() {
        return this.#currentTab;
    }

    set currentTab(value) {
        this.#currentTab = value;
        this.updateTabDisplay();
        this.fireChangeEvent();
    }

    get currentTabName() {
        return this.#tablist?.children[this.#currentTab]?.querySelector('button')?.textContent || null;
    }

    constructor() {
        super();
    }

    connectedCallback() {
        this.upgradeProperty('currentTab');
        this.upgradeProperty('currentTabName');

        if (!this.shadowRoot) {
            const shadow = this.attachShadow({ mode: 'open' });

            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(TabPanel.css);
            shadow.adoptedStyleSheets = [styleSheet];

            TabPanel.getIconStyleSheet().then(iconStyleSheet => {
                shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, iconStyleSheet];
            });

            this.#tabBar = document.createElement('div');
            this.#tabBar.className = 'tab-bar';
            shadow.appendChild(this.#tabBar);

            this.#prevButton = this.createScrollButton('scroll-left', 'Previous tab', 'ti-chevron-left', -1);
            this.#tabBar.appendChild(this.#prevButton);

            this.#tablist = document.createElement('ul');
            this.#tablist.setAttribute('role', 'tablist');
            this.#tabBar.appendChild(this.#tablist);

            this.#nextButton = this.createScrollButton('scroll-right', 'Next tab', 'ti-chevron-right', 1);
            this.#tabBar.appendChild(this.#nextButton);

            const panelContainer = document.createElement('div');
            panelContainer.className = 'panel-container';
            shadow.appendChild(panelContainer);

            this.#slot = document.createElement('slot');
            panelContainer.appendChild(this.#slot);
            this.#slot.addEventListener('slotchange', () => this.renderTabs());

            this.renderTabs();
        } else {
            this.observeSizes();
        }
    }

    disconnectedCallback() {
        this.#resizeObserver.disconnect();
    }

    fireChangeEvent() {
        const event = new CustomEvent('change', {
            detail: {
                tab: this.currentTab,
                tabName: this.currentTabName
            }
        });
        this.dispatchEvent(event);
    }

    createScrollButton(className, label, icon, direction) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `scroll-button ${className}`;
        button.setAttribute('aria-label', label);
        button.hidden = true;

        const iconElement = document.createElement('i');
        iconElement.className = `ti ${icon}`;
        button.appendChild(iconElement);

        button.addEventListener('click', () => this.selectAdjacentTab(direction));
        return button;
    }

    renderTabs() {
        const panels = this.#slot.assignedElements();

        // Keep the same panel selected if it still exists, otherwise stay near the previous position
        const selectedIndex = panels.indexOf(this.#selectedPanel);
        this.#currentTab = selectedIndex !== -1
            ? selectedIndex
            : Math.max(0, Math.min(this.#currentTab, panels.length - 1));

        const tabs = panels.map((panel, index) => {
            let uniqueId = this.#tabIds.get(panel);
            if (!uniqueId) {
                uniqueId = generateUUID();
                this.#tabIds.set(panel, uniqueId);
            }

            if (!panel.id) {
                panel.id = `tab-panel-${uniqueId}`;
            }
            panel.role = 'tabpanel';
            panel.setAttribute('aria-labelledby', `tab-${uniqueId}`);

            const tab = document.createElement('li');
            tab.role = 'presentation';

            const tabButton = document.createElement('button');
            tabButton.type = 'button';
            tabButton.role = 'tab';
            tabButton.classList.add('tab');
            tabButton.id = `tab-${uniqueId}`;
            tabButton.setAttribute('aria-controls', panel.id);
            tabButton.textContent = panel.getAttribute('data-tab-name') || `Tab ${index + 1}`;
            tab.appendChild(tabButton);

            tabButton.addEventListener('click', () => {
                this.currentTab = index;
            });

            return tab;
        });

        this.#tablist.replaceChildren(...tabs);
        this.updateTabDisplay();
        this.observeSizes();
    }

    observeSizes() {
        this.#resizeObserver.disconnect();
        this.#resizeObserver.observe(this.#tabBar);
        this.#tablist.querySelectorAll('.tab').forEach(tab => this.#resizeObserver.observe(tab));
    }

    updateOverflow() {
        // Compare against the full bar width so showing the buttons doesn't keep them visible
        const overflowing = this.#tablist.scrollWidth > this.#tabBar.clientWidth;
        this.#prevButton.hidden = !overflowing;
        this.#nextButton.hidden = !overflowing;
    }

    selectAdjacentTab(direction) {
        const tabs = this.#tablist.children;
        if (tabs.length === 0) {
            return;
        }

        this.currentTab = Math.max(0, Math.min(tabs.length - 1, this.#currentTab + direction));

        const tab = tabs[this.#currentTab];
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.#tablist.scrollTo({
            left: tab.offsetLeft - (this.#tablist.clientWidth - tab.offsetWidth) / 2,
            behavior: reduceMotion ? 'auto' : 'smooth'
        });
    }

    upgradeProperty(propertyName) {
        if (Object.prototype.hasOwnProperty.call(this, propertyName)) {
            const propertyValue = this[propertyName];
            delete this[propertyName];
            this[propertyName] = propertyValue;
        }
    }

    updateTabDisplay() {
        if (!this.#slot) {
            return;
        }

        const panels = this.#slot.assignedElements();
        const tabs = this.#tablist.querySelectorAll('[role="tab"]');

        panels.forEach((panel, index) => {
            panel.style.display = index === this.currentTab ? '' : 'none';
        });

        tabs.forEach((tab, index) => {
            tab.setAttribute('aria-selected', index === this.currentTab ? 'true' : 'false');
            tab.classList.toggle('active', index === this.currentTab);
        });

        this.#selectedPanel = panels[this.currentTab] ?? null;
        this.#prevButton.setAttribute('aria-disabled', this.currentTab <= 0 ? 'true' : 'false');
        this.#nextButton.setAttribute('aria-disabled', this.currentTab >= panels.length - 1 ? 'true' : 'false');
    }
}

if (!customElements.get('tab-panel')) {
    customElements.define('tab-panel', TabPanel);
}
