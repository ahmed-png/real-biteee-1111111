'use strict';

function buildGameUrl(baseUrl, gameFile, params = {}) {
    if (typeof gameFile !== 'string' || !/^[a-z0-9-]+\.html$/i.test(gameFile)) {
        throw new TypeError('Game URL must use a valid HTML filename.');
    }

    const url = new URL(`/games/${gameFile}`, baseUrl);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

module.exports = { buildGameUrl };
