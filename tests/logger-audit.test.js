'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AuditLogEvent } = require('discord.js');

const db = require('../utils/database');
const logger = require('../utils/logger');
const originalGetGuildData = db.getGuildData;
const sentPayloads = [];
const logChannel = {
    id: 'log-channel',
    name: 'server-logs',
    async send(payload) {
        sentPayloads.push(payload);
    },
};
const guild = {
    id: 'logger-test-guild',
    channels: { cache: new Map([[logChannel.id, logChannel]]) },
    members: { me: { permissions: { has: () => false } } },
    iconURL: () => null,
};

test.before(() => {
    db.getGuildData = () => ({ logChannelId: logChannel.id });
});

test.after(() => {
    db.getGuildData = originalGetGuildData;
});

test('audit logger sends actor, target, reason and changes to the configured channel', async () => {
    const sentCount = sentPayloads.length;
    const logged = await logger.logAuditEntry({
        id: 'audit-123',
        action: AuditLogEvent.WebhookUpdate,
        executor: { id: 'moderator-1', tag: 'Moderator#0001' },
        executorId: 'moderator-1',
        target: { name: 'Guard webhook' },
        targetId: 'webhook-1',
        reason: 'Routine update',
        changes: [{ key: 'name', old: 'Old name', new: 'New name' }],
        createdAt: new Date('2026-01-01T00:00:00Z'),
    }, guild);

    assert.equal(logged, true);
    assert.equal(sentPayloads.length, sentCount + 1);
    assert.deepEqual(sentPayloads.at(-1).allowedMentions, { parse: [] });
    const embed = sentPayloads.at(-1).embeds[0].data;
    assert.match(embed.title, /Webhook/);
    assert.match(embed.fields.find(field => field.name === '👮 المنفذ').value, /moderator-1/);
    assert.match(embed.fields.find(field => field.name === '🎯 الهدف').value, /webhook-1/);
    assert.match(embed.fields.find(field => field.name === '🔎 التفاصيل').value, /New name/);
});

test('audit logger leaves events with dedicated detailed log handlers to those handlers', async () => {
    const sentCount = sentPayloads.length;
    const logged = await logger.logAuditEntry({
        id: 'audit-channel-create',
        action: AuditLogEvent.ChannelCreate,
    }, guild);

    assert.equal(logged, false);
    assert.equal(sentPayloads.length, sentCount);
});

test('AutoMod executions include the matched text and the selected log channel', async () => {
    const sentCount = sentPayloads.length;
    const logged = await logger.logAutoModerationExecution({
        guild,
        user: { id: 'member-1', tag: 'Member#0001' },
        action: { type: 1 },
        ruleId: 'rule-1',
        autoModerationRule: { name: 'Link filter' },
        channel: { name: 'general' },
        matchedContent: 'suspicious phrase https://example.com/unsafe',
        content: 'discord.gg/invitepath',
    });

    assert.equal(logged, true);
    assert.equal(sentPayloads.length, sentCount + 1);
    const embed = sentPayloads.at(-1).embeds[0].data;
    assert.equal(embed.title, '🛡️ تنفيذ إجراء AutoMod');
    const matchedContent = embed.fields.find(field => field.name === '🧩 النص المطابق').value;
    const content = embed.fields.find(field => field.name === '📝 محتوى الرسالة').value;
    assert.match(matchedContent, /suspicious phrase/);
    assert.match(matchedContent, /رابط \(example\.com\)/);
    assert.match(content, /رابط \(discord\.gg\)/);
    assert.doesNotMatch(`${matchedContent} ${content}`, /https?:\/\/|discord\.gg\//);
});

test('guild update logger captures security and community setting changes', async () => {
    const sentCount = sentPayloads.length;
    await logger.logGuildUpdate(
        {
            ...guild,
            name: 'Old name',
            icon: null,
            banner: null,
            splash: null,
            verificationLevel: 0,
            features: [],
        },
        {
            ...guild,
            name: 'New name',
            icon: null,
            banner: null,
            splash: null,
            verificationLevel: 2,
            features: ['COMMUNITY'],
        }
    );

    assert.equal(sentPayloads.length, sentCount + 1);
    const embed = sentPayloads.at(-1).embeds[0].data;
    const changes = embed.fields.find(field => field.name === '📋 التغييرات').value;
    assert.match(changes, /مستوى التحقق/);
    assert.match(changes, /ميزات السيرفر/);
});

test('deleted-message logs keep links and formatting safe and readable', async () => {
    const sentCount = sentPayloads.length;
    await logger.logMessageDelete({
        id: 'message-123',
        content: 'افحص https://example.com/path?token=secret ```نص غريب``` @everyone\u202E',
        author: {
            id: 'member-1',
            tag: 'Member',
            bot: false,
            displayAvatarURL: () => 'https://cdn.example.com/avatar.png',
        },
        channel: '#general',
        guild,
        attachments: new Map([['file-1', {
            name: 'document.pdf',
            size: 2048,
            url: 'https://cdn.example.com/document.pdf',
        }]]),
    });

    assert.equal(sentPayloads.length, sentCount + 1);
    const embed = sentPayloads.at(-1).embeds[0].data;
    const content = embed.fields.find(field => field.name === '📝 محتوى الرسالة').value;
    const attachments = embed.fields.find(field => field.name.startsWith('📎 المرفقات')).value;
    assert.equal(embed.title, '🗑️ حذف رسالة');
    assert.match(content, /رابط \(example\.com\)/);
    assert.match(content, /ˋˋˋنص غريبˋˋˋ/);
    assert.doesNotMatch(content, /https?:\/\/|token=secret|@everyone|\u202E/);
    assert.match(attachments, /document\.pdf/);
    assert.doesNotMatch(attachments, /https?:\/\//);
});

test('voice logs make microphone open, muted, and administrator-muted states distinct', async () => {
    const sentCount = sentPayloads.length;
    const member = { id: 'member-1', guild };
    const oldState = { member, channelId: 'voice-1', selfMute: false, serverMute: false };
    const newState = { member, channelId: 'voice-1', selfMute: true, serverMute: false };

    await logger.logVoiceState(oldState, newState);

    const selfMuteLog = sentPayloads.at(-1).embeds[0].data;
    assert.equal(selfMuteLog.title, '🎙️ العضو قفل المايك');
    assert.match(selfMuteLog.fields.find(field => field.name === '🎙️ تفاصيل الحالة').value, /🟢 مفتوح → 🔴 مقفول/);

    await logger.logVoiceState(
        { ...oldState, selfMute: true },
        { ...newState, selfMute: true, serverMute: true }
    );

    assert.equal(sentPayloads.length, sentCount + 2);
    const serverMuteLog = sentPayloads.at(-1).embeds[0].data;
    assert.equal(serverMuteLog.title, '🔇 تم كتم المايك من الإدارة');
    assert.match(serverMuteLog.fields.find(field => field.name === '🎙️ تفاصيل الحالة').value, /🔓 مرفوع → 🔒 مفعّل/);
});
