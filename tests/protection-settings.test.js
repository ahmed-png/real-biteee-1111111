'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DISCORD_TOKEN ||= 'protection-test-token';
process.env.OWNER_ID ||= 'protection-test-owner';

const db = require('../utils/database');
const protection = require('../utils/protection');
const channelResolver = require('../utils/channel-resolver');
const guildDataStore = new Map();
const originalGetGuildData = db.getGuildData;
const originalUpdateGuildData = db.updateGuildData;

test.before(() => {
    db.getGuildData = guildId => guildDataStore.get(guildId) || {};
    db.updateGuildData = (guildId, updates) => {
        const current = guildDataStore.get(guildId) || {};
        const next = { ...current, ...updates };
        if (updates.protectionSettings) {
            next.protectionSettings = { ...current.protectionSettings, ...updates.protectionSettings };
        }
        guildDataStore.set(guildId, next);
        return next;
    };
});

test.after(() => {
    db.getGuildData = originalGetGuildData;
    db.updateGuildData = originalUpdateGuildData;
});

function createMessage(guildId) {
    let deleted = 0;
    let timeoutDuration = null;
    return {
        message: {
            author: { id: `user-${guildId}`, bot: false },
            member: {
                permissions: { has: () => false },
                async timeout(duration) { timeoutDuration = duration; },
            },
            guild: { id: guildId, channels: { cache: new Map() } },
            content: 'https://example.com',
            channel: { async send() { return { async delete() {} }; } },
            async delete() { deleted++; },
        },
        deleted: () => deleted,
        timeoutDuration: () => timeoutDuration,
    };
}

test('anti-link follows the saved per-guild toggle', async (t) => {
    const resolve = channelResolver.resolve;
    const originalSetTimeout = global.setTimeout;
    t.after(() => {
        channelResolver.resolve = resolve;
        global.setTimeout = originalSetTimeout;
    });
    channelResolver.resolve = () => null;
    global.setTimeout = () => ({ unref() {} });

    const guildId = `link-test-${Date.now()}`;
    const fake = createMessage(guildId);
    db.updateGuildData(guildId, { protectionSettings: { antiLink: { enabled: false } } });
    assert.equal(await protection.checkLinks(fake.message), false);
    assert.equal(fake.deleted(), 0);

    db.updateGuildData(guildId, { protectionSettings: { antiLink: { enabled: true } } });
    assert.equal(await protection.checkLinks(fake.message), true);
    assert.equal(fake.deleted(), 1);
});

test('anti-spam applies the configured threshold and timeout duration', async (t) => {
    const resolve = channelResolver.resolve;
    const originalSetTimeout = global.setTimeout;
    t.after(() => {
        channelResolver.resolve = resolve;
        global.setTimeout = originalSetTimeout;
    });
    channelResolver.resolve = () => null;
    global.setTimeout = () => ({ unref() {} });

    const guildId = `spam-test-${Date.now()}`;
    const fake = createMessage(guildId);
    db.updateGuildData(guildId, {
        protectionSettings: { antiSpam: { enabled: true, threshold: 3, duration: 2 } },
    });

    assert.equal(await protection.checkSpam(fake.message), false);
    assert.equal(await protection.checkSpam(fake.message), false);
    assert.equal(await protection.checkSpam(fake.message), true);
    assert.equal(fake.deleted(), 1);
    assert.equal(fake.timeoutDuration(), 120000);
});

test('duplicate-message threshold includes the current message', async (t) => {
    const resolve = channelResolver.resolve;
    const originalSetTimeout = global.setTimeout;
    t.after(() => {
        channelResolver.resolve = resolve;
        global.setTimeout = originalSetTimeout;
    });
    channelResolver.resolve = () => null;
    global.setTimeout = () => ({ unref() {} });

    const guildId = `duplicate-test-${Date.now()}`;
    const fake = createMessage(guildId);
    db.updateGuildData(guildId, {
        protectionSettings: { antiDuplicate: { enabled: true, threshold: 2 } },
    });

    assert.equal(await protection.checkDuplicateMessages(fake.message), false);
    assert.equal(await protection.checkDuplicateMessages(fake.message), true);
    assert.equal(fake.deleted(), 1);
    assert.equal(fake.timeoutDuration(), 300000);
});
