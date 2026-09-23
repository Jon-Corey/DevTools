import * as fs from 'node:fs';
import path from 'node:path';
import bundleModules from './config/bundle-modules.js';
import assetsManifest from './config/assets-manifest.js';
import subsetTabler from './config/subset-tabler.js';

const THIRD_PARTY_MODULES = [
    {
        entry: '@colordx/core',
        output: 'colordx/colordx.js'
    },
    {
        entry: '@colordx/core/plugins/lab',
        output: 'colordx/lab.js'
    },
    {
        entry: '@colordx/core/plugins/lch',
        output: 'colordx/lch.js'
    },
    {
        entry: '@colordx/core/plugins/cmyk',
        output: 'colordx/cmyk.js'
    },
    {
        entry: '@colordx/core/plugins/hsv',
        output: 'colordx/hsv.js'
    },
    {
        entry: '@colordx/core/plugins/hwb',
        output: 'colordx/hwb.js'
    },
    {
        entry: '@colordx/core/plugins/p3',
        output: 'colordx/p3.js'
    },
    {
        entry: '@colordx/core/plugins/rec2020',
        output: 'colordx/rec2020.js'
    },
    {
        entry: '@colordx/core/plugins/a98rgb',
        output: 'colordx/a98rgb.js'
    },
    {
        entry: '@colordx/core/plugins/prophoto',
        output: 'colordx/prophoto.js'
    },
    {
        entry: '@colordx/core/plugins/names',
        output: 'colordx/names.js'
    },
    {
        entry: '@colordx/core/plugins/a11y',
        output: 'colordx/a11y.js'
    },
    {
        entry: '@glypht/core',
        output: 'glypht/glypht.js',
        bundleFiles: [
            'font-worker.worker.js',
            'compression-worker.worker.js'
        ],
        copyFiles: [
            'woff1.wasm',
            'woff2.wasm'
        ]
    },
    {
        entry: '@imagemagick/magick-wasm',
        output: 'magick/magick.js',
        copyFiles: [
            'x86/magick.wasm'
        ]
    },
    {
        entry: 'fflate',
        output: 'fflate/fflate.js'
    },
    {
        entry: 'prismjs',
        output: 'prism/prism.js',
        bundleFiles: ['components/prism-json.js']
    },
    {
        entry: 'svgo/browser',
        output: 'svgo/svgo.js'
    }
];
const SERVICE_WORKER_ASSET_OPTIONS = {
    // Don't cache files that are not needed by users
    ignoredFolders: [
        '/assets/images/splashes' // Not used by most devices and not critical for the ones that do use them
    ],
    ignoredFiles: [
        'staticwebapp.config.json', // Only used server-side
        'service-worker.js', // The service worker itself should not be cached by the service worker
        'robots.txt', // Only used by crawlers
        '/assets/images/card.svg', // Just a source for the PNG version
        '/assets/images/card.png' // Just used for link previews on other sites
    ]
};

export default async function (eleventyConfig) {
    // Set the input directory to `src`
    eleventyConfig.setInputDirectory('src');

    // Pass through static assets
    eleventyConfig.addPassthroughCopy('src/assets');

    // Pass through individual files in the root
    eleventyConfig.addPassthroughCopy("src/robots.txt");
    eleventyConfig.addPassthroughCopy("src/manifest.webmanifest");
    eleventyConfig.addPassthroughCopy("src/staticwebapp.config.json");
    eleventyConfig.addPassthroughCopy("src/service-worker.js");

    // addPassthroughCopy globs prevent hot reload on adjacent templates (issue: https://github.com/11ty/eleventy/issues/3852)
    // This workaround can be removed once this site is updated to Eleventy v4
    // eleventyConfig.addPassthroughCopy('src/tools/**/*.js');
    // eleventyConfig.addPassthroughCopy('src/tools/**/*.css');
    const toolsDir = 'src/tools';
    const files = fs.readdirSync(toolsDir, { recursive: true });
    const passthroughFiles = files
        .filter(file => file.endsWith('.js') || file.endsWith('.css'))
        .map(file => path.join(toolsDir, file));
    passthroughFiles.forEach(file => {
        eleventyConfig.addPassthroughCopy(file);
    });

    // Merge data from multiple sources (such as tags)
    eleventyConfig.setDataDeepMerge(true);

    // Add a shortcode to filter and sort collections down to just tool categories
    eleventyConfig.addFilter('get_tool_categories', function(collections) {
        return Object.entries(collections)
            .filter(([name]) => name !== 'all' && name !== 'tool')
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    });

    // Add plugins
    eleventyConfig.addPlugin(bundleModules, { modules: THIRD_PARTY_MODULES });
    eleventyConfig.addPlugin(assetsManifest, SERVICE_WORKER_ASSET_OPTIONS);
    eleventyConfig.addPlugin(subsetTabler);
};
