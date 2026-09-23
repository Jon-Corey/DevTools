import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlyphtContext, WoffCompressionContext } from '@glypht/core';

const tablerCssPath = fileURLToPath(import.meta.resolve(`@tabler/icons-webfont/dist/tabler-icons.min.css`));
const tablerFontPath = fileURLToPath(import.meta.resolve(`@tabler/icons-webfont/dist/fonts/tabler-icons.ttf`));

const classRegex = /ti-[\w\-]+/gi;
const versionRegex = /Tabler Icons [\d\.]+/i;
const classHexRegex = /\.(ti-[\w\-]+)::?before\s*{\s*content:\s*"\\([0-9a-f]+)/gi;
const cssHeaderRegex = /^([\s\S]*?)\.ti-/i;
const fontSourceRegex = /src:[^};]*/i;

export default function (eleventyConfig, pluginOptions) {
    const cssPath = pluginOptions?.cssPath ?? ['assets', 'css'];
    const cssFileName = pluginOptions?.cssFileName ?? 'tabler-icons.css';

    const fontPath = pluginOptions?.fontPath ?? ['assets', 'fonts'];
    const fontFileName = pluginOptions?.fontFileName ?? 'tabler-icons.woff2';

    const fileTypesToCheck = pluginOptions?.fileTypesToCheck ?? ['html', 'md', 'js'];

    eleventyConfig.on('eleventy.before', async ({ directories, outputMode }) => {
        if (outputMode && outputMode !== 'fs') {
            return;
        }

        const siteInputDir = directories?.input ?? 'src';
        const siteOutputDir = directories?.output ?? '_site';
        const outputCssPath = path.join(siteOutputDir, ...cssPath, cssFileName);
        const outputFontPath = path.join(siteOutputDir, ...fontPath, fontFileName);
        const relativeFontPath = path.join(...fontPath, fontFileName);

        await subsetTabler(siteInputDir, outputCssPath, outputFontPath, relativeFontPath, fileTypesToCheck);
    });
}

/**
 * Handles the subsetting of Tabler CSS and font files based on the classes used in the site. May skip generation if there are no changes needed.
 * @param {string} siteInputDir The root directory of the site input files.
 * @param {string} outputCssPath The path to the output CSS file.
 * @param {string} outputFontPath The path to the output font file.
 * @param {string[]} fileTypesToCheck The list of file types to check for Tabler classes.
 * @returns {Promise<void>}
 */
async function subsetTabler(siteInputDir, outputCssPath, outputFontPath, relativeFontPath, fileTypesToCheck) {
    const filesToCheck = listFilesRecursively(siteInputDir, fileTypesToCheck);
    const tablerClasses = findTablerClasses(siteInputDir, filesToCheck);

    if (shouldGenerateSubset(tablerClasses, outputCssPath, outputFontPath) === false) {
        return;
    }

    const classHexMap = getClassHexMap(tablerClasses);
    const codePoints = getCodePoints(classHexMap);

    createSubsettedCss(classHexMap, outputCssPath, relativeFontPath);
    await createSubsettedFont(codePoints, outputFontPath);
}

/**
 * Lists all files in the given directory and its subdirectories that match the specified file types.
 * @param {string} rootDir The root directory to start the recursive search from.
 * @param {string[]} fileTypesToCheck The list of file types to look for.
 * @returns {string[]} The list of files.
 */
function listFilesRecursively(rootDir, fileTypesToCheck) {
    const files = [];

    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(absolutePath);
            } else if (entry.isFile() && fileTypesToCheck.includes(path.extname(entry.name).slice(1))) {
                files.push(path.relative(rootDir, absolutePath));
            }
        }
    }

    walk(rootDir);
    return files;
}

/**
 * Finds all unique Tabler CSS classes used in the specified files.
 * @param {string} siteInputDir The root directory of the site input files.
 * @param {string[]} filesToCheck The list of files to check for Tabler classes.
 * @returns {Set<string>} The list of unique Tabler CSS classes found in the files.
 */
function findTablerClasses(siteInputDir, filesToCheck) {
    const classNames = new Set();

    for (const file of filesToCheck) {
        const filePath = path.join(siteInputDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const matches = content.match(classRegex);
        for (const match of matches || []) {
            classNames.add(match);
        }
    }

    // Filter out nonexistent tabler classes
    const cssContent = fs.readFileSync(tablerCssPath, 'utf-8');
    const existingClasses = new Set(cssContent.match(classRegex) || []);
    for (const className of Array.from(classNames)) {
        if (!existingClasses.has(className)) {
            classNames.delete(className);
        }
    }

    return classNames;
}

/**
 * Determines whether a subset of the Tabler CSS/Font should be generated. True if the CSS or font files do not exist, if the list of icons used has changed, or if the version has changed.
 * @param {Set<string>} tablerClasses The list of Tabler CSS classes used in the site.
 * @param {string} outputCssPath The path to the Tabler CSS file.
 * @param {string} outputFontPath The path to the Tabler font file.
 * @returns {boolean} Whether a subset of the Tabler CSS/Font should be generated.
 */
function shouldGenerateSubset(tablerClasses, outputCssPath, outputFontPath) {
    if (!fs.existsSync(outputCssPath) || !fs.existsSync(outputFontPath)) {
        console.info('[subset-tabler] Output CSS or font file does not exist; regenerating subset.');
        return true;
    }

    const cssContent = fs.readFileSync(outputCssPath, 'utf-8');
    const existingClasses = new Set(cssContent.match(classRegex) || []);

    if (tablerClasses.size !== existingClasses.size || Array.from(tablerClasses).some(cssClass => !existingClasses.has(cssClass))) {
        console.info('[subset-tabler] Tabler classes have changed; regenerating subset.');
        return true;
    }

    const existingVersionMatch = cssContent.match(versionRegex);
    if (!existingVersionMatch) {
        console.info('[subset-tabler] Tabler version can\'t be determined; regenerating subset.');
        return true;
    }

    const sourceCssContent = fs.readFileSync(tablerCssPath, 'utf-8');
    const sourceVersionMatch = sourceCssContent.match(versionRegex);
    if (!sourceVersionMatch || sourceVersionMatch[0] !== existingVersionMatch[0]) {
        console.info('[subset-tabler] Tabler version has changed; regenerating subset.');
        return true;
    }

    return false;
}

/**
 * Gets a map of Tabler CSS class names to their corresponding hex character codes, filtered by the specified list of Tabler classes.
 * @param {Set<string>} tablerClasses The list of Tabler CSS classes to include in the map.
 * @returns {Map<string, string>} A map of Tabler CSS class names to their corresponding hex character codes.
 */
function getClassHexMap(tablerClasses) {
    const classHexMap = new Map();
    const cssContent = fs.readFileSync(tablerCssPath, 'utf-8');

    for (const match of cssContent.matchAll(classHexRegex)) {
        const className = match[1];
        const hexCode = match[2];
        if (tablerClasses.has(className)) {
            classHexMap.set(className, hexCode);
        }
    }

    return classHexMap;
}

/**
 * Gets an array of code points corresponding to the hex character codes in the map.
 * @param {Map<string, string>} classHexMap A map of Tabler CSS class names to their corresponding hex character codes.
 * @returns {number[]} An array of code points corresponding to the hex character codes in the map.
 */
function getCodePoints(classHexMap) {
    const codePoints = new Set();
    for (const hexCode of classHexMap.values()) {
        codePoints.add(parseInt(hexCode, 16));
    }
    return Array.from(codePoints);
}

/**
 * Creates a subsetted CSS file containing only the specified Tabler CSS classes.
 * @param {Map<string, string>} classHexMap A map of Tabler CSS class names to their corresponding hex character codes.
 * @param {string} outputCssPath The path to the output CSS file.
 * @param {string} relativeFontPath The relative path to the font file from the site root.
 */
function createSubsettedCss(classHexMap, outputCssPath, relativeFontPath) {
    let content = getCssHeader(relativeFontPath);

    classHexMap.forEach((hexCode, className) => {
        content += `.${className}::before{content:"\\${hexCode}"}`;
    });


    const dir = path.dirname(outputCssPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputCssPath, content);
}

/**
 * Gets the CSS header from the Tabler CSS file and updates the font source to the specified relative font path.
 * @param {string} relativeFontPath The relative path to the font file.
 * @returns {string} The CSS header with the updated font source.
 */
function getCssHeader(relativeFontPath) {
    const cssContent = fs.readFileSync(tablerCssPath, 'utf-8');
    const headerMatch = cssContent.match(cssHeaderRegex);
    if (!headerMatch) {
        return '';
    }
    const newSourceCss = `src:url("/${relativeFontPath.replace(/\\/g, '/').replace(/^\/+/, '')}") format("woff2")`;
    const header = headerMatch[1].replace(fontSourceRegex, newSourceCss);
    return header;
}

/**
 * Creates a subsetted font file containing only the specified code points.
 * @param {number[]} codePoints An array of code points to include in the subsetted font.
 * @param {string} outputFontPath The path to the output font file.
 */
async function createSubsettedFont(codePoints, outputFontPath) {
    const compression = new WoffCompressionContext();
    const glypht = new GlyphtContext();

    try {
        const inputFont = new Uint8Array(fs.readFileSync(tablerFontPath));

        const fonts = await glypht.loadFonts([inputFont], { transfer: true });

        const subsettedFont = await fonts[0].subset({
            axisValues: [],
            unicodeRanges: {
                named: [],
                custom: codePoints
            }
        });

        const woff2Font = await compression.compressFromTTF(subsettedFont.data, {
            algorithm: 'woff2',
            transfer: false
        });

        const dir = path.dirname(outputFontPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputFontPath, woff2Font);
    } catch (error) {
        console.error('[subset-tabler] Error creating subsetted font:', error);
    } finally {
        glypht.destroy();
        compression.destroy();
    }
}
