const searchInputContainer = document.getElementById('search-input-container');
const searchInput = document.getElementById('search-input');
const resultsPanel = document.getElementById('results-panel');
const searchResultsList = document.getElementById('search-results');
const recentResultsList = document.getElementById('recent-results');

/** @type {Array<{ title: string, description: string, short_description: string, keywords: string, icon: string, url: string }>} */
let searchData = [];

(() => {
    // Set the initial sidebar state for large screens based on localStorage when the page loads.
    const sidebarClosed = localStorage.getItem('sidebarClosed') === 'true';
    if (sidebarClosed) {
        const gridLayout = document.getElementById('grid-layout');
        if (gridLayout) {
            gridLayout.classList.add('sidebar-closed-large');
        }
    }

    // Set up the search

    // Show the appropriate search input overlay based on the user's platform
    if (isApplePlatform()) {
        searchInput.ariaKeyShortcuts = "Meta+K Control+K";
        searchInputContainer.classList.add('show-apple-shortcut');
    }

    // Load the search data, then populate the recent results list
    loadSearchData().then(renderRecentResults);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('focusin', handleFocusIn);
    searchInput.addEventListener('keydown', handleSearchKeyDown);
    searchInput.addEventListener('focus', () => {
        updateResultsPanel();
        showResultsPanel();
    });
    searchInput.addEventListener('blur', () => {
        // Remove 'selected' class from all search results while the input is blurred.
        const selectedItems = resultsPanel.querySelectorAll('li.selected');
        selectedItems.forEach(item => item.classList.remove('selected'));
    });
    searchInput.addEventListener('input', updateResultsPanel);

    // Restore and persist the values of elements marked with the data-persist attribute.
    initializePersistedInputs();
})();

/**
 * Finds all elements with a data-persist attribute, restores their values from localStorage, and saves their values to localStorage whenever they change.
 * Keys are in the format `${toolSlug}.${elementId}`.
 */
function initializePersistedInputs() {
    const toolSlug = getToolSlug();
    const elements = document.querySelectorAll('[data-persist]');

    for (const element of elements) {
        if (!element.id) {
            console.warn('Element with data-persist attribute is missing an id:', element);
            continue;
        }

        const key = `${toolSlug}.${element.id}`;

        // Custom elements must be defined before setting their value
        const tagName = element.tagName.toLowerCase();
        const ready = tagName.includes('-') ? customElements.whenDefined(tagName) : Promise.resolve();

        ready.then(() => {
            restorePersistedValue(element, key);

            const save = () => savePersistedValue(element, key);
            if (element instanceof HTMLDetailsElement) {
                element.addEventListener('toggle', save);
            } else {
                element.addEventListener('input', save);
                element.addEventListener('change', save);
            }
        });
    }
}

/**
 * Restores an element's value from localStorage, if a value has been stored for the given key.
 * @param {HTMLElement} element  The element whose value should be restored.
 * @param {string} key  The localStorage key.
 */
function restorePersistedValue(element, key) {
    let storedValue;
    try {
        storedValue = localStorage.getItem(key);
    } catch (error) {
        return;
    }
    if (storedValue === null) {
        return;
    }

    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
        element.checked = storedValue === 'true';
    } else if (element instanceof HTMLDetailsElement) {
        element.open = storedValue === 'true';
    } else if (element instanceof HTMLSelectElement && element.multiple) {
        try {
            const selectedValues = JSON.parse(storedValue);
            for (const option of element.options) {
                option.selected = selectedValues.includes(option.value);
            }
        } catch (error) {
            // Ignore malformed stored values.
        }
    } else if (element instanceof HTMLSelectElement) {
        // Only restore the value if a matching option still exists.
        if ([...element.options].some(option => option.value === storedValue)) {
            element.value = storedValue;
        }
    } else if (element instanceof HTMLInputElement && element.type === 'file') {
        // File inputs cannot be restored.
    } else {
        element.value = storedValue;
    }
}

/**
 * Saves an element's current value to localStorage.
 * @param {HTMLElement} element  The element whose value should be saved.
 * @param {string} key  The localStorage key.
 */
function savePersistedValue(element, key) {
    try {
        if (element instanceof HTMLInputElement && element.type === 'radio') {
            // Checking a radio button unchecks the others in its group without firing events on them so update every persisted radio button in the same group.
            const group = element.name
                ? document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"][data-persist]`)
                : [element];
            for (const radio of group) {
                if (radio.id) {
                    localStorage.setItem(`${getToolSlug()}.${radio.id}`, String(radio.checked));
                }
            }
        } else if (element instanceof HTMLInputElement && element.type === 'checkbox') {
            localStorage.setItem(key, String(element.checked));
        } else if (element instanceof HTMLDetailsElement) {
            localStorage.setItem(key, String(element.open));
        } else if (element instanceof HTMLSelectElement && element.multiple) {
            const selectedValues = [...element.selectedOptions].map(option => option.value);
            localStorage.setItem(key, JSON.stringify(selectedValues));
        } else if (element instanceof HTMLInputElement && element.type === 'file') {
            // File inputs cannot be persisted.
        } else {
            localStorage.setItem(key, String(element.value));
        }
    } catch (error) {
        console.error(`Failed to save value for "${key}" to localStorage:`, error);
    }
}

/**
 * Gets the slug of the current tool from the URL path (e.g. '/tool/tool-slug/' -> 'tool-slug').
 * @returns {string} The tool slug.
 */
function getToolSlug() {
    const segments = window.location.pathname.split('/').filter(segment => segment !== '' && segment !== 'index.html');
    return segments.at(-1) ?? '';
}

/**
 * Gets the current theme.
 * @returns {string} The current theme ("dark" or "light").
 */
function getTheme() {
    let theme = localStorage.getItem('theme')?.trim()?.toLowerCase() ?? '';
    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
}

/**
 * Toggles the theme between dark and light modes, saves the preference in localStorage, and updates the document's data-theme attribute.
 */
function toggleTheme() {
    const currentTheme = getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
}

/**
 * Toggles the 'sidebar-closed-large' class on the grid layout to open or close the sidebar on large screens.
 * The 'sidebar-closed-large' class does not affect small screens.
 */
function toggleSidebarLarge() {
    const sidebarClosed = localStorage.getItem('sidebarClosed') === 'true';
    localStorage.setItem('sidebarClosed', !sidebarClosed);

    const gridLayout = document.getElementById('grid-layout');
    if (gridLayout) {
        gridLayout.classList.toggle('sidebar-closed-large', !sidebarClosed);
    }
}

/**
 * Adds the 'sidebar-open-small' class to the grid layout to open the sidebar on small screens.
 * The 'sidebar-open-small' class does not affect large screens.
 */
function openSidebarSmall() {
    const gridLayout = document.getElementById('grid-layout');
    const closeMenuButton = document.getElementById('close-menu-button');
    if (gridLayout) {
        gridLayout.classList.add('sidebar-open-small');
    }
    if (closeMenuButton) {
        closeMenuButton.focus();
    }
}

/**
 * Removes the 'sidebar-open-small' class from the grid layout to close the sidebar on small screens.
 * The 'sidebar-open-small' class does not affect large screens.
 */
function closeSidebarSmall() {
    const gridLayout = document.getElementById('grid-layout');
    const openMenuButton = document.getElementById('open-menu-button');
    if (gridLayout) {
        gridLayout.classList.remove('sidebar-open-small');
    }
    if (openMenuButton) {
        openMenuButton.focus();
    }
}

/**
 * Handles the keydown event for the document. Specifically, it focuses the search input when the user presses Ctrl+K or Cmd+K.
 * @param {KeyboardEvent} event  The keyboard event triggered when a key is pressed.
 */
function handleKeyDown(event) {
    // Only allow Meta+K on Apple since Meta+K is a reserved system shortcut on Windows.
    if (isApplePlatform() && event.key.toLowerCase() === 'k' && event.metaKey) {
        event.preventDefault();
        searchInput.focus();
    } else if (event.key.toLowerCase() === 'k' && event.ctrlKey) {
        event.preventDefault();
        searchInput.focus();
    }
}

/**
 * Handles the pointer down event for the window. Specifically, it hides the search results panel if the user clicks outside of the search UI elements.
 * @param {PointerEvent} event  The pointer event triggered when a pointer is pressed down.
 */
function handlePointerDown(event) {
    if (!isSearchUiElement(event.target)) {
        hideResultsPanel();
    }
}

/**
 * Handles the focusin event for the window. Specifically, it hides the search results panel if the user focuses outside of the search UI elements.
 * @param {FocusEvent} event  The focus event triggered when an element gains focus.
 */
function handleFocusIn(event) {
    if (!isSearchUiElement(event.target)) {
        hideResultsPanel();
    }
}

/**
 * Fetches the search data generated at build time and stores it in `searchData`.
 * On failure, `searchData` stays empty so the search UI still works (with no results).
 */
async function loadSearchData() {
    try {
        const response = await fetch('/assets/js/search.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        searchData = await response.json();
    } catch (error) {
        console.error('Failed to load search data:', error);
        searchData = [];
    }

    // If the user started typing before the data arrived, refresh the results
    if (searchInput.value.trim() !== '') {
        updateResultsPanel();
    }
}

/**
 * Populates the recent results list from localStorage using the loaded search data.
 */
function renderRecentResults() {
    recentResultsList.innerHTML = '';
    const reversedRecentResults = [...getRecentResults()].reverse();
    for (const result of reversedRecentResults) {
        const data = searchData.find(item => item.title === result);
        if (data) {
            renderSearchResult(data, recentResultsList);
        }
    }
    if (recentResultsList.querySelectorAll('li').length === 0) {
        recentResultsList.innerHTML = '<li class="text-subtle">No recent searches</li>';
    }

    // If the panel is open with an empty query, re-select the most recent result
    if (resultsPanel.classList.contains('open') && searchInput.value.trim() === '') {
        updateResultsPanel();
    }
}

/**
 * Handles the click event for search result links. Specifically, it updates the recent search results in localStorage.
 * @param {MouseEvent} event  The mouse event triggered when a search result link is clicked.
 */
function handleLinkClick(event) {
    const link = event.currentTarget;
    const title = link.querySelector('.title')?.textContent;
    if (title) {
        const recentResults = getRecentResults();
        if (recentResults.includes(title)) {
            recentResults.splice(recentResults.indexOf(title), 1);
        }
        recentResults.push(title);

        // Limit to the 5 most recent searches
        if (recentResults.length > 5) {
            recentResults.splice(0, recentResults.length - 5);
        }

        localStorage.setItem('recentResults', JSON.stringify(recentResults));
    }
}

/**
 * Handles the keydown event for the search input. Specifically, it manages navigation and selection within the search results.
 * @param {KeyboardEvent} event  The keyboard event triggered when a key is pressed while the search input is focused.
 */
function handleSearchKeyDown(event) {
    if (event.key === 'Escape') {
        event.preventDefault();
        searchInput.value = '';
        searchInput.blur();
        hideResultsPanel();
    } else if (event.key === 'ArrowUp') {
        // Move the selection up in the search results.
        event.preventDefault();
        const selectedItem = resultsPanel.querySelector('li.selected');
        if (selectedItem && selectedItem.previousElementSibling) {
            selectedItem.classList.remove('selected');
            selectElement(selectedItem.previousElementSibling);
        } else if (!selectedItem) {
            const firstItem = resultsPanel.querySelector('li');
            if (firstItem) {
                selectElement(firstItem);
            }
        }
    } else if (event.key === 'ArrowDown') {
        // Move the selection down in the search results.
        event.preventDefault();
        const selectedItem = resultsPanel.querySelector('li.selected');
        if (selectedItem && selectedItem.nextElementSibling) {
            selectedItem.classList.remove('selected');
            selectElement(selectedItem.nextElementSibling);
        } else if (!selectedItem) {
            const firstItem = resultsPanel.querySelector('li');
            if (firstItem) {
                selectElement(firstItem);
            }
        }
    } else if (event.key === 'Enter') {
        event.preventDefault();
        const selectedItem = resultsPanel.querySelector('li.selected');
        if (selectedItem) {
            const link = selectedItem.querySelector('a');
            if (link) {
                link.click();
            }
        }
    }
}

/**
 * Shows the search results panel by adding the 'open' class.
 */
function showResultsPanel() {
    resultsPanel.classList.add('open');
}
/**
 * Hides the search results panel by removing the 'open' class.
 */
function hideResultsPanel() {
    resultsPanel.classList.remove('open');
}

/**
 * Determines if the given element is part of the search UI (either the search input or the results panel).
 * @param {HTMLElement} element  The element to check.
 * @returns {boolean} True if the element is part of the search UI, false otherwise.
 */
function isSearchUiElement(element) {
    return element === searchInput || resultsPanel.contains(element);
}

/**
 * Updates the visibility and selection state of the search results panel based on the current input value.
 */
function updateResultsPanel() {
    const value = searchInput.value;

    if (value.trim() === '') {
        resultsPanel.classList.remove('show-results');

        // Remove 'selected' class from all search results.
        const selectedItems = resultsPanel.querySelectorAll('li.selected');
        selectedItems.forEach(item => item.classList.remove('selected'));

        // Add 'selected' class to the most recent result, if any.
        const firstItem = recentResultsList.querySelector('li');
        if (firstItem) {
            selectElement(firstItem);
        }
    } else {
        updateSearchResults();

        resultsPanel.classList.add('show-results');

        // Remove 'selected' class from all search results.
        const selectedItems = resultsPanel.querySelectorAll('li.selected');
        selectedItems.forEach(item => item.classList.remove('selected'));

        // Add 'selected' class to the first search result, if any.
        const firstItem = searchResultsList.querySelector('li');
        if (firstItem) {
            selectElement(firstItem);
        }
    }
}

/**
 * Updates the search results based on the current input value.
 */
function updateSearchResults() {
    const value = searchInput.value;
    const searchTerms = value.trim().toLowerCase().split(/\s+/);

    if (value.trim() === '') {
        return;
    }

    let results = [...searchData];

    for (const result of results) {
        let score = 0;
        const title = result.title.toLowerCase();
        const description = result.description.toLowerCase();
        const shortDescription = result.short_description.toLowerCase();
        const keywords = result.keywords.toLowerCase();

        for (const term of searchTerms) {
            let isMatch = false;

            if (title.includes(term)) {
                score += 100;
                isMatch = true;
            }
            if (description.includes(term) || shortDescription.includes(term)) {
                score += 10;
                isMatch = true;
            }
            if (keywords.includes(term)) {
                score += 1;
                isMatch = true;
            }

            // If one of the terms did not match, mark the result as invalid.
            if (!isMatch) {
                score = -1;
                break;
            }
        }
        result.score = score;
    }
    results = results.filter(result => result.score > 0).sort((a, b) => b.score - a.score);
    searchResultsList.innerHTML = '';

    for (const result of results) {
        renderSearchResult(result, searchResultsList);
    }
    if (results.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-subtle';
        li.textContent = 'No results found.';
        searchResultsList.appendChild(li);
    }
}

/**
 * Renders a single search result item and appends it to the specified parent element.
 * @param {Object} item  The search result item to render.
 * @param {HTMLElement} parent  The parent element to which the search result should be appended.
 */
function renderSearchResult(item, parent) {
    const li = document.createElement('li');
    parent.appendChild(li);

    const a = document.createElement('a');
    a.href = item.url;
    li.appendChild(a);

    const icon = document.createElement('i');
    icon.className = `ti ${item.icon} text-accent`;
    icon.ariaHidden = 'true';
    a.appendChild(icon);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = item.title;
    a.appendChild(titleSpan);

    const descriptionSpan = document.createElement('span');
    descriptionSpan.className = 'description';
    descriptionSpan.textContent = item.short_description;
    a.appendChild(descriptionSpan);

    a.addEventListener('click', handleLinkClick);
}

/**
 * Selects the specified element and scrolls it into view smoothly.
 * @param {HTMLElement} element The element to select and scroll into view.
 */
function selectElement(element) {
    if (element) {
        element.classList.add('selected');
        element.scrollIntoView({ behavior: 'smooth', block: 'center', container: 'nearest' });
    }
}

function isApplePlatform() {
    return navigator.platform.startsWith('Mac') || navigator.platform === 'iPhone' || navigator.platform === 'iPad';
}

function getRecentResults() {
    try {
        return localStorage.getItem('recentResults') ? JSON.parse(localStorage.getItem('recentResults')) : [];
    } catch (error) {
        return [];
    }
}
