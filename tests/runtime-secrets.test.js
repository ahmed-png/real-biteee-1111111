'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveRuntimeSecret } = require('../utils/runtime-secrets');

test('configured runtime secrets meet their minimum length', () => {
    const secret = 'a'.repeat(32);
    assert.equal(resolveRuntimeSecret('JWT_SECRET', secret, 32, true), secret);
});

test('production refuses missing or weak runtime secrets', () => {
    assert.throws(() => resolveRuntimeSecret('JWT_SECRET', '', 32, true), /required in production/);
    assert.throws(() => resolveRuntimeSecret('DASHBOARD_KEY', 'short', 16, true), /required in production/);
});

test('development secrets are random and long enough', () => {
    const first = resolveRuntimeSecret('JWT_SECRET', undefined, 32, false);
    const second = resolveRuntimeSecret('JWT_SECRET', undefined, 32, false);
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.notEqual(first, second);
});
