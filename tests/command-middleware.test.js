'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DISCORD_TOKEN = 'middleware-test-token';
process.env.OWNER_ID = 'middleware-test-owner';

const commandsMiddleware = require('../src/middleware/commands');
const botSettings = require('../utils/bot-settings');
const pollCommand = require('../commands/social/poll');
const serverSetupCommand = require('../commands/moderation/server-setup');
const { PermissionFlagsBits } = require('discord.js');

function createMessage(content, { permissions = [] } = {}) {
    const replies = [];
    return {
        content,
        author: { id: 'middleware-test-user' },
        guild: { id: 'middleware-test-guild' },
        member: { permissions: { has: permission => permissions.includes(permission) } },
        client: { commands: new Map(), aliases: new Map() },
        mentions: { users: { size: 0 } },
        replies,
        reply: async message => replies.push(message),
    };
}

test('special poll aliases honor the bot-owner disabled-command setting', async t => {
    let executed = false;
    t.mock.method(botSettings, 'isCommandDisabled', commandName => commandName === 'poll');
    t.mock.method(pollCommand, 'execute', async () => { executed = true; });
    const message = createMessage('بول هل الاختبار يعمل؟ | نعم | لا');

    await commandsMiddleware(message);

    assert.equal(executed, false);
    assert.match(message.replies[0], /هذا الأمر معطل/);
});

test('special server setup aliases enforce the command permission', async t => {
    let executed = false;
    t.mock.method(botSettings, 'isCommandDisabled', () => false);
    t.mock.method(serverSetupCommand, 'execute', async () => { executed = true; });
    const message = createMessage('تفعيل سيرفر');

    await commandsMiddleware(message);

    assert.equal(executed, false);
    assert.match(message.replies[0], /ليس لديك صلاحية/);
});

test('special server setup aliases proceed for members with the required permission', async t => {
    let executed = false;
    t.mock.method(botSettings, 'isCommandDisabled', () => false);
    t.mock.method(serverSetupCommand, 'execute', async () => { executed = true; });
    const message = createMessage('تفعيل سيرفر', {
        permissions: [PermissionFlagsBits.Administrator],
    });

    await commandsMiddleware(message);

    assert.equal(executed, true);
    assert.equal(message.replies.length, 0);
});
