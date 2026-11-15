'use strict';

const crypto = require('crypto');

function resolveRuntimeSecret(name, value, minimumLength, production = process.env.NODE_ENV === 'production') {
    if (typeof value === 'string' && value.length >= minimumLength) {
        return value;
    }

    if (production) {
        throw new Error(`[Config] ${name} is required in production and must be at least ${minimumLength} characters.`);
    }

    return crypto.randomBytes(Math.max(32, Math.ceil(minimumLength / 2))).toString('hex');
}

module.exports = { resolveRuntimeSecret };
