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

// Set the initial sidebar state for large screens based on localStorage when the page loads.
(() => {
    const sidebarClosed = localStorage.getItem('sidebarClosed') === 'true';
    if (sidebarClosed) {
        const gridLayout = document.getElementById('grid-layout');
        if (gridLayout) {
            gridLayout.classList.add('sidebar-closed-large');
        }
    }
})();

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
