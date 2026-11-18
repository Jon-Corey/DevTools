async function loadStyleSheetFromFile(url) {
    const sheet = new CSSStyleSheet();

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        await sheet.replace(await response.text());
    } catch (error) {
        console.error(`Failed to load component stylesheet: ${url}`, error);
    }

    return sheet;
}

/**
 * Creates a CSSStyleSheet from a CSS string.
 * @param {string} css
 * @returns {CSSStyleSheet}
 */
export function createStyleSheet(css) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
}

// Stylesheets are loaded and processed once per page load and accessible to all components that import this module.
export const [siteStyleSheet, iconStyleSheet] = await Promise.all([
    loadStyleSheetFromFile('/assets/css/site.css'),
    loadStyleSheetFromFile('/assets/css/tabler-icons.css')
]);
