'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-dashboard-management';
process.env.DASHBOARD_KEY = 'test-dashboard-key';
process.env.OWNER_ID = 'test-owner';

const express = require('express');
const auth = require('../src/api/routes/auth');
const botSettings = require('../utils/bot-settings');
const db = require('../src/database/db');
const botOwnerRouter = require('../src/api/routes/bot-owner');
const serverOwnerRouter = require('../src/api/routes/server-owner');

const commandActions = [];
const roleActions = [];
const commands = new Map([['ping', { name: 'ping' }]]);
const role = {
    id: '222222222222222222',
    name: 'Member',
    managed: false,
    guild: { id: '111111111111111111' },
    comparePositionTo: () => -1,
};
const botMember = {
    permissions: { has: () => true },
    roles: { highest: { position: 5 } },
};
const targetMember = {
    id: '333333333333333333',
    user: { tag: 'target#0001' },
    roles: {
        highest: { comparePositionTo: () => -1 },
        add: async () => roleActions.push('add'),
        remove: async () => roleActions.push('remove'),
    },
};
const guild = {
    id: role.guild.id,
    ownerId: '444444444444444444',
    roles: { fetch: async id => id === role.id ? role : null },
    members: {
        me: botMember,
        fetch: async id => id === '333333333333333333' ? targetMember : null,
        fetchMe: async () => botMember,
    },
};
const client = {
    commands,
    isReady: () => true,
    guilds: { fetch: async id => id === guild.id ? guild : null },
};

const app = express();
app.use(express.json());
app.set('client', client);
app.use('/api/bot-owner', botOwnerRouter);
app.use('/server/:guildId', serverOwnerRouter);

const token = jwt.sign({ role: 'bot_owner', userId: 'test-owner' }, auth.JWT_SECRET);
let server;
let baseUrl;
const originalDisableCommand = botSettings.disableCommand;
const originalEnableCommand = botSettings.enableCommand;

test.before(async () => {
    botSettings.disableCommand = command => commandActions.push(['disable', command]);
    botSettings.enableCommand = command => commandActions.push(['enable', command]);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    botSettings.disableCommand = originalDisableCommand;
    botSettings.enableCommand = originalEnableCommand;
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

test('bot-owner command control rejects unknown commands and applies valid changes', async () => {
    const unknown = await request('/api/bot-owner/command', {
        method: 'POST',
        body: JSON.stringify({ command: 'missing', action: 'disable' }),
    });
    assert.equal(unknown.status, 404);

    const disabled = await request('/api/bot-owner/command', {
        method: 'POST',
        body: JSON.stringify({ command: 'PING', action: 'disable' }),
    });
    assert.equal(disabled.status, 200);
    assert.deepEqual(await disabled.json(), { success: true, command: 'ping', disabled: true });

    const enabled = await request('/api/bot-owner/command', {
        method: 'POST',
        body: JSON.stringify({ command: 'ping', action: 'enable' }),
    });
    assert.equal(enabled.status, 200);
    assert.deepEqual(commandActions, [['disable', 'ping'], ['enable', 'ping']]);
});

test('bot-owner stats exposes canonical commands and their disabled state', async () => {
    const originalGet = botSettings.get;
    const originalGetAll = botSettings.getAll;
    const originalGetLeaderboard = db.getLeaderboard;
    const originalIsReady = client.isReady;
    botSettings.get = key => key === 'disabledCommands' ? ['ping'] : originalGet(key);
    botSettings.getAll = () => ({ disabledCommands: ['ping'] });
    db.getLeaderboard = () => [];
    client.isReady = () => false;

    try {
        const response = await request('/api/bot-owner/stats');
        const data = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(data.stats.commands.find(command => command.name === 'ping'), {
            name: 'ping',
            aliases: [],
            description: '',
            ownerOnly: false,
            disabled: true,
        });
    } finally {
        botSettings.get = originalGet;
        botSettings.getAll = originalGetAll;
        db.getLeaderboard = originalGetLeaderboard;
        client.isReady = originalIsReady;
    }
});

test('server-owner role control blocks roles at or above the bot hierarchy', async () => {
    role.comparePositionTo = () => 0;
    const response = await request(`/server/${guild.id}/roles/manage`, {
        method: 'POST',
        body: JSON.stringify({
            roleId: role.id,
            userId: '333333333333333333',
            action: 'add',
        }),
    });

    assert.equal(response.status, 403);
    assert.equal((await response.json()).success, false);
    assert.deepEqual(roleActions, []);
    role.comparePositionTo = () => -1;
});

test('server-owner role control blocks members at or above the bot hierarchy', async () => {
    targetMember.roles.highest.comparePositionTo = () => 0;
    const response = await request(`/server/${guild.id}/roles/manage`, {
        method: 'POST',
        body: JSON.stringify({
            roleId: role.id,
            userId: '333333333333333333',
            action: 'add',
        }),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(roleActions, []);
    targetMember.roles.highest.comparePositionTo = () => -1;
});

test('server-owner role control applies a manageable role to a guild member', async () => {
    const response = await request(`/server/${guild.id}/roles/manage`, {
        method: 'POST',
        body: JSON.stringify({
            roleId: role.id,
            userId: '333333333333333333',
            action: 'add',
        }),
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
    assert.deepEqual(roleActions, ['add']);
});
