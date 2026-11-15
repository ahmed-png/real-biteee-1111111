'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DISCORD_TOKEN ||= 'test-token';
process.env.OWNER_ID ||= 'test-owner';
const { PermissionFlagsBits } = require('discord.js');
const command = require('../commands/moderation/adapt');
const commandsMiddleware = require('../src/middleware/commands');
const botSettings = require('../utils/bot-settings');
const dailyChallenges = require('../utils/daily-challenges');

function createMessage({ name = 'سيرفر الأصدقاء', icon = 'https://cdn.discordapp.com/icons/test/icon.png', admin = true, failures = {} } = {}) {
    const calls = [];
    const replies = [];
    const message = {
        author: { id: 'test-user' },
        member: { permissions: { has: permission => admin && (permission === PermissionFlagsBits.Administrator || (Array.isArray(permission) && permission.includes(PermissionFlagsBits.Administrator))) } },
        guild: {
            name,
            iconURL: () => icon,
            members: {
                async editMe(options) {
                    calls.push(options);
                    if (options.nick && failures.nick) throw new Error('nickname failed');
                    if (options.avatar && failures.avatar) throw new Error('avatar failed');
                }
            }
        },
        async reply(content) { replies.push(content); }
    };
    return { message, calls, replies };
}

test('adapt applies the server name and icon only through the current guild member', async () => {
    const { message, calls, replies } = createMessage();
    await command.execute(message);
    assert.deepEqual(calls.map(call => ({ nick: call.nick, avatar: call.avatar })), [
        { nick: 'سيرفر الأصدقاء', avatar: undefined },
        { nick: undefined, avatar: 'https://cdn.discordapp.com/icons/test/icon.png' }
    ]);
    assert.match(replies[0], /تم تغيير اسم/);
    assert.match(replies[0], /تم تغيير صورة/);
});

test('unauthorized users and direct messages do not modify any guild', async () => {
    const { message, calls, replies } = createMessage({ admin: false });
    await command.execute(message);
    assert.equal(calls.length, 0);
    assert.match(replies[0], /الأدمن/);
    message.guild = null;
    await command.execute(message);
    assert.match(replies[1], /داخل السيرفر/);
});

test('missing icon and too-long names do not overwrite existing profile settings', async () => {
    const { message, calls, replies } = createMessage({ name: 'a'.repeat(33), icon: null });
    await command.execute(message);
    assert.equal(calls.length, 0);
    assert.match(replies[0], /أطول من 32/);
    assert.match(replies[0], /لا يملك صورة/);
});

test('reports partial nickname failure without preventing the avatar update', async (t) => {
    t.mock.method(console, 'error', () => {});
    const { message, calls, replies } = createMessage({ failures: { nick: true } });
    await command.execute(message);
    assert.equal(calls.length, 2);
    assert.match(replies[0], /تعذر تغيير الاسم/);
    assert.match(replies[0], /تم تغيير صورة/);
});

test('reports avatar failure without claiming full success', async (t) => {
    t.mock.method(console, 'error', () => {});
    const { message, calls, replies } = createMessage({ failures: { avatar: true } });
    await command.execute(message);
    assert.equal(calls.length, 2);
    assert.match(replies[0], /تم تغيير اسم/);
    assert.match(replies[0], /تعذر تغيير الصورة/);
});

test('accepts a name at the Discord nickname limit', async () => {
    const { message, calls } = createMessage({ name: 'a'.repeat(32), icon: null });
    await command.execute(message);
    assert.equal(calls[0].nick, 'a'.repeat(32));
    assert.equal(calls.length, 1);
});

test('command is available under the requested Arabic spelling', () => {
    assert.ok(command.aliases.includes('تكيف'));
    assert.equal(command.permissions[0], PermissionFlagsBits.Administrator);
});

test('middleware routes تكيف both with and without the prefix', async (t) => {
    t.mock.method(botSettings, 'isCommandDisabled', () => false);
    t.mock.method(dailyChallenges, 'updateProgress', async () => {});
    for (const content of ['تكيف', '!تكيف']) {
        const { message, calls, replies } = createMessage();
        message.content = content;
        message.guild.id = 'test-guild';
        message.client = {
            commands: new Map([[command.name, command]]),
            aliases: new Map(command.aliases.map(alias => [alias, command.name]))
        };
        assert.equal(await commandsMiddleware(message), false);
        assert.equal(calls.length, 2);
        assert.match(replies[0], /تم تغيير صورة/);
    }
});
