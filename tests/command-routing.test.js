'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveSetupAction } = require('../utils/command-routing');
const rolesSetup = require('../commands/moderation/setup');
const serverSetup = require('../commands/moderation/server-setup');

test('role and server setup commands do not share the activation alias', () => {
    assert.ok(rolesSetup.aliases.includes('تفعيل'));
    assert.ok(!serverSetup.aliases.includes('تفعيل'));
    assert.ok(!rolesSetup.aliases.some(alias => serverSetup.aliases.includes(alias)));
});

test('bare activation configures moderation roles', () => {
    assert.equal(resolveSetupAction('تفعيل', '!'), 'roles');
    assert.equal(resolveSetupAction('!تفعيل', '!'), 'roles');
    assert.equal(resolveSetupAction('تفعيل رتب', '!'), 'roles');
    assert.equal(resolveSetupAction('!setup', '!'), 'roles');
});

test('server activation builds channels and the full server', () => {
    assert.equal(resolveSetupAction('تفعيل سيرفر', '!'), 'server');
    assert.equal(resolveSetupAction('!تفعيل سيرفر', '!'), 'server');
    assert.equal(resolveSetupAction('setup-server', '!'), 'server');
});

test('reset activation remains distinct from both setup actions', () => {
    assert.equal(resolveSetupAction('اعادة تفعيل', '!'), 'reset-server');
    assert.equal(resolveSetupAction('!reset-server', '!'), 'reset-server');
});

test('unrelated multiword commands are not treated as setup', () => {
    assert.equal(resolveSetupAction('تفعيل كلان', '!'), null);
    assert.equal(resolveSetupAction('!تفعيل خاص', '!'), null);
});
