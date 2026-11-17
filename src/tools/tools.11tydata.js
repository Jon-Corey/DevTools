import fs from 'node:fs';
import path from 'node:path';
import { validateTool } from '../../config/validate-data.js';

function getSiblingAssetIfExists(data, file) {
    return fs.existsSync(path.join(path.dirname(data.page.inputPath), file))
        ? [`${data.page.url}${file}`]
        : [];
}

export default {
    layout: 'tool',
    tags: ['tool'],
    eleventyDataSchema: validateTool,
    eleventyComputed: {
        js:  data => getSiblingAssetIfExists(data, 'tool.js'),
        css: data => getSiblingAssetIfExists(data, 'tool.css'),
    }
};
