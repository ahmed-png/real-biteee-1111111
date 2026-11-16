'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { PermissionsBitField } = require('discord.js');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-auto-role';
process.env.DASHBOARD_KEY = 'test-dashboard-key';
process.env.OWNER_ID = 'test-owner';

const express = require('express');
const auth = require('../src/api/routes/auth');
const db = require('../src/database/db');
const compatibilityDb = require('../utils/database');
const autoRole = require('../utils/auto-role');
const protection = require('../utils/protection');
const welcome = require('../utils/welcome');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');
const guildMemberAdd = require('../events/guildMemberAdd');
const serverOwnerRouter = require('../src/api/routes/server-owner');

const guildId = '111111111111111111';
const roleId = '555555555555555555';
const memberId = '333333333333333333';
const guildData = new Map();
const roles = new Map();
let roleCreateCount = 0;
let botCanManageRoles = true;
const backfillAssignments = [];

function makeRole(id, name, permissions = [], position = 2) {
    const role = {
        id,
        name,
        guild: { id: guildId },
        managed: false,
        position,
        permissions: new PermissionsBitField(permissions),
        comparePositionTo(other) {
            return this.position - other.position;
        },
        async edit(options) {
            this.name = options.name;
            this.permissions = new PermissionsBitField(options.permissions);
            return this;
        },
        async delete() {
            roles.delete(this.id);
        },
    };
    return role;
}

const botMember = {
    permissions: { has: () => botCanManageRoles },
    roles: { highest: { position: 10 } },
};
function makeBackfillMember(id, { bot = false, existingRole = false, hierarchy = -1 } = {}) {
    const roleCache = new Map(existingRole ? [[roleId, {}]] : []);
    return {
        id,
        user: { bot },
        roles: {
            cache: roleCache,
            highest: { comparePositionTo: () => hierarchy },
            add: async role => {
                backfillAssignments.push(id);
                roleCache.set(role.id, role);
            },
        },
    };
}
const existingMembers = [
    makeBackfillMember('666666666666666666'),
    makeBackfillMember('777777777777777777', { bot: true }),
    makeBackfillMember('888888888888888888', { existingRole: true }),
    makeBackfillMember('999999999999999999', { hierarchy: 0 }),
];
const guild = {
    id: guildId,
    ownerId: '444444444444444444',
    memberCount: existingMembers.length,
    roles: {
        cache: roles,
        fetch: async id => roles.get(id) || null,
        create: async options => {
            roleCreateCount++;
            const role = makeRole(roleId, options.name, options.permissions);
            roles.set(role.id, role);
            return role;
        },
    },
    members: {
        me: botMember,
        fetchMe: async () => botMember,
        list: async () => new Map(existingMembers.map(member => [member.id, member])),
    },
};
const client = {
    isReady: () => true,
    guilds: {
        cache: new Map([[guildId, guild]]),
        fetch: async id => id === guildId ? guild : null,
    },
};

const app = express();
app.use(express.json());
app.set('client', client);
app.use('/server/:guildId', serverOwnerRouter);

const token = jwt.sign({ role: 'bot_owner', userId: 'test-owner' }, auth.JWT_SECRET);
let server;
let baseUrl;
const originalGetGuildData = db.getGuildData;
const originalUpdateGuildData = db.updateGuildData;
const originalCompatGetGuildData = compatibilityDb.getGuildData;
const originalCompatUpdateGuildData = compatibilityDb.updateGuildData;

test.before(async () => {
    const getGuildData = id => guildData.get(id) || {
        guildId: id,
        autoRoleEnabled: false,
        autoRoleId: null,
        autoRoleName: 'عضو جديد',
        autoRolePermissions: [],
    };
    const updateGuildData = (id, updates) => {
        const next = { ...getGuildData(id), ...updates };
        guildData.set(id, next);
        return next;
    };
    db.getGuildData = getGuildData;
    db.updateGuildData = updateGuildData;
    compatibilityDb.getGuildData = getGuildData;
    compatibilityDb.updateGuildData = updateGuildData;

    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    db.getGuildData = originalGetGuildData;
    db.updateGuildData = originalUpdateGuildData;
    compatibilityDb.getGuildData = originalCompatGetGuildData;
    compatibilityDb.updateGuildData = originalCompatUpdateGuildData;
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

async function waitForBackfill() {
    for (let attempt = 0; attempt < 100; attempt++) {
        const status = guildData.get(guildId)?.autoRoleBackfill;
        if (status?.status !== 'running' && !autoRole.isBackfillRunning(guildId)) return status;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Auto-role backfill did not complete in time');
}

test('auto-role configuration rejects unsupported and elevated permissions', async () => {
    const response = await request(`/server/${guildId}/auto-role`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true, roleName: 'Member', permissions: ['Administrator'] }),
    });

    assert.equal(response.status, 400);
    assert.equal(roleCreateCount, 0);
});

test('auto-role settings expose the current role state and safe permission choices', async () => {
    const response = await request(`/server/${guildId}/auto-role`);
    const settings = await response.json();

    assert.equal(response.status, 200);
    assert.equal(settings.enabled, false);
    assert.equal(settings.canManageRoles, true);
    assert.ok(settings.permissionOptions.some(option => option.name === 'SendMessages'));
    assert.ok(settings.permissionOptions.every(option => option.name !== 'Administrator'));
});

test('auto-role configuration creates once and updates the dedicated role', async () => {
    botCanManageRoles = false;
    const denied = await request(`/server/${guildId}/auto-role`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true, roleName: 'Member', permissions: ['ViewChannel'] }),
    });
    assert.equal(denied.status, 403);
    assert.equal(roleCreateCount, 0);

    botCanManageRoles = true;
    const created = await request(`/server/${guildId}/auto-role`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true, roleName: 'New Members', permissions: ['ViewChannel', 'SendMessages'] }),
    });
    assert.equal(created.status, 200);
    assert.equal((await created.json()).enabled, true);
    assert.equal(roleCreateCount, 1);
    assert.equal(guildData.get(guildId).autoRoleId, roleId);
    assert.equal(roles.get(roleId).permissions.has(PermissionsBitField.Flags.SendMessages), true);
    const initialBackfill = await waitForBackfill();
    assert.equal(initialBackfill.status, 'completed');
    assert.equal(initialBackfill.total, existingMembers.length);
    assert.equal(initialBackfill.assigned, 2);
    assert.equal(initialBackfill.skipped, 2);
    assert.deepEqual(backfillAssignments.sort(), ['666666666666666666', '777777777777777777']);

    const updated = await request(`/server/${guildId}/auto-role`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true, roleName: 'Verified Members', permissions: ['ReadMessageHistory'] }),
    });
    assert.equal(updated.status, 200);
    assert.equal(roleCreateCount, 1);
    assert.equal(roles.get(roleId).name, 'Verified Members');
    assert.deepEqual(roles.get(roleId).permissions.toArray(), ['ReadMessageHistory']);

    const rerun = await request(`/server/${guildId}/auto-role/backfill`, { method: 'POST' });
    assert.equal(rerun.status, 200);
    const rerunStatus = await waitForBackfill();
    assert.equal(rerunStatus.status, 'completed');
    assert.equal(rerunStatus.assigned, 0);
    assert.equal(rerunStatus.skipped, existingMembers.length);
    assert.equal(backfillAssignments.length, 2);

    const originalMemberList = guild.members.list;
    guild.members.list = async () => { throw Object.assign(new Error('Missing Access'), { code: 50001 }); };
    try {
        const retry = await request(`/server/${guildId}/auto-role/backfill`, { method: 'POST' });
        assert.equal(retry.status, 200);
        const failedBackfill = await waitForBackfill();
        assert.equal(failedBackfill.status, 'failed');
        assert.match(failedBackfill.error, /Server Members Intent/);
    } finally {
        guild.members.list = originalMemberList;
    }
});

test('auto-role configuration can be disabled without deleting its role', async () => {
    const response = await request(`/server/${guildId}/auto-role`, {
        method: 'POST',
        body: JSON.stringify({ enabled: false }),
    });

    assert.equal(response.status, 200);
    assert.equal(guildData.get(guildId).autoRoleEnabled, false);
    assert.equal(guildData.get(guildId).autoRoleId, roleId);
    assert.equal(roles.has(roleId), true);

    const restarted = await request(`/server/${guildId}/auto-role/backfill`, { method: 'POST' });
    assert.equal(restarted.status, 400);
});

test('join handler assigns the configured role only after the account and raid checks', async t => {
    const originalAccountAge = protection.checkAccountAge;
    const originalRaidCheck = protection.checkRaid;
    const originalAssignRole = autoRole.assignAutoRole;
    const originalWelcome = welcome.sendWelcome;
    const originalJoinLog = logger.logMemberJoin;
    const originalBotCheck = securityMonitor.checkSuspiciousBot;
    const sequence = [];

    t.after(() => {
        protection.checkAccountAge = originalAccountAge;
        protection.checkRaid = originalRaidCheck;
        autoRole.assignAutoRole = originalAssignRole;
        welcome.sendWelcome = originalWelcome;
        logger.logMemberJoin = originalJoinLog;
        securityMonitor.checkSuspiciousBot = originalBotCheck;
    });

    protection.checkAccountAge = async () => { sequence.push('age'); return false; };
    protection.checkRaid = async () => { sequence.push('raid'); return false; };
    autoRole.assignAutoRole = async () => { sequence.push('role'); };
    welcome.sendWelcome = async () => { sequence.push('welcome'); };
    logger.logMemberJoin = async () => { sequence.push('log'); };
    securityMonitor.checkSuspiciousBot = async () => { sequence.push('security'); };

    await guildMemberAdd.execute({ user: { id: memberId, bot: false }, guild });
    assert.deepEqual(sequence, ['age', 'raid', 'role', 'welcome', 'log']);

    sequence.length = 0;
    protection.checkRaid = async () => { sequence.push('raid'); return true; };
    await guildMemberAdd.execute({ user: { id: memberId, bot: false }, guild });
    assert.deepEqual(sequence, ['age', 'raid']);

    sequence.length = 0;
    await guildMemberAdd.execute({ user: { id: '101010101010101010', bot: true }, guild });
    assert.deepEqual(sequence, ['security', 'role']);
});

test('auto-role helper respects disabled settings and hierarchy', async () => {
    const role = roles.get(roleId);
    const assigned = [];
    const member = {
        id: memberId,
        user: { bot: false },
        guild,
        roles: {
            cache: new Map(),
            highest: { comparePositionTo: () => -1 },
            add: async assignedRole => assigned.push(assignedRole.id),
        },
    };

    await autoRole.assignAutoRole(member);
    assert.deepEqual(assigned, []);

    db.updateGuildData(guildId, { autoRoleEnabled: true, autoRoleId: roleId });
    assert.equal(await autoRole.assignAutoRole(member), true);
    assert.deepEqual(assigned, [roleId]);

    const botMember = {
        ...member,
        id: '101010101010101010',
        user: { bot: true },
        roles: { ...member.roles, cache: new Map() },
    };
    assert.equal(await autoRole.assignAutoRole(botMember), true);
    assert.deepEqual(assigned, [roleId, roleId]);

    role.comparePositionTo = () => 0;
    const anotherMember = { ...member, id: '666666666666666666', roles: { ...member.roles, cache: new Map() } };
    assert.equal(await autoRole.assignAutoRole(anotherMember), false);
    assert.deepEqual(assigned, [roleId, roleId]);
    role.comparePositionTo = () => -8;

    role.permissions = new PermissionsBitField([PermissionsBitField.Flags.Administrator]);
    assert.equal(await autoRole.assignAutoRole(anotherMember), false);
    assert.deepEqual(assigned, [roleId, roleId]);
    role.permissions = new PermissionsBitField([PermissionsBitField.Flags.ReadMessageHistory]);

    db.updateGuildData(guildId, {
        autoRoleEnabled: true,
        autoRoleId: roleId,
        autoRoleBackfill: { status: 'running' },
    });
    assert.equal(autoRole.resumeInterruptedBackfills(client), 1);
    assert.equal((await waitForBackfill()).status, 'completed');
});
