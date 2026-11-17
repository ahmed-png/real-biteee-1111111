'use strict';
const appLogger = require('./app-logger');

const { PermissionsBitField } = require('discord.js');
const db = require('./database');
const { AUTO_ROLE_PERMISSION_NAMES } = require('./auto-role-permissions');

const BACKFILL_DEFAULTS = {
    status: 'not_started',
    processed: 0,
    total: 0,
    assigned: 0,
    skipped: 0,
    failed: 0,
    error: null,
    startedAt: null,
    finishedAt: null,
};
const MEMBER_PAGE_SIZE = 1000;
const ASSIGNMENT_CONCURRENCY = 5;
const PROGRESS_INTERVAL = 50;
const backfillJobs = new Map();

function updateBackfill(guildId, updates) {
    const current = db.getGuildData(guildId).autoRoleBackfill || {};
    return db.updateGuildData(guildId, {
        autoRoleBackfill: { ...BACKFILL_DEFAULTS, ...current, ...updates },
    });
}

function hasSafePermissions(role) {
    return role.permissions.toArray().every(permission => AUTO_ROLE_PERMISSION_NAMES.has(permission));
}

function roleCanBeManaged(role, guild, botMember) {
    return role && role.id !== guild.id && !role.managed &&
        role.comparePositionTo(botMember.roles.highest) < 0;
}

function startBackfill(client, guildId) {
    if (backfillJobs.has(guildId)) return { started: false, status: 'running' };

    const guildData = db.getGuildData(guildId);
    if (!guildData.autoRoleEnabled || !guildData.autoRoleId) {
        return { started: false, status: 'not_started' };
    }

    const job = runBackfill(client, guildId, guildData.autoRoleId)
        .catch(error => {
            appLogger.error(`[AutoRole] Backfill failed unexpectedly in guild ${guildId}:`, error);
            updateBackfill(guildId, {
                status: 'failed',
                error: error.message || 'تعذر إكمال توزيع الرتبة',
                finishedAt: new Date().toISOString(),
            });
        })
        .finally(() => backfillJobs.delete(guildId));
    backfillJobs.set(guildId, job);
    return { started: true, status: 'running' };
}

function isBackfillRunning(guildId) {
    return backfillJobs.has(guildId);
}

function resumeInterruptedBackfills(client) {
    let resumed = 0;
    for (const guild of client.guilds.cache.values()) {
        const guildData = db.getGuildData(guild.id);
        if (guildData.autoRoleEnabled && guildData.autoRoleBackfill?.status === 'running') {
            if (startBackfill(client, guild.id).started) resumed++;
        }
    }
    return resumed;
}

async function runBackfill(client, guildId, roleId) {
    let processed = 0;
    let assigned = 0;
    let skipped = 0;
    let failed = 0;
    let total = 0;
    let lastSavedProgress = 0;
    const errorSamples = [];
    const startedAt = new Date().toISOString();
    const saveProgress = (status = 'running', error = null, finishedAt = null) => updateBackfill(guildId, {
        status, processed, total, assigned, skipped, failed, error, startedAt, finishedAt,
    });

    saveProgress();

    let guild;
    try {
        guild = await client.guilds.fetch(guildId);
    } catch (error) {
        saveProgress('failed', `تعذر جلب السيرفر: ${error.message}`, new Date().toISOString());
        return;
    }

    let botMember = guild.members.me;
    if (!botMember) {
        try {
            botMember = await guild.members.fetchMe();
        } catch (error) {
            saveProgress('failed', `تعذر التحقق من البوت: ${error.message}`, new Date().toISOString());
            return;
        }
    }
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        saveProgress('failed', 'البوت لا يملك صلاحية Manage Roles', new Date().toISOString());
        return;
    }

    let role = guild.roles.cache.get(roleId);
    if (!role) {
        try {
            role = await guild.roles.fetch(roleId);
        } catch (error) {
            saveProgress('failed', `تعذر جلب الرتبة: ${error.message}`, new Date().toISOString());
            return;
        }
    }
    if (!role || role.guild?.id !== guildId || !roleCanBeManaged(role, guild, botMember)) {
        saveProgress('failed', 'الرتبة غير موجودة أو لم تعد قابلة للإدارة بواسطة البوت', new Date().toISOString());
        return;
    }
    if (!hasSafePermissions(role)) {
        saveProgress('failed', 'تحتوي الرتبة على صلاحيات خارج القائمة الآمنة', new Date().toISOString());
        return;
    }

    total = Number(guild.memberCount) || 0;
    saveProgress();
    let cursor = null;

    while (true) {
        const latestSettings = db.getGuildData(guildId);
        if (!latestSettings.autoRoleEnabled || latestSettings.autoRoleId !== roleId) {
            saveProgress('stopped', 'تم إيقاف توزيع الرتبة قبل اكتمال الفحص', new Date().toISOString());
            return;
        }

        const options = { limit: MEMBER_PAGE_SIZE, cache: false };
        if (cursor) options.after = cursor;
        let members;
        try {
            members = await guild.members.list(options);
        } catch (error) {
            const intentHint = ' تحقق من تفعيل Server Members Intent من Discord Developer Portal.';
            saveProgress('failed', `تعذر جلب قائمة الأعضاء: ${error.message}.${intentHint}`, new Date().toISOString());
            return;
        }
        if (members.size === 0) break;

        total = Math.max(total, processed + members.size);
        const pageMembers = [...members.values()];
        for (let index = 0; index < pageMembers.length; index += ASSIGNMENT_CONCURRENCY) {
            const currentSettings = db.getGuildData(guildId);
            if (!currentSettings.autoRoleEnabled || currentSettings.autoRoleId !== roleId) {
                saveProgress('stopped', 'تم إيقاف توزيع الرتبة قبل اكتمال الفحص', new Date().toISOString());
                return;
            }

            const batch = pageMembers.slice(index, index + ASSIGNMENT_CONCURRENCY);
            await Promise.all(batch.map(async member => {
                if (member.roles.cache.has(roleId)) {
                    skipped++;
                    processed++;
                    return;
                }
                if (member.id === guild.ownerId ||
                    member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) {
                    skipped++;
                    processed++;
                    return;
                }

                try {
                    await member.roles.add(role, 'Initial automatic role assignment');
                    assigned++;
                } catch (error) {
                    failed++;
                    if (errorSamples.length < 5) errorSamples.push(`${member.id}: ${error.message}`);
                } finally {
                    processed++;
                }
            }));

            if (processed - lastSavedProgress >= PROGRESS_INTERVAL) {
                saveProgress();
                lastSavedProgress = processed;
            }
        }

        const nextCursor = [...members.keys()].reduce((max, id) =>
            !max || BigInt(id) > BigInt(max) ? id : max, null);
        if (!nextCursor || nextCursor === cursor || members.size < MEMBER_PAGE_SIZE) break;
        cursor = nextCursor;
        saveProgress();
        lastSavedProgress = processed;
    }

    const status = failed > 0 ? 'partial' : 'completed';
    const error = errorSamples.length > 0 ? errorSamples.join('\n').slice(0, 1000) : null;
    saveProgress(status, error, new Date().toISOString());
    appLogger.info(`[AutoRole] Backfill ${status} in guild ${guildId}: ${assigned} assigned, ${skipped} skipped, ${failed} failed`);
}

async function assignAutoRole(member) {
    if (!member?.guild) return false;

    const guildData = db.getGuildData(member.guild.id);
    if (!guildData.autoRoleEnabled) return false;

    const roleId = guildData.autoRoleId;
    if (!roleId) {
        appLogger.error(`[AutoRole] Enabled without a role ID in guild ${member.guild.id}`);
        return false;
    }

    const guild = member.guild;
    let botMember = guild.members.me;
    if (!botMember) {
        try {
            botMember = await guild.members.fetchMe();
        } catch (error) {
            appLogger.error(`[AutoRole] Failed to fetch bot member in guild ${guild.id}:`, error);
            return false;
        }
    }
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        appLogger.error(`[AutoRole] Missing ManageRoles permission in guild ${guild.id}`);
        return false;
    }

    let role = guild.roles.cache.get(roleId);
    if (!role) {
        try {
            role = await guild.roles.fetch(roleId);
        } catch (error) {
            appLogger.error(`[AutoRole] Failed to fetch role ${roleId} in guild ${guild.id}:`, error);
            return false;
        }
    }

    if (!role || role.guild?.id !== guild.id) {
        appLogger.error(`[AutoRole] Configured role ${roleId} is missing from guild ${guild.id}`);
        return false;
    }
    if (!hasSafePermissions(role)) {
        const unsupportedPermissions = role.permissions.toArray()
            .filter(permission => !AUTO_ROLE_PERMISSION_NAMES.has(permission));
        appLogger.error(
            `[AutoRole] Role ${roleId} has permissions outside the allowed auto-role set in guild ${guild.id}:`,
            unsupportedPermissions
        );
        return false;
    }
    if (!roleCanBeManaged(role, guild, botMember)) {
        appLogger.error(`[AutoRole] Configured role ${roleId} is not manageable in guild ${guild.id}`);
        return false;
    }
    if (member.id === guild.ownerId || member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) {
        appLogger.error(`[AutoRole] Member ${member.id} is above the bot's role hierarchy in guild ${guild.id}`);
        return false;
    }
    if (member.roles.cache.has(role.id)) return true;

    try {
        await member.roles.add(role, 'Auto role assigned to a new member');
        appLogger.info(`[AutoRole] Assigned role ${role.id} to member ${member.id} in guild ${guild.id}`);
        return true;
    } catch (error) {
        appLogger.error(`[AutoRole] Failed to assign role ${role.id} to member ${member.id} in guild ${guild.id}:`, error);
        return false;
    }
}

module.exports = { assignAutoRole, startBackfill, isBackfillRunning, resumeInterruptedBackfills };
