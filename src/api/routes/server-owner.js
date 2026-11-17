'use strict';
const appLogger = require('../../../utils/app-logger');

/**
 * ════════════════════════════════════════════════════════
 *  server-owner.js — Routes خاصة بمالك السيرفر
 *  ✅ محمية بـ requireServerOwner middleware
 *  ✅ عزل كامل — كل guild بياناته منفصلة
 *  ❌ Server Owner A لا يستطيع الوصول لبيانات Guild B
 * ════════════════════════════════════════════════════════
 */

const express = require('express');
const { PermissionsBitField, ChannelType } = require('discord.js');
const { requireServerOwner } = require('./auth');
const db = require('../../database/db');
const botSettings = require('../../database/bot-settings-db');
const autoRole = require('../../../utils/auto-role');
const iraqiResponseLibrary = require('../../../utils/iraqi-responses');
const { AUTO_ROLE_PERMISSION_OPTIONS, AUTO_ROLE_PERMISSION_NAMES } = require('../../../utils/auto-role-permissions');
const router = express.Router({ mergeParams: true });

const DEFAULT_PROTECTION = {
    antiSpam:        { enabled: true, threshold: 18, duration: 5 },
    antiRaid:        { enabled: true, threshold: 5 },
    antiBadWords:    { enabled: true },
    antiLink:        { enabled: false },
    antiCaps:        { enabled: true, threshold: 70 },
    antiMentionSpam: { enabled: true, threshold: 5 },
    antiEmojiSpam:   { enabled: true, threshold: 10 },
    antiDuplicate:   { enabled: true, threshold: 3 },
    antiAccountAge:  { enabled: true, minDays: 7 },
};

const PROTECTION_RANGES = {
    antiSpam: { threshold: [3, 100], duration: [1, 1440] },
    antiRaid: { threshold: [2, 100] },
    antiCaps: { threshold: [50, 100] },
    antiMentionSpam: { threshold: [2, 100] },
    antiEmojiSpam: { threshold: [2, 100] },
    antiDuplicate: { threshold: [2, 20] },
    antiAccountAge: { minDays: [1, 365] },
};

const LEGACY_PROTECTION_FLAGS = {
    antiSpam: 'antiSpamEnabled',
    antiLink: 'antiLinkEnabled',
    antiCaps: 'antiCapsEnabled',
    antiRaid: 'antiRaidEnabled',
};

// جميع الـ routes تتطلب Server Owner لهذا الـ guild بالذات
router.use(requireServerOwner);

// Helper: التحقق من صلاحيات البوت في قناة
function checkBotPerms(channel, botMember, requiredPerms) {
    const missing = [];
    for (const [perm, label] of requiredPerms) {
        if (!channel.permissionsFor(botMember).has(perm)) {
            missing.push(label);
        }
    }
    return missing;
}

// Helper: جلب معلومات القناة بشكل آمن
function channelInfo(channel, botMember) {
    const perms = channel.permissionsFor(botMember);
    return {
        id: channel.id,
        name: channel.name,
        type: channel.type === ChannelType.GuildText ? 'text' : channel.type === ChannelType.GuildVoice ? 'voice' : 'other',
        position: channel.position,
        canSend: perms?.has(PermissionsBitField.Flags.SendMessages) ?? false,
        canView: perms?.has(PermissionsBitField.Flags.ViewChannel) ?? false,
        canEmbed: perms?.has(PermissionsBitField.Flags.EmbedLinks) ?? false,
        canManage: perms?.has(PermissionsBitField.Flags.ManageMessages) ?? false,
    };
}

async function getGuildTextChannel(guild, channelId) {
    let channel = guild.channels.cache.get(channelId);
    if (!channel) {
        try {
            channel = await guild.channels.fetch(channelId);
        } catch (error) {
            if (error.code === 10003) return null;
            throw error;
        }
    }

    return channel?.guildId === guild.id && channel.type === ChannelType.GuildText
        ? channel
        : null;
}

// معلومات السيرفر
router.get('/info', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const guildData = db.getGuildData(guildId);
        const botMember = guild.members.me;

        res.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ dynamic: true }) || null,
                memberCount: guild.memberCount,
                ownerId: guild.ownerId,
                boostLevel: guild.premiumTier,
                boostCount: guild.premiumSubscriptionCount,
                createdAt: guild.createdAt,
            },
            settings: {
                colorChannelId: guildData.colorChannelId,
                colorChannelName: guildData.colorChannelId
                    ? guild.channels.cache.get(guildData.colorChannelId)?.name || null
                    : null,
                logChannelId: guildData.logChannelId,
                logChannelName: guildData.logChannelId
                    ? guild.channels.cache.get(guildData.logChannelId)?.name || null
                    : null,
                protectionSettings: guildData.protectionSettings || {},
                prefix: guildData.prefix,
            },
            botStatus: {
                online: true,
                permissions: guild.members.me?.permissions.toArray() || [],
                isAdmin: guild.members.me?.permissions.has(PermissionsBitField.Flags.Administrator) ?? false,
                canViewAuditLog: guild.members.me?.permissions.has(PermissionsBitField.Flags.ViewAuditLog) ?? false,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// قائمة القنوات (Text Channels فقط)
router.get('/channels', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const botMember = guild.members.me;

        // جلب جميع Text Channels فقط
        const channels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText)
            .sort((a, b) => a.position - b.position)
            .map(c => channelInfo(c, botMember));

        res.json({ success: true, channels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// تعيين Color Channel
router.post('/color-channel', async (req, res) => {
    const { guildId } = req.params;
    const { channelId } = req.body;

    if (!channelId) return res.status(400).json({ success: false, error: 'Channel ID required' });

    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return res.status(400).json({ success: false, error: 'Invalid text channel' });
        }

        const botMember = guild.members.me;
        const requiredPerms = [
            [PermissionsBitField.Flags.ViewChannel, 'View Channel'],
            [PermissionsBitField.Flags.SendMessages, 'Send Messages'],
            [PermissionsBitField.Flags.EmbedLinks, 'Embed Links'],
            [PermissionsBitField.Flags.ManageMessages, 'Manage Messages'],
        ];

        const missing = checkBotPerms(channel, botMember, requiredPerms);
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `البوت لا يملك الصلاحيات التالية في هذا الروم: ${missing.join(', ')}`,
                missingPermissions: missing,
            });
        }

        // حفظ في DB
        const guildData = db.getGuildData(guildId);
        const oldChannelId = guildData.colorChannelId;

        db.updateGuildData(guildId, {
            colorChannelId: channelId,
            colorMessageId: null, // سيُعاد إرساله
        });

        // تشغيل Color System
        try {
            const colorSystem = require('../../../utils/color-system');
            await colorSystem.setupColorChannel(guild, channel, oldChannelId);
        } catch (csErr) {
            appLogger.error('[ColorSystem] Error:', csErr.message);
        }

        res.json({
            success: true,
            message: `تم تعيين ${channel.name} كقناة ألوان بنجاح`,
            channelId,
            channelName: channel.name,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// تعيين Log Channel
router.post('/log-channel', async (req, res) => {
    const { guildId } = req.params;
    const { channelId } = req.body;

    if (!channelId) return res.status(400).json({ success: false, error: 'Channel ID required' });

    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return res.status(400).json({ success: false, error: 'Invalid text channel' });
        }

        const botMember = guild.members.me;
        const requiredPerms = [
            [PermissionsBitField.Flags.ViewChannel, 'View Channel'],
            [PermissionsBitField.Flags.SendMessages, 'Send Messages'],
            [PermissionsBitField.Flags.EmbedLinks, 'Embed Links'],
        ];

        const missing = checkBotPerms(channel, botMember, requiredPerms);
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `البوت لا يملك الصلاحيات التالية في هذا الروم: ${missing.join(', ')}`,
                missingPermissions: missing,
            });
        }

        // حفظ في DB (كلا الحقلين للتوافق مع channel-resolver القديم)
        db.updateGuildData(guildId, {
            logChannelId: channelId,
            logChannel: channelId, // legacy compatibility
        });

        // إرسال رسالة تأكيد
        const { EmbedBuilder } = require('discord.js');
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#57f287')
                    .setTitle('✅ تم تعيين قناة السجلات')
                    .setDescription(`سيتم إرسال جميع سجلات السيرفر إلى هذه القناة.`)
                    .setTimestamp()
            ]
        }).catch(() => {});

        res.json({
            success: true,
            message: `تم تعيين ${channel.name} كقناة سجلات بنجاح`,
            channelId,
            channelName: channel.name,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// إعدادات الحماية
router.get('/protection', (req, res) => {
    const { guildId } = req.params;
    const guildData = db.getGuildData(guildId);

    const saved = guildData.protectionSettings || {};
    const merged = {};
    for (const [key, def] of Object.entries(DEFAULT_PROTECTION)) {
        merged[key] = { ...def, ...(saved[key] || {}) };
        const legacyFlag = LEGACY_PROTECTION_FLAGS[key];
        if (typeof saved[key]?.enabled !== 'boolean' && typeof guildData[legacyFlag] === 'boolean') {
            merged[key].enabled = guildData[legacyFlag];
        }
    }

    res.json({
        success: true,
        protection: merged,
        defaults: DEFAULT_PROTECTION,
        restrictions: {
            antiAccountAge: botSettings.get('antiRaidAccountAgeEnabled') === false,
        },
    });
});

router.post('/protection', (req, res) => {
    const { guildId } = req.params;
    const { protection } = req.body;
    if (!protection || typeof protection !== 'object' || Array.isArray(protection)) {
        return res.status(400).json({ success: false, error: 'Invalid protection settings' });
    }

    const saved = db.getGuildData(guildId).protectionSettings || {};
    const normalized = {};
    for (const [key, defaults] of Object.entries(DEFAULT_PROTECTION)) {
        const incoming = protection[key] ?? saved[key] ?? defaults;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming) || typeof incoming.enabled !== 'boolean') {
            return res.status(400).json({ success: false, error: `Invalid ${key} settings` });
        }

        normalized[key] = { enabled: incoming.enabled };
        for (const [field, [min, max]] of Object.entries(PROTECTION_RANGES[key] || {})) {
            const value = incoming[field] ?? defaults[field];
            if (!Number.isInteger(value) || value < min || value > max) {
                return res.status(400).json({ success: false, error: `Invalid ${key}.${field}` });
            }
            normalized[key][field] = value;
        }
    }

    db.updateGuildData(guildId, { protectionSettings: normalized });

    // تحديث الـ flags المنفصلة للتوافق مع الكود القديم
    const updates = {};
    updates.antiSpamEnabled = normalized.antiSpam.enabled;
    updates.antiLinkEnabled = normalized.antiLink.enabled;
    updates.antiCapsEnabled = normalized.antiCaps.enabled;
    updates.antiRaidEnabled = normalized.antiRaid.enabled;

    if (Object.keys(updates).length > 0) {
        db.updateGuildData(guildId, updates);
    }

    res.json({ success: true, message: 'تم حفظ إعدادات الحماية' });
});

router.get('/iraqi-responses', (req, res) => {
    const guildData = db.getGuildData(req.params.guildId);
    const storedResponses = guildData.iraqiResponses;
    const responses = Array.isArray(storedResponses) && storedResponses.length > 0
        ? storedResponses
        : iraqiResponseLibrary.DEFAULT_IRAQI_RESPONSES;

    res.json({
        success: true,
        enabled: guildData.iraqiResponsesEnabled !== false,
        responses: responses.map(({ id, trigger, response, enabled }) => ({
            id,
            trigger,
            response,
            enabled: enabled !== false,
        })),
    });
});

router.post('/iraqi-responses', (req, res) => {
    const { enabled, responses } = req.body || {};
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ success: false, error: 'حدد إذا كانت الردود العراقية مفعّلة أو متوقفة.' });
    }
    if (!Array.isArray(responses) || responses.length < 1 || responses.length > 200) {
        return res.status(400).json({ success: false, error: 'قائمة الردود غير صالحة.' });
    }

    const ids = new Set();
    const triggers = new Set();
    const normalizedResponses = [];
    for (const item of responses) {
        if (!item || typeof item !== 'object' ||
            typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id) ||
            typeof item.trigger !== 'string' || typeof item.response !== 'string' ||
            typeof item.enabled !== 'boolean') {
            return res.status(400).json({ success: false, error: 'تأكد من اكتمال بيانات كل رد.' });
        }

        const id = item.id.trim();
        const trigger = item.trigger.trim();
        const response = item.response.trim();
        const normalizedTrigger = iraqiResponseLibrary.normalizeIraqiText(trigger);
        if (!trigger || trigger.length > 64 || !response || response.length > 400 || !normalizedTrigger) {
            return res.status(400).json({ success: false, error: 'الكلمة أو الرد فارغ، أو أطول من الحد المسموح.' });
        }
        if (ids.has(id) || triggers.has(normalizedTrigger)) {
            return res.status(400).json({ success: false, error: 'تأكد من عدم تكرار معرّف الرد أو كلمته.' });
        }

        ids.add(id);
        triggers.add(normalizedTrigger);
        normalizedResponses.push({ id, trigger, response, enabled: item.enabled });
    }

    db.updateGuildData(req.params.guildId, {
        iraqiResponsesEnabled: enabled,
        iraqiResponses: normalizedResponses,
    });
    res.json({ success: true, enabled, responses: normalizedResponses });
});

// إعدادات الترحيب — قراءة فقط (الكتابة تتم من Bot Owner Dashboard)

/**
 * GET /server/:guildId/welcome-settings
 * يُرجع إعدادات الترحيب الحالية لهذا السيرفر.
 */
router.get('/welcome-settings', async (req, res) => {
    const { guildId } = req.params;
    const guildData = db.getGuildData(guildId);

    let channelName = null;
    let channelValid = false;
    const client = req.app.get('client');
    if (guildData.welcomeChannel && client) {
        try {
            const ch = await client.channels.fetch(guildData.welcomeChannel).catch(() => null);
            if (ch && ch.guildId === guildId) { channelName = ch.name; channelValid = true; }
        } catch {}
    }

    res.json({
        success: true,
        welcomeEnabled:      guildData.welcomeEnabled  ?? false,
        welcomeChannel:      guildData.welcomeChannel  ?? null,
        welcomeChannelName:  channelName,
        welcomeChannelValid: channelValid,
        welcomeImage:        guildData.welcomeImage    ?? null,
        welcomeAvatarX:      guildData.welcomeAvatarX  ?? 960,
        welcomeAvatarY:      guildData.welcomeAvatarY  ?? 540,
        welcomeAvatarSize:   guildData.welcomeAvatarSize ?? 256,
        welcomeAvatarRadius: guildData.welcomeAvatarRadius ?? 50,
    });
});

/**
 * POST /server/:guildId/welcome-settings
 * يحفظ إعدادات الترحيب لهذا السيرفر مباشرة (مالك السيرفر يستطيع الآن ضبط ترحيبه)
 */
router.post('/welcome-settings', async (req, res) => {
    const { guildId } = req.params;
    const {
        welcomeEnabled, welcomeChannel: channelId,
        welcomeImage, welcomeAvatarX, welcomeAvatarY,
        welcomeAvatarSize, welcomeAvatarRadius
    } = req.body;

    if (welcomeEnabled !== undefined && typeof welcomeEnabled !== 'boolean') {
        return res.status(400).json({ success: false, error: 'قيمة تفعيل الترحيب غير صالحة' });
    }

    const updates = {};
    if (welcomeEnabled !== undefined) updates.welcomeEnabled = welcomeEnabled;
    if (channelId !== undefined) {
        if (channelId === null || channelId === '') {
            updates.welcomeChannel = null;
        } else {
            if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) {
                return res.status(400).json({ success: false, error: 'معرف قناة الترحيب غير صالح' });
            }
            const client = req.app.get('client');
            const guild = req.guild || await client?.guilds.fetch(guildId);
            if (!guild) return res.status(404).json({ success: false, error: 'السيرفر غير موجود أو غير متاح للبوت' });
            const channel = await getGuildTextChannel(guild, channelId);
            if (!channel) {
                return res.status(400).json({ success: false, error: 'يجب اختيار قناة نصية من هذا السيرفر' });
            }
            updates.welcomeChannel = channel.id;
        }
    }
    if (welcomeAvatarX !== undefined) updates.welcomeAvatarX = Number(welcomeAvatarX) || 960;
    if (welcomeAvatarY !== undefined) updates.welcomeAvatarY = Number(welcomeAvatarY) || 540;
    if (welcomeAvatarSize !== undefined) updates.welcomeAvatarSize = Number(welcomeAvatarSize) || 256;
    if (welcomeAvatarRadius !== undefined) updates.welcomeAvatarRadius = Number(welcomeAvatarRadius) || 50;

    if (req.body.deleteWelcomeImage) {
        updates.welcomeImage = null;
        db.deleteWelcomeImageBase64(guildId).catch(console.error);
    } else if (req.body.welcomeImageBase64) {
        try {
            db.setWelcomeImageBase64(guildId, req.body.welcomeImageBase64).catch(console.error);
            updates.welcomeImage = `/api/public/welcome-image/${guildId}`;
        } catch (uploadErr) {
            appLogger.error('[ServerOwner/Welcome] فشل حفظ الصورة المرفوعة:', uploadErr);
        }
    } else if (welcomeImage !== undefined) {
        updates.welcomeImage = welcomeImage || null;
    }

    db.updateGuildData(guildId, updates);
    appLogger.info(`[ServerOwner/Welcome] تم حفظ إعدادات الترحيب لـ Guild ${guildId}:`, updates);

    res.json({ success: true, message: 'تم حفظ إعدادات الترحيب ✅' });
});

/**
 * POST /server/:guildId/test-welcome
 * تجربة إرسال ترحيب للسيرفر
 */
router.post('/test-welcome', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');

    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل' });
    }

    const guildData = db.getGuildData(guildId);
    const channelId = guildData.welcomeChannel;

    if (!channelId) {
        return res.status(400).json({
            success: false,
            error: 'لم يتم تحديد قناة ترحيب. اختر القناة من الإعدادات أولاً.'
        });
    }

    try {
        const guild = req.guild || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return res.status(404).json({ success: false, error: 'السيرفر غير موجود' });
        const channel = await getGuildTextChannel(guild, channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: 'قناة الترحيب ليست قناة نصية في هذا السيرفر' });
        }

        const { PermissionsBitField } = require('discord.js');
        const botMember = guild.members.me;
        if (!channel.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages)) {
            return res.status(403).json({
                success: false,
                error: `❌ البوت لا يملك صلاحية الإرسال في #${channel.name}`
            });
        }

        // جلب عضو للتجربة
        let testMember = null;
        const tryId = req.user?.userId || req.user?.id;
        if (tryId) { try { testMember = await guild.members.fetch(tryId); } catch {} }
        if (!testMember) { try { testMember = await guild.members.fetch(client.user.id); } catch {} }
        if (!testMember) {
            return res.status(404).json({ success: false, error: 'تعذّر جلب عضو للتجربة' });
        }

        const { sendWelcomeToChannel } = require('../../../utils/welcome');
        await sendWelcomeToChannel(channel, testMember, guildData);

        res.json({
            success: true,
            message: `✅ تم إرسال رسالة ترحيب تجريبية إلى #${channel.name} بنجاح! 🎉`
        });
    } catch (err) {
        appLogger.error('[ServerOwner/test-welcome]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// الأعضاء
router.get('/members/leaderboard', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const leaderboard = members
            .filter(m => !m.user.bot)
            .map(m => {
                const uData = db.getUserData(m.id);
                return {
                    id: m.id,
                    username: m.user.username,
                    displayName: m.displayName,
                    avatar: m.user.displayAvatarURL({ dynamic: true }),
                    balance: uData.balance,
                    bank: uData.bank,
                    level: uData.level,
                    xp: uData.xp,
                };
            })
            .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
            .slice(0, 20);

        res.json({ success: true, leaderboard });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Roles
router.get('/auto-role', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل بديسكورد' });
    }

    try {
        const guild = await client.guilds.fetch(guildId);
        const guildData = db.getGuildData(guildId);
        let botMember = guild.members.me;
        if (!botMember) {
            try {
                botMember = await guild.members.fetchMe();
            } catch (err) {
                appLogger.error(`[ServerOwner/auto-role] Failed to fetch bot member in guild ${guildId}:`, err);
                return res.status(503).json({ success: false, error: 'تعذر التحقق من صلاحيات البوت' });
            }
        }
        const roleId = guildData.autoRoleId || null;
        let role = roleId ? guild.roles.cache.get(roleId) || null : null;
        if (roleId && !role) {
            try {
                role = await guild.roles.fetch(roleId);
            } catch (err) {
                appLogger.error(`[ServerOwner/auto-role] Failed to fetch configured role in guild ${guildId}:`, err);
                return res.status(500).json({ success: false, error: 'تعذر التحقق من الرتبة المحفوظة' });
            }
        }
        const canManageRoles = botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles) ?? false;
        const roleCanBeManaged = Boolean(
            role && role.id !== guild.id && !role.managed && botMember &&
            role.comparePositionTo(botMember.roles.highest) < 0
        );
        const storedPermissions = Array.isArray(guildData.autoRolePermissions)
            ? guildData.autoRolePermissions.filter(name => AUTO_ROLE_PERMISSION_NAMES.has(name))
            : [];
        const rolePermissions = role
            ? role.permissions.toArray().filter(name => AUTO_ROLE_PERMISSION_NAMES.has(name))
            : storedPermissions;
        let backfill = guildData.autoRoleBackfill || {};
        if (backfill.status === 'running' && !autoRole.isBackfillRunning(guildId)) {
            backfill = {
                ...backfill,
                status: 'failed',
                error: 'انقطع تنفيذ التوزيع قبل اكتماله. أعد الفحص لإكماله.',
                finishedAt: new Date().toISOString(),
            };
            db.updateGuildData(guildId, { autoRoleBackfill: backfill });
        }

        res.json({
            success: true,
            enabled: Boolean(guildData.autoRoleEnabled),
            roleId: role?.id || roleId,
            roleName: role?.name || guildData.autoRoleName || 'عضو جديد',
            roleExists: Boolean(role),
            roleCanBeManaged,
            canManageRoles,
            permissions: rolePermissions,
            permissionOptions: AUTO_ROLE_PERMISSION_OPTIONS,
            backfill,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/auto-role', async (req, res) => {
    const { guildId } = req.params;
    const { enabled, roleName, permissions } = req.body;

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ success: false, error: 'حالة الرتبة التلقائية غير صالحة' });
    }
    if (!enabled) {
        const guildData = db.getGuildData(guildId);
        const backfill = guildData.autoRoleBackfill || {};
        const updates = { autoRoleEnabled: false };
        if (backfill.status === 'running') {
            updates.autoRoleBackfill = {
                ...backfill,
                status: 'stopped',
                error: 'تم إيقاف التوزيع يدوياً',
                finishedAt: new Date().toISOString(),
            };
        }
        db.updateGuildData(guildId, updates);
        return res.json({
            success: true,
            enabled: false,
            backfill: db.getGuildData(guildId).autoRoleBackfill,
            message: 'تم إيقاف الرتبة التلقائية',
        });
    }

    const normalizedName = typeof roleName === 'string' ? roleName.trim() : '';
    if (!normalizedName || normalizedName.length > 100) {
        return res.status(400).json({ success: false, error: 'اسم الرتبة مطلوب ويجب ألا يتجاوز 100 حرف' });
    }
    if (!Array.isArray(permissions) ||
        permissions.some(name => typeof name !== 'string' || !AUTO_ROLE_PERMISSION_NAMES.has(name))) {
        return res.status(400).json({ success: false, error: 'قائمة صلاحيات الرتبة تحتوي على قيمة غير مدعومة' });
    }

    const client = req.app.get('client');
    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل بديسكورد' });
    }

    try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return res.status(404).json({ success: false, error: 'السيرفر غير موجود أو غير متاح للبوت' });

        let botMember = guild.members.me;
        if (!botMember) {
            try {
                botMember = await guild.members.fetchMe();
            } catch (err) {
                appLogger.error(`[ServerOwner/auto-role] Failed to fetch bot member in guild ${guildId}:`, err);
                return res.status(503).json({ success: false, error: 'تعذر التحقق من صلاحيات البوت' });
            }
        }
        if (!botMember) return res.status(503).json({ success: false, error: 'تعذر التحقق من عضو البوت في السيرفر' });
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return res.status(403).json({ success: false, error: 'يحتاج البوت إلى صلاحية Manage Roles' });
        }

        const guildData = db.getGuildData(guildId);
        const wasEnabled = Boolean(guildData.autoRoleEnabled);
        const previousBackfillStatus = guildData.autoRoleBackfill?.status || 'not_started';
        let role = guildData.autoRoleId ? guild.roles.cache.get(guildData.autoRoleId) : null;
        if (guildData.autoRoleId && !role) {
            try {
                role = await guild.roles.fetch(guildData.autoRoleId);
            } catch (err) {
                appLogger.error(`[ServerOwner/auto-role] Failed to fetch configured role in guild ${guildId}:`, err);
                return res.status(500).json({ success: false, error: 'تعذر التحقق من الرتبة المحفوظة' });
            }
        }

        if (role && (role.guild?.id !== guildId || role.managed ||
            role.comparePositionTo(botMember.roles.highest) >= 0)) {
            return res.status(403).json({ success: false, error: 'الرتبة الحالية مُدارة أو أعلى من رتبة البوت' });
        }

        const rolePermissions = [...new Set(permissions)]
            .map(name => PermissionsBitField.Flags[name]);
        const reason = 'إعداد الرتبة التلقائية من لوحة مالك السيرفر';
        let createdRole = false;
        if (role) {
            role = await role.edit({ name: normalizedName, permissions: rolePermissions, reason });
        } else {
            role = await guild.roles.create({ name: normalizedName, permissions: rolePermissions, reason });
            createdRole = true;
        }

        if (role.id === guild.id || role.managed ||
            role.comparePositionTo(botMember.roles.highest) >= 0) {
            if (createdRole) await role.delete('إزالة رتبة تلقائية لا يستطيع البوت إدارتها');
            return res.status(403).json({ success: false, error: 'يجب أن تكون رتبة البوت أعلى من الرتبة التلقائية' });
        }

        db.updateGuildData(guildId, {
            autoRoleEnabled: true,
            autoRoleId: role.id,
            autoRoleName: role.name,
            autoRolePermissions: [...new Set(permissions)],
        });
        const shouldStartBackfill = createdRole || !wasEnabled || previousBackfillStatus !== 'completed';
        if (shouldStartBackfill) autoRole.startBackfill(client, guildId);
        const backfill = db.getGuildData(guildId).autoRoleBackfill;

        res.json({
            success: true,
            enabled: true,
            roleId: role.id,
            roleName: role.name,
            permissions: [...new Set(permissions)],
            backfill,
            message: 'تم حفظ الرتبة التلقائية وإعداد صلاحياتها ✅',
        });
    } catch (err) {
        appLogger.error('[ServerOwner/auto-role]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/auto-role/backfill', (req, res) => {
    const { guildId } = req.params;
    const guildData = db.getGuildData(guildId);
    if (!guildData.autoRoleEnabled || !guildData.autoRoleId) {
        return res.status(400).json({ success: false, error: 'فعّل الرتبة التلقائية واحفظها أولاً' });
    }

    const client = req.app.get('client');
    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل بديسكورد' });
    }

    const result = autoRole.startBackfill(client, guildId);
    if (!result.started && result.status === 'running') {
        return res.status(409).json({ success: false, error: 'توزيع الرتبة على الأعضاء جارٍ بالفعل' });
    }
    if (!result.started) {
        return res.status(400).json({ success: false, error: 'تعذر بدء فحص الأعضاء' });
    }

    res.json({
        success: true,
        backfill: db.getGuildData(guildId).autoRoleBackfill,
        message: 'بدأ فحص أعضاء السيرفر وتوزيع الرتبة عليهم',
    });
});

router.get('/roles', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const botMember = guild.members.me;
        const botTopRole = botMember?.roles?.highest?.position ?? 0;
        const canManageRoles = botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles) ?? false;

        const roles = guild.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.hexColor,
                position: r.position,
                managed: r.managed,
                mentionable: r.mentionable,
                canManage: canManageRoles && r.position < botTopRole && !r.managed,
                memberCount: r.members.size,
            }));

        res.json({ success: true, roles, canManageRoles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/roles/manage', async (req, res) => {
    const { guildId } = req.params;
    const { roleId, userId, action } = req.body;

    if (typeof roleId !== 'string' || typeof userId !== 'string' ||
        !/^\d{17,20}$/.test(roleId) || !/^\d{17,20}$/.test(userId) ||
        !['add', 'remove'].includes(action)) {
        return res.status(400).json({ success: false, error: 'بيانات الدور أو العضو غير صالحة' });
    }

    const client = req.app.get('client');
    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل بديسكورد' });
    }

    try {
        const guild = await client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId).catch(() => null);
        const member = await guild.members.fetch(userId).catch(() => null);
        const botMember = guild.members.me || await guild.members.fetchMe();

        if (!role || role.guild.id !== guildId) {
            return res.status(404).json({ success: false, error: 'الدور غير موجود في هذا السيرفر' });
        }
        if (!member) {
            return res.status(404).json({ success: false, error: 'العضو غير موجود في هذا السيرفر' });
        }
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return res.status(403).json({ success: false, error: 'البوت لا يملك صلاحية إدارة الأدوار' });
        }
        if (role.id === guild.id || role.managed || role.comparePositionTo(botMember.roles.highest) >= 0) {
            return res.status(403).json({ success: false, error: 'لا يستطيع البوت تعديل هذا الدور بسبب ترتيبه أو كونه مُداراً' });
        }
        if (member.id === guild.ownerId || member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) {
            return res.status(403).json({ success: false, error: 'لا يستطيع البوت إدارة أدوار هذا العضو بسبب ترتيب العضو' });
        }

        if (action === 'add') await member.roles.add(role, 'إدارة الدور من لوحة السيرفر');
        else await member.roles.remove(role, 'إدارة الدور من لوحة السيرفر');

        res.json({
            success: true,
            action,
            member: member.user.tag,
            role: role.name,
            message: action === 'add' ? 'تمت إضافة الدور للعضو ✅' : 'تمت إزالة الدور من العضو ✅',
        });
    } catch (err) {
        appLogger.error('[ServerOwner/roles/manage]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

