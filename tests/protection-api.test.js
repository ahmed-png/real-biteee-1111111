'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-protection-api';
process.env.DASHBOARD_KEY = 'test-dashboard-key';
process.env.OWNER_ID = 'test-owner';

const express = require('express');
const db = require('../src/database/db');
const botSettings = require('../src/database/bot-settings-db');
const auth = require('../src/api/routes/auth');
const serverOwnerRouter = require('../src/api/routes/server-owner');

const guildData = new Map([
    ['test-guild', { antiSpamEnabled: false }],
]);
const originalGetGuildData = db.getGuildData;
const originalUpdateGuildData = db.updateGuildData;
const originalBotSettingsGet = botSettings.get;
let server;
let baseUrl;
const token = jwt.sign({ role: 'bot_owner', userId: 'test-owner' }, auth.JWT_SECRET);

const app = express();
app.use(express.json());
app.use('/server/:guildId', serverOwnerRouter);

test.before(async () => {
    db.getGuildData = guildId => guildData.get(guildId) || {};
    db.updateGuildData = (guildId, updates) => {
        const current = guildData.get(guildId) || {};
        const next = { ...current, ...updates };
        if (updates.protectionSettings) {
            next.protectionSettings = { ...current.protectionSettings, ...updates.protectionSettings };
        }
        guildData.set(guildId, next);
        return next;
    };
    botSettings.get = key => key === 'antiRaidAccountAgeEnabled' ? false : originalBotSettingsGet(key);

    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/server/test-guild/protection`;
});

test.after(async () => {
    db.getGuildData = originalGetGuildData;
    db.updateGuildData = originalUpdateGuildData;
    botSettings.get = originalBotSettingsGet;
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function request(path = '', options = {}) {
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            authorization: `Bearer ${token}`,
            ...(options.body ? { 'content-type': 'application/json' } : {}),
            ...options.headers,
        },
    });
}

test('protection GET reflects legacy toggles and global restrictions', async () => {
    const response = await request();
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.protection.antiSpam.enabled, false);
    assert.equal(data.restrictions.antiAccountAge, true);
});

test('protection POST rejects a threshold outside the supported range', async () => {
    const current = await (await request()).json();
    current.protection.antiSpam.threshold = 2;
    const response = await request('', { method: 'POST', body: JSON.stringify(current) });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
    assert.equal(guildData.get('test-guild').protectionSettings, undefined);
});

test('protection POST persists validated settings consumed by the bot', async () => {
    const current = await (await request()).json();
    current.protection.antiLink.enabled = true;
    current.protection.antiSpam.threshold = 3;
    current.protection.antiSpam.duration = 1;
    const response = await request('', { method: 'POST', body: JSON.stringify(current) });
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(guildData.get('test-guild').protectionSettings.antiLink.enabled, true);
    assert.equal(guildData.get('test-guild').antiSpamEnabled, false);

    const saved = await (await request()).json();
    assert.equal(saved.protection.antiLink.enabled, true);
    assert.equal(saved.protection.antiSpam.threshold, 3);
});
