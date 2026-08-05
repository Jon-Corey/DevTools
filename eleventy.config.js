import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import esbuild from 'esbuild';

import getIcons from './src/_data/icons.js';

const THIRD_PARTY_MODULES = [
    {
        entry: '@colordx/core',
        output: 'colordx/colordx.js'
    },
    {
        entry: '@colordx/core/plugins/names',
        output: 'colordx/names.js'
    },
    {
        entry: '@colordx/core/plugins/harmonies',
        output: 'colordx/harmonies.js'
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
            'magick.wasm'
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
        'service-worker-assets.js', // The service worker assets manifest should not be cached by the service worker
        'robots.txt', // Only used by crawlers
        '/assets/images/card.svg', // Just a source for the PNG version
        '/assets/images/card.png' // Just used for link previews on other sites
    ]
};

let thirdPartyModulesBuilt = false;

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

    // Build third-party modules and place them in the output directory
    eleventyConfig.on('eleventy.before', async ({ directories, outputMode }) => {
        if (outputMode && outputMode !== 'fs') {
            return;
        }

        if (thirdPartyModulesBuilt) {
            return;
        }
        
        const siteOutputDir = directories?.output ?? '_site';
        await buildThirdPartyModules(siteOutputDir);
        thirdPartyModulesBuilt = true;
    });

    // Generate the service worker assets manifest
    eleventyConfig.on('eleventy.after', async ({ directories, outputMode }) => {
        if (outputMode && outputMode !== 'fs') {
            return;
        }

        const siteOutputDir = directories?.output ?? '_site';
        await generateServiceWorkerAssetsFile(siteOutputDir);
    });

    // Add a shortcode for rendering icons (e.g. {% icon 'user' %})
    const icons = await getIcons();
    eleventyConfig.addShortcode('icon', function(name, cssClass = '') {
        let svg = icons[name];
        if (!svg) {
            const pageContext = this?.page ?? {};
            const pageRef = pageContext.inputPath || pageContext.url || 'unknown template';
            console.warn(`[icon shortcode] Icon not found: '${name}' in ${pageRef} (url: ${pageContext.url ?? 'unknown'})`);
            return '';
        }
        if (cssClass && cssClass.trim() !== '') {
            // Add the CSS class to the SVG element
            svg = svg.replace('class=\"', `class="${cssClass} `);
        }
        return svg;
    });

    // Add a shortcode to filter and sort collections
    eleventyConfig.addFilter('sort_collections', function(collections) {
        return Object.entries(collections)
            .filter(([name, items]) => name !== 'all')
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    });
};

async function buildThirdPartyModules(siteOutputDir) {
    const outputDir = path.join(siteOutputDir, 'assets', 'js', 'vendor');

    for (const module of THIRD_PARTY_MODULES) {
        const outputPath = path.join(outputDir, module.output);

        await bundleFile(module.entry, outputPath);

        const url = import.meta.resolve(module.entry);
        const entryPath = fileURLToPath(url);

        if (module.bundleFiles && module.bundleFiles.length > 0) {
            await bundleNamedFiles(entryPath, path.dirname(outputPath), module.bundleFiles);
        }

        if (module.copyFiles && module.copyFiles.length > 0) {
            copyNamedFiles(entryPath, path.dirname(outputPath), module.copyFiles);
        }
    }
}

async function bundleFile(entryPath, outputPath) {
    await esbuild.build({
        entryPoints: [entryPath],
        absWorkingDir: process.cwd(),
        outfile: outputPath,
        bundle: true,
        platform: 'browser',
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser'],
        format: 'esm',
        minify: true,
        sourcemap: false,
        legalComments: 'none'
    });
}

async function bundleNamedFiles(entryPath, outputDir, filePaths) {
    const moduleDir = path.dirname(entryPath);
    for (const filePath of filePaths) {
        const sourcePath = path.join(moduleDir, filePath);
        const outputPath = path.join(outputDir, path.basename(filePath));

        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Bundled file not found: ${sourcePath}`);
        }

        await bundleFile(sourcePath, outputPath);
    }
}

function copyNamedFiles(entryPath, outputDir, filePaths) {
    const moduleDir = path.dirname(entryPath);
    for (const filePath of filePaths) {
        const sourcePath = path.join(moduleDir, filePath);
        const outputPath = path.join(outputDir, path.basename(filePath));

        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Copied file not found: ${sourcePath}`);
        }

        fs.copyFileSync(sourcePath, outputPath);
    }
}

async function generateServiceWorkerAssetsFile(siteOutputDir) {
    const ignoredFolders = new Set((SERVICE_WORKER_ASSET_OPTIONS.ignoredFolders ?? []).map(normalizePathForMatch));
    const ignoredFiles = new Set((SERVICE_WORKER_ASSET_OPTIONS.ignoredFiles ?? []).map(normalizePathForMatch));

    const allFiles = listFilesRecursively(siteOutputDir)
        .map(filePath => filePath.split(path.sep).join('/'));
    const assets = allFiles
        .filter(relPath => !shouldIgnorePath(relPath, ignoredFolders, ignoredFiles))
        .map(relPath => `/${relPath}`)
        .sort((a, b) => a.localeCompare(b));
    // Allow the generated manifest to be cached too.
    if (!assets.includes('/service-worker-assets.js') && !ignoredFiles.has('service-worker-assets.js')) {
        assets.push('/service-worker-assets.js');
    }

    assets.sort((a, b) => a.localeCompare(b));

    const manifest = {
        version: randomUUID(),
        assets
    };

    const fileContent = `self.assetsManifest = ${JSON.stringify(manifest, null, 2)};\n`;
    const outputPath = path.join(siteOutputDir, 'service-worker-assets.js');
    fs.writeFileSync(outputPath, fileContent, 'utf8');
}

function listFilesRecursively(rootDir) {
    const files = [];

    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(absolutePath);
            } else if (entry.isFile()) {
                files.push(path.relative(rootDir, absolutePath));
            }
        }
    }

    walk(rootDir);
    return files;
}

function normalizePathForMatch(input) {
    return String(input)
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .trim();
}

function shouldIgnorePath(relPath, ignoredFolders, ignoredFiles) {
    const normalized = normalizePathForMatch(relPath);
    const baseName = path.posix.basename(normalized);

    if (ignoredFiles.has(normalized) || ignoredFiles.has(baseName)) {
        return true;
    }

    for (const folder of ignoredFolders) {
        if (!folder) continue;
        if (normalized === folder || normalized.startsWith(`${folder}/`)) {
            return true;
        }
    }

    return false;
}
