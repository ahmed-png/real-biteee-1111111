'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-legacy-dashboard-123456';
process.env.DASHBOARD_KEY = 'test-dashboard-key';
process.env.OWNER_ID = 'test-owner';

const express = require('express');
const auth = require('../src/api/routes/auth');
const statsRouter = require('../src/api/routes/stats');
const controlRouter = require('../src/api/routes/control');
const db = require('../src/database/db');
const botSettings = require('../src/database/bot-settings-db');

const originalGetAllUsers = db.getAllUsers;
const originalGetAllGuilds = db.getAllGuilds;
const originalSetSetting = botSettings.set;
const settingWrites = [];
const app = express();
app.use(express.json());
app.use('/api/stats', statsRouter);
app.use('/api/control', controlRouter);

let server;
let baseUrl;
const botOwnerToken = jwt.sign({ role: 'bot_owner', userId: 'test-owner' }, auth.JWT_SECRET);
const serverOwnerToken = jwt.sign({ role: 'server_owner', userId: 'server-owner' }, auth.JWT_SECRET);

test.before(async () => {
    db.getAllUsers = () => ({
        'user-1': { userId: 'user-1', balance: 100, bank: 50, warnings: 1, stats: { gamesPlayed: 2, gamesWon: 1 } },
    });
    db.getAllGuilds = () => ({ 'guild-1': { guildId: 'guild-1', name: 'Test Guild' } });
    botSettings.set = (...args) => settingWrites.push(args);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    db.getAllUsers = originalGetAllUsers;
    db.getAllGuilds = originalGetAllGuilds;
    botSettings.set = originalSetSetting;
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function request(path, token, options = {}) {
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            authorization: `Bearer ${token}`,
            ...(options.body ? { 'content-type': 'application/json' } : {}),
            ...options.headers,
        },
    });
}

test('legacy stats data reads the live database cache', async () => {
    const response = await request('/api/stats', botOwnerToken);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.stats.totalUsers, 1);
    assert.equal(data.stats.totalGuilds, 1);
    assert.equal(data.stats.totalMoney, 150);
    assert.ok(data.stats.totalCmds > 0);
});

test('server-owner tokens cannot access bot-wide stats or control routes', async () => {
    const stats = await request('/api/stats', serverOwnerToken);
    const settings = await request('/api/control/settings', serverOwnerToken, {
        method: 'POST',
        body: JSON.stringify({ autoMessagesEnabled: false }),
    });
    const restart = await request('/api/control/restart', serverOwnerToken, { method: 'POST' });

    assert.equal(stats.status, 403);
    assert.equal(settings.status, 403);
    assert.equal(restart.status, 403);
    assert.deepEqual(settingWrites, []);
});

test('bot-owner token can use legacy control routes', async () => {
    const response = await request('/api/control/settings', botOwnerToken, {
        method: 'POST',
        body: JSON.stringify({ autoMessagesEnabled: false }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(settingWrites, [['autoMessagesEnabled', false]]);
});
