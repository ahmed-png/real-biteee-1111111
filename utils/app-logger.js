'use strict';

const util = require('node:util');
const MAX_LOG_LINES = 1000;
const recentLogs = [];

function write(level, output, args) {
    const message = util.format(...args);
    const formatted = `${new Date().toISOString()} [${level}] ${message}`;
    for (const line of formatted.split(/\r?\n/)) {
        if (line) recentLogs.push(line);
    }
    if (recentLogs.length > MAX_LOG_LINES) {
        recentLogs.splice(0, recentLogs.length - MAX_LOG_LINES);
    }
    output.write(`${formatted}\n`);
}

function getRecentLogs(limit = 200) {
    const safeLimit = Number.isInteger(limit) ? Math.min(MAX_LOG_LINES, Math.max(1, limit)) : 200;
    return recentLogs.slice(-safeLimit).reverse();
}

const logger = {
    log: (...args) => write('INFO', process.stdout, args),
    info: (...args) => write('INFO', process.stdout, args),
    warn: (...args) => write('WARN', process.stderr, args),
    error: (...args) => write('ERROR', process.stderr, args),
    debug: (...args) => {
        if (process.env.LOG_LEVEL === 'debug') write('DEBUG', process.stdout, args);
    },
    getRecentLogs,
};

module.exports = Object.freeze(logger);
