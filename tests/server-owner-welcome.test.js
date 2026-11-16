'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-server-owner-welcome';
process.env.DASHBOARD_KEY = 'test-dashboard-key';
process.env.OWNER_ID = 'test-owner';

const express = require('express');
const auth = require('../src/api/routes/auth');
const db = require('../src/database/db');
const serverOwnerRouter = require('../src/api/routes/server-owner');

const guildId = '123456789012345678';
const ownerId = '234567890123456789';
const foreignChannelId = '345678901234567890';
const foreignGuildId = '456789012345678901';
const foreignChannel = {
    id: foreignChannelId,
    guildId: foreignGuildId,
    type: 0,
    name: 'foreign-channel',
};
const guild = {
    id: guildId,
    ownerId,
    channels: {
        cache: new Map(),
        fetch: async id => id === foreignChannelId ? foreignChannel : null,
    },
    members: { me: { permissions: { has: () => true } } },
};
const client = {
    isReady: () => true,
    guilds: { fetch: async id => id === guildId ? guild : null },
};
const app = express();
app.use(express.json());
app.set('client', client);
app.use('/server/:guildId', serverOwnerRouter);

const token = jwt.sign({ role: 'server_owner', userId: ownerId }, auth.JWT_SECRET);
const originalGetGuildData = db.getGuildData;
const originalUpdateGuildData = db.updateGuildData;
let guildData;
let updates;
let server;
let baseUrl;

test.before(async () => {
    db.getGuildData = () => guildData;
    db.updateGuildData = (id, value) => {
        updates.push({ id, value });
        guildData = { ...guildData, ...value };
        return guildData;
    };
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/server/${guildId}`;
});

test.beforeEach(() => {
    guildData = { welcomeChannel: foreignChannelId };
    updates = [];
});

test.after(async () => {
    db.getGuildData = originalGetGuildData;
    db.updateGuildData = originalUpdateGuildData;
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function request(path, options = {}) {
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            authorization: `Bearer ${token}`,
            ...(options.body ? { 'content-type': 'application/json' } : {}),
            ...options.headers,
        },
    });
}

test('server owner cannot configure a welcome channel from another guild', async () => {
    const response = await request('/welcome-settings', {
        method: 'POST',
        body: JSON.stringify({ welcomeChannel: foreignChannelId }),
    });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.match(data.error, /من هذا السيرفر/);
    assert.deepEqual(updates, []);
});

test('server owner cannot use the welcome test to send into another guild', async () => {
    const response = await request('/test-welcome', { method: 'POST' });
    const data = await response.json();

    assert.equal(response.status, 404);
    assert.match(data.error, /في هذا السيرفر/);
});

test('welcome enabled accepts only a boolean value', async () => {
    const response = await request('/welcome-settings', {
        method: 'POST',
        body: JSON.stringify({ welcomeEnabled: 'false' }),
    });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(updates, []);
    assert.match(data.error, /غير صالحة/);
});
