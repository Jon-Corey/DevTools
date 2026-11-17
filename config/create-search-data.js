/**
 * Generates a JSON file containing the search data for every tool page.
 * @param {object} eleventyConfig
 * @param {{ outputPath?: string, collection?: string }} [pluginOptions]
 */
export default function (eleventyConfig, pluginOptions) {
    const outputPath = pluginOptions?.outputPath ?? '/assets/js/search.json';
    const collection = pluginOptions?.collection ?? 'tool';

    eleventyConfig.addTemplate('virtual/search-data.11ty.js', {
        data: {
            permalink: outputPath,
            layout: false,
            eleventyExcludeFromCollections: true,
            // Not a page, so skip the global page validation (title/description)
            eleventyDataSchema: () => {}
        },
        // JSON.stringify guarantees valid JSON regardless of quotes, backslashes, etc. in the page data
        render({ collections }) {
            const searchData = (collections[collection] ?? []).map(item => ({
                title: item.data.title,
                description: item.data.description,
                short_description: item.data.short_description,
                keywords: item.data.keywords ?? '',
                icon: item.data.icon,
                url: item.url
            }));
            return JSON.stringify(searchData);
        }
    });
}
