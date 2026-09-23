const searchInputContainer = document.getElementById('search-input-container');
const searchInput = document.getElementById('search-input');
const resultsPanel = document.getElementById('results-panel');
const searchResultsList = document.getElementById('search-results');
const recentResultsList = document.getElementById('recent-results');

let searchData;
try {
    searchData = JSON.parse(document.getElementById('search-data').textContent);
} catch (error) {
    console.error('Failed to parse search data:', error);
    searchData = [];
}

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

    // Populate the recent results list from localStorage
    const recentResults = getRecentResults();
    const reversedRecentResults = [...recentResults].reverse();
    for (const result of reversedRecentResults) {
        const data = searchData.find(item => item.title === result);
        if (data) {
            renderSearchResult(data, recentResultsList);
        }
    }
    if (recentResultsList.querySelectorAll('li').length === 0) {
        recentResultsList.innerHTML = '<li class="text-subtle">No recent searches</li>';
    }

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
})();

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
    if (gridLayout) {
        gridLayout.classList.add('sidebar-open-small');
    }
}

/**
 * Removes the 'sidebar-open-small' class from the grid layout to close the sidebar on small screens.
 * The 'sidebar-open-small' class does not affect large screens.
 */
function closeSidebarSmall() {
    const gridLayout = document.getElementById('grid-layout');
    if (gridLayout) {
        gridLayout.classList.remove('sidebar-open-small');
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
            selectedItem.previousElementSibling.classList.add('selected');
        } else if (!selectedItem) {
            const firstItem = resultsPanel.querySelector('li');
            if (firstItem) {
                firstItem.classList.add('selected');
            }
        }
    } else if (event.key === 'ArrowDown') {
        // Move the selection down in the search results.
        event.preventDefault();
        const selectedItem = resultsPanel.querySelector('li.selected');
        if (selectedItem && selectedItem.nextElementSibling) {
            selectedItem.classList.remove('selected');
            selectedItem.nextElementSibling.classList.add('selected');
        } else if (!selectedItem) {
            const firstItem = resultsPanel.querySelector('li');
            if (firstItem) {
                firstItem.classList.add('selected');
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
            firstItem.classList.add('selected');
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
            firstItem.classList.add('selected');
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
