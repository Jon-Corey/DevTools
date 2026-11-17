function fail(data, message) {
    throw new Error(`${data.page.inputPath}: ${message}`);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

export function validatePage(data) {
    for (const key of ['title', 'description']) {
        if (!isNonEmptyString(data[key])) fail(data, `missing or empty "${key}"`);
    }
}

export function validateTool(data) {
    validatePage(data);
    if (!isNonEmptyString(data.short_description)) fail(data, 'missing "short_description"');
    if (!isNonEmptyString(data.icon) || !data.icon.startsWith('ti-')) fail(data, '"icon" must be a ti-* class');
    const categories = (data.tags ?? []).filter(t => t !== 'tool');
    if (categories.length !== 1) fail(data, `expected exactly one category tag, got [${categories}]`);
}
