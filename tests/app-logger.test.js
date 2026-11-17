'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

test('shared application logger formats levels and arguments consistently', () => {
    const loggerPath = path.resolve(__dirname, '../utils/app-logger.js');
    const result = spawnSync(process.execPath, [
        '-e',
        `const logger = require(${JSON.stringify(loggerPath)}); logger.info('balance: %d', 25); logger.warn('retry'); logger.error(new Error('failed')); logger.debug('details');`,
    ], {
        encoding: 'utf8',
        env: { ...process.env, LOG_LEVEL: 'debug' },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^\d{4}-\d\d-\d\dT[^\n]+ \[INFO\] balance: 25$/m);
    assert.match(result.stdout, /^\d{4}-\d\d-\d\dT[^\n]+ \[DEBUG\] details$/m);
    assert.match(result.stderr, /^\d{4}-\d\d-\d\dT[^\n]+ \[WARN\] retry$/m);
    assert.match(result.stderr, /^\d{4}-\d\d-\d\dT[^\n]+ \[ERROR\] Error: failed$/m);
});
