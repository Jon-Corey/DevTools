import * as fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export default function (eleventyConfig, pluginOptions) {
    eleventyConfig.on('eleventy.after', async ({ directories, outputMode }) => {
        if (outputMode && outputMode !== 'fs') {
            return;
        }

        const siteOutputDir = directories?.output ?? '_site';
        await addAssetsManifestToServiceWorker(siteOutputDir, pluginOptions);
    });
}

async function addAssetsManifestToServiceWorker(siteOutputDir, pluginOptions) {
    const ignoredFolders = new Set((pluginOptions?.ignoredFolders ?? []).map(normalizePathForMatch));
    const ignoredFiles = new Set((pluginOptions?.ignoredFiles ?? []).map(normalizePathForMatch));

    const allFiles = listFilesRecursively(siteOutputDir)
        .map(filePath => filePath.split(path.sep).join('/'));
    const assets = allFiles
        .filter(relPath => !shouldIgnorePath(relPath, ignoredFolders, ignoredFiles))
        .map(relPath => `/${relPath}`)
        .sort((a, b) => a.localeCompare(b));

    assets.sort((a, b) => a.localeCompare(b));

    const manifest = {
        version: randomUUID(),
        assets
    };

    const stringContent = `self.assetsManifest = ${JSON.stringify(manifest, null, 4)};`;
    const serviceWorkerPath = path.join(siteOutputDir, 'service-worker.js');

    // Replace {{ assetsManifest }} with the actual manifest content
    let serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf-8');
    serviceWorkerContent = serviceWorkerContent.replace('{{ assetsManifest }}', stringContent);
    fs.writeFileSync(serviceWorkerPath, serviceWorkerContent);
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
