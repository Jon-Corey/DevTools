import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

let thirdPartyModulesBuilt = false;

export default function (eleventyConfig, pluginOptions) {
    eleventyConfig.on('eleventy.before', async ({ directories, outputMode }) => {
        if (outputMode && outputMode !== 'fs') {
            return;
        }

        if (thirdPartyModulesBuilt) {
            return;
        }
        
        const siteOutputDir = directories?.output ?? '_site';
        await buildThirdPartyModules(siteOutputDir, pluginOptions);
        thirdPartyModulesBuilt = true;
    });
}

async function buildThirdPartyModules(siteOutputDir, pluginOptions) {
    const outputDir = path.join(siteOutputDir, 'assets', 'js', 'vendor');

    for (const module of pluginOptions.modules) {
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
