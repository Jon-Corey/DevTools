import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.resolve(__dirname, '..', '..', '.cache', 'icons');
const METADATA_PATH = path.join(CACHE_DIR, 'metadata.json');
const ICONS_JSON_PATH = path.join(CACHE_DIR, 'icons.json');
const TAR_PATH = path.join(CACHE_DIR, 'tabler-icons.tar.gz');
const EXTRACT_DIR = path.join(CACHE_DIR, 'tabler-icons');

const LATEST_RELEASE_URL = 'https://api.github.com/repos/tabler/tabler-icons/releases/latest';
const GITHUB_HEADERS = {
    'User-Agent': 'automated-build-script'
};

const TRANSIENT_FS_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'ENOTEMPTY']);
const RM_MAX_ATTEMPTS = 6;
const RM_BASE_RETRY_DELAY_MS = 100;

const CACHE_CHECK_INTERVAL_HOURS = 12; // Check for new release at most once every 12 hours

export default async function getIcons(config) {
    // Ensure cache directory exists.
    await fs.mkdir(CACHE_DIR, { recursive: true });

    const cacheMetadata = await getCacheMetadata();

    // Early return if we already checked for a new version recently.
    if (cacheMetadata && cacheMetadata.lastChecked) {
        const lastCheckedTime = new Date(cacheMetadata.lastChecked);
        const now = new Date();
        const hoursSinceLastCheck = (now - lastCheckedTime) / (1000 * 60 * 60);
        if (hoursSinceLastCheck < CACHE_CHECK_INTERVAL_HOURS) {
            return JSON.parse(await fs.readFile(ICONS_JSON_PATH, 'utf8'));
        }
    }

    const latestReleaseInfo = await getLatestReleaseInfo();

    let isCacheValid = true;

    if (!cacheMetadata) { 
        // No cache metadata, need to fetch.
        isCacheValid = false;
    } else if (latestReleaseInfo && isLatestVersionNewer(cacheMetadata.version, latestReleaseInfo.version)) {
        // Newer version available, invalidate cache.
        isCacheValid = false;
    } else {
        // Cache is still valid, just update the last checked time.
        await updateLastCheckedTimeInMetadata();
    }

    if (!isCacheValid) {
        await fetchLatestRelease(latestReleaseInfo);
        await updateLastCheckedTimeInMetadata();
    }

    // At this point, we should have the latest icons in the cache.
    try {
        return JSON.parse(await fs.readFile(ICONS_JSON_PATH, 'utf8'));
    } catch (err) {
        console.error('Failed to read icons data:', err);
        return {};
    }
}

async function getCacheMetadata() {
    try {
        const text = await fs.readFile(METADATA_PATH, 'utf8');
        return JSON.parse(text);
    } catch {
        return null;
    }
}

async function updateLastCheckedTimeInMetadata() {
    // 'lastChecked' is the timestamp of the last time we checked for a new release. This is used to avoid checking for a new release on every build.
    const metadata = await getCacheMetadata() || {};
    metadata.lastChecked = new Date().toISOString();
    await fs.writeFile(METADATA_PATH, JSON.stringify(metadata, null, 4), 'utf8');
}

async function updateVersionInMetadata(version) {
    // 'version' is the version number of the latest release we successfully fetched and parsed. This is used to determine if the cache is still valid on subsequent builds.
    const metadata = await getCacheMetadata() || {};
    metadata.version = version;
    await fs.writeFile(METADATA_PATH, JSON.stringify(metadata, null, 4), 'utf8');
}

async function getLatestReleaseInfo() {
    const response = await fetch(LATEST_RELEASE_URL, { headers: GITHUB_HEADERS });
    if (!response.ok) {
        console.warn(`Failed to fetch latest release info: ${response.status} ${response.statusText}`);
        return null;
    }

    const data = await response.json();

    return {
        version: data.tag_name,
        tarUrl: data.tarball_url
    };
}

function isLatestVersionNewer(cachedVersion, latestVersion) {
    const cachedParts = cachedVersion.replace(/^v/, '').split('.').map(Number);
    const latestParts = latestVersion.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(cachedParts.length, latestParts.length); i++) {
        const cachedPart = cachedParts[i] || 0;
        const latestPart = latestParts[i] || 0;
        if (latestPart > cachedPart) return true;
        if (latestPart < cachedPart) return false;
    }
    return false;
}

async function fetchLatestRelease(latestReleaseInfo) {
    if (!latestReleaseInfo) {
        console.error('Cannot fetch latest release: no release info available');
        return null;
    }

    await downloadTarFile(latestReleaseInfo.tarUrl, TAR_PATH);
    await extractTarFile(TAR_PATH, EXTRACT_DIR);

    const iconsFolder = await findIconsFolder();
    if (!iconsFolder) {
        return null;
    }

    // For each SVG file in the folder, read its contents and add it to icons.json
    const icons = {};
    const entries = await fs.readdir(iconsFolder, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.svg')) {
            const iconName = path.basename(entry.name, '.svg');
            const svgContent = prepareSvg(await fs.readFile(path.join(iconsFolder, entry.name), 'utf8'));
            icons[iconName] = svgContent;
        }
    }

    // Output icons.json
    await fs.writeFile(ICONS_JSON_PATH, JSON.stringify(icons, null, 4), 'utf8');

    // Update cache metadata
    await updateVersionInMetadata(latestReleaseInfo.version);

    // Clean up tar and extracted files
    await rmWithRetry(TAR_PATH, { force: true });
    await rmWithRetry(EXTRACT_DIR, { recursive: true, force: true });
}

async function rmWithRetry(targetPath, options) {
    for (let attempt = 1; attempt <= RM_MAX_ATTEMPTS; attempt++) {
        try {
            await fs.rm(targetPath, options);
            return;
        } catch (err) {
            const isTransient = err && TRANSIENT_FS_ERROR_CODES.has(err.code);
            if (!isTransient || attempt === RM_MAX_ATTEMPTS) {
                throw err;
            }

            // Windows can briefly lock extracted files after process exit/indexing.
            await delay(RM_BASE_RETRY_DELAY_MS * attempt);
        }
    }
}

async function downloadTarFile(url, destinationPath) {
    // Ensure output directory exists
    await fs.mkdir(EXTRACT_DIR, { recursive: true });

    const response = await fetch(url, { headers: GITHUB_HEADERS });
    if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`Failed to download latest release tar: ${response.status} ${response.statusText}. ${body}`.trim());
        return null;
    }
    if (!response.body) {
        console.error('Failed to download latest release tar: no response body');
        return null;
    }

    await pipeline(
        Readable.fromWeb(response.body),
        createWriteStream(destinationPath)
    );
}

async function extractTarFile(tarPath, extractTo) {
    // Use tar, which is installed by default on most systems, to extract the tar file.
    return new Promise((resolve, reject) => {
        const tarProcess = spawn('tar', ['-xf', tarPath, '-C', extractTo], { stdio: 'inherit' });
        tarProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`tar process exited with code ${code}`));
            }
        });
        tarProcess.on('error', reject);
    });
}

async function findIconsFolder() {
    // Finds the /icons/outline folder inside the extracted release
    const entries = await fs.readdir(EXTRACT_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    for (const dir of dirs) {
        const candidate = path.join(EXTRACT_DIR, dir);
        if (await pathIsExistingDirectory(path.join(candidate, 'icons', 'outline'))) {
            return path.join(candidate, 'icons', 'outline');
        }
    }
    console.error(`Could not find icons/outline folder in extracted release at ${EXTRACT_DIR}`);
    return null;
}

async function pathIsExistingDirectory(path) {
    try {
        const stat = await fs.stat(path);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

function prepareSvg(svg) {
    // Remove comments
    svg = svg.replace(/<!--[\s\S]*?-->/g, '');

    // Remove extra whitespace
    svg = svg.replace(/\s*\n\s*/g, ' ').replace(/> </g, '><').replace(/\s*>/g, '>').trim();

    // Remove inline styles
    svg = svg.replace(/\s*(width|height|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|style)="[^"]*"(\\n)?/g, '');

    // Remove xmlns attribute
    svg = svg.replace(/\s+xmlns="[^"]*"/, '');

    // Add 'icon' class to the <svg> element
    svg = svg.replace(/<svg/, '<svg class="icon"');

    return svg;
}
