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
const appLogger = require('../utils/app-logger');
const iraqiResponseLibrary = require('../utils/iraqi-responses');
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
    appLogger.info('dashboard-log-visible-test');

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
        assert.ok(data.stats.logs.some(line => line.includes('dashboard-log-visible-test')));
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

test('server-owner Iraqi response library returns about 150 editable per-guild replies', async () => {
    const responsesGuildId = '999000000000000001';
    const originalGetGuildData = db.getGuildData;
    const originalUpdateGuildData = db.updateGuildData;
    const guildData = { iraqiResponsesEnabled: true, iraqiResponses: [] };
    db.getGuildData = () => guildData;
    db.updateGuildData = (_guildId, updates) => Object.assign(guildData, updates);

    try {
        const defaultsResponse = await request(`/server/${responsesGuildId}/iraqi-responses`);
        const defaults = await defaultsResponse.json();

        assert.equal(defaultsResponse.status, 200);
        assert.equal(defaults.success, true);
        assert.equal(defaults.enabled, true);
        assert.ok(defaults.responses.length >= 150 && defaults.responses.length <= 160);
        assert.equal(defaults.responses.length, iraqiResponseLibrary.DEFAULT_IRAQI_RESPONSES.length);

        const responses = defaults.responses.map(item => ({ ...item }));
        responses[0] = {
            ...responses[0],
            trigger: 'هلا اختبار',
            response: 'هلا بيك، هذا رد خاص بالسيرفر.',
            enabled: false,
        };
        const savedResponse = await request(`/server/${responsesGuildId}/iraqi-responses`, {
            method: 'POST',
            body: JSON.stringify({ enabled: false, responses }),
        });
        const saved = await savedResponse.json();

        assert.equal(savedResponse.status, 200);
        assert.equal(saved.success, true);
        assert.equal(saved.enabled, false);
        assert.equal(saved.responses[0].trigger, 'هلا اختبار');
        assert.equal(saved.responses[0].enabled, false);

        const reloaded = await (await request(`/server/${responsesGuildId}/iraqi-responses`)).json();
        assert.equal(reloaded.enabled, false);
        assert.equal(reloaded.responses[0].response, 'هلا بيك، هذا رد خاص بالسيرفر.');

        const duplicated = [...responses];
        duplicated[1] = { ...duplicated[1], trigger: responses[0].trigger };
        const rejected = await request(`/server/${responsesGuildId}/iraqi-responses`, {
            method: 'POST',
            body: JSON.stringify({ enabled: true, responses: duplicated }),
        });
        assert.equal(rejected.status, 400);
    } finally {
        db.getGuildData = originalGetGuildData;
        db.updateGuildData = originalUpdateGuildData;
    }
});
