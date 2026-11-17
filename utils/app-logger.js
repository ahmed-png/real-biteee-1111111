'use strict';

const util = require('node:util');

function write(level, output, args) {
    const message = util.format(...args);
    output.write(`${new Date().toISOString()} [${level}] ${message}\n`);
}

const logger = {
    log: (...args) => write('INFO', process.stdout, args),
    info: (...args) => write('INFO', process.stdout, args),
    warn: (...args) => write('WARN', process.stderr, args),
    error: (...args) => write('ERROR', process.stderr, args),
    debug: (...args) => {
        if (process.env.LOG_LEVEL === 'debug') write('DEBUG', process.stdout, args);
    },
};

module.exports = Object.freeze(logger);
