const appLogger = require('./app-logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const db = require('./database');
const config = require('../config');
const channelResolver = require('./channel-resolver');

const specializedAuditActions = new Set([
    AuditLogEvent.GuildUpdate,
    AuditLogEvent.ChannelCreate,
    AuditLogEvent.ChannelUpdate,
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.MemberKick,
    AuditLogEvent.MemberBanAdd,
    AuditLogEvent.MemberBanRemove,
    AuditLogEvent.MemberUpdate,
    AuditLogEvent.MemberRoleUpdate,
    AuditLogEvent.MemberMove,
    AuditLogEvent.MemberDisconnect,
    AuditLogEvent.RoleCreate,
    AuditLogEvent.RoleUpdate,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.InviteCreate,
    AuditLogEvent.InviteDelete,
    AuditLogEvent.EmojiCreate,
    AuditLogEvent.EmojiDelete,
    AuditLogEvent.MessageDelete,
]);

const auditActionLabels = {
    [AuditLogEvent.ChannelOverwriteCreate]: 'إضافة صلاحيات لقناة',
    [AuditLogEvent.ChannelOverwriteUpdate]: 'تعديل صلاحيات قناة',
    [AuditLogEvent.ChannelOverwriteDelete]: 'حذف صلاحيات قناة',
    [AuditLogEvent.ChannelPositionUpdate]: 'تغيير ترتيب القنوات',
    [AuditLogEvent.MemberPrune]: 'إزالة أعضاء غير نشطين',
    [AuditLogEvent.BotAdd]: 'إضافة بوت',
    [AuditLogEvent.RolePositionUpdate]: 'تغيير ترتيب الرتب',
    [AuditLogEvent.InviteUpdate]: 'تعديل دعوة',
    [AuditLogEvent.WebhookCreate]: 'إنشاء Webhook',
    [AuditLogEvent.WebhookUpdate]: 'تعديل Webhook',
    [AuditLogEvent.WebhookDelete]: 'حذف Webhook',
    [AuditLogEvent.EmojiUpdate]: 'تعديل إيموجي',
    [AuditLogEvent.MessageBulkDelete]: 'حذف مجموعة رسائل',
    [AuditLogEvent.MessagePin]: 'تثبيت رسالة',
    [AuditLogEvent.MessageUnpin]: 'إلغاء تثبيت رسالة',
    [AuditLogEvent.IntegrationCreate]: 'إضافة تكامل',
    [AuditLogEvent.IntegrationUpdate]: 'تعديل تكامل',
    [AuditLogEvent.IntegrationDelete]: 'حذف تكامل',
    [AuditLogEvent.StageInstanceCreate]: 'إنشاء جلسة Stage',
    [AuditLogEvent.StageInstanceUpdate]: 'تعديل جلسة Stage',
    [AuditLogEvent.StageInstanceDelete]: 'إنهاء جلسة Stage',
    [AuditLogEvent.StickerCreate]: 'إضافة ملصق',
    [AuditLogEvent.StickerUpdate]: 'تعديل ملصق',
    [AuditLogEvent.StickerDelete]: 'حذف ملصق',
    [AuditLogEvent.GuildScheduledEventCreate]: 'إنشاء فعالية',
    [AuditLogEvent.GuildScheduledEventUpdate]: 'تعديل فعالية',
    [AuditLogEvent.GuildScheduledEventDelete]: 'حذف فعالية',
    [AuditLogEvent.ThreadCreate]: 'إنشاء موضوع',
    [AuditLogEvent.ThreadUpdate]: 'تعديل موضوع',
    [AuditLogEvent.ThreadDelete]: 'حذف موضوع',
    [AuditLogEvent.ApplicationCommandPermissionUpdate]: 'تعديل صلاحيات أمر',
    [AuditLogEvent.SoundboardSoundCreate]: 'إضافة صوت للوحة الأصوات',
    [AuditLogEvent.SoundboardSoundUpdate]: 'تعديل صوت بلوحة الأصوات',
    [AuditLogEvent.SoundboardSoundDelete]: 'حذف صوت من لوحة الأصوات',
    [AuditLogEvent.AutoModerationRuleCreate]: 'إنشاء قاعدة AutoMod',
    [AuditLogEvent.AutoModerationRuleUpdate]: 'تعديل قاعدة AutoMod',
    [AuditLogEvent.AutoModerationRuleDelete]: 'حذف قاعدة AutoMod',
    [AuditLogEvent.AutoModerationBlockMessage]: 'حظر رسالة عبر AutoMod',
    [AuditLogEvent.AutoModerationFlagToChannel]: 'إرسال تنبيه عبر AutoMod',
    [AuditLogEvent.AutoModerationUserCommunicationDisabled]: 'إيقاف عضو عبر AutoMod',
    [AuditLogEvent.AutoModerationQuarantineUser]: 'عزل عضو عبر AutoMod',
    [AuditLogEvent.OnboardingPromptCreate]: 'إضافة سؤال إعداد السيرفر',
    [AuditLogEvent.OnboardingPromptUpdate]: 'تعديل سؤال إعداد السيرفر',
    [AuditLogEvent.OnboardingPromptDelete]: 'حذف سؤال إعداد السيرفر',
    [AuditLogEvent.OnboardingCreate]: 'تفعيل إعدادات المجتمع',
    [AuditLogEvent.OnboardingUpdate]: 'تعديل إعدادات المجتمع',
    [AuditLogEvent.HomeSettingsCreate]: 'إنشاء إعدادات صفحة المجتمع',
    [AuditLogEvent.HomeSettingsUpdate]: 'تعديل إعدادات صفحة المجتمع',
    [AuditLogEvent.VoiceChannelStatusCreate]: 'تغيير حالة قناة صوتية',
    [AuditLogEvent.VoiceChannelStatusDelete]: 'مسح حالة قناة صوتية',
};

const missingChannelWarnings = new Set();

// استثناء البوت من السجلات
// لا يجب أن يُسجَّل البوت كـ executor لمخالفة في سجلات الحماية
// هذا يمنع "البوت يرى نفسه مخالفاً" عند تنفيذ أوامر مثل حذف رسالة سبام

let _botId = null;

/**
 * تعيين معرف البوت (يُستدعى مرة واحدة عند بدء التشغيل من ready.js)
 */
function setBotId(id) {
    _botId = id;
}

/**
 * فحص ما إذا كان الـ executor هو البوت نفسه
 * @param {import('discord.js').User|null} executor
 * @returns {boolean}
 */
function _isBotAction(executor) {
    if (!executor) return false;
    if (_botId && executor.id === _botId) return true;
    if (executor.bot === true) return true;
    return false;
}

// إرسال Log إلى قناة السجلات
async function sendLog(guild, embed) {
    if (!guild) return false;

    let logChannel = null;

    // 1. استخدام logChannelId المحفوظ في DB أولاً (أدق)
    try {
        const guildData = db.getGuildData(guild.id);
        const logId = guildData.logChannelId || guildData.logChannel;
        if (logId) {
            logChannel = guild.channels.cache.get(logId) || null;
        }
    } catch (error) {
        appLogger.error(`[Logger] تعذر قراءة قناة السجلات للسيرفر ${guild.id}:`, error.message);
    }

    // 2. Fallback — channel-resolver بالاسم
    if (!logChannel) {
        try {
            logChannel = channelResolver.resolve(guild, 'logChannel');
        } catch (error) {
            appLogger.error(`[Logger] تعذر العثور على قناة السجلات للسيرفر ${guild.id}:`, error.message);
        }
    }

    if (!logChannel) {
        if (!missingChannelWarnings.has(guild.id)) {
            appLogger.warn(`[Logger] لا توجد قناة سجلات مضبوطة للسيرفر ${guild.id}.`);
            missingChannelWarnings.add(guild.id);
        }
        return false;
    }

    try {
        await logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        missingChannelWarnings.delete(guild.id);
        return true;
    } catch (error) {
        appLogger.error(`[Logger] تعذر إرسال سجل السيرفر ${guild.id} إلى #${logChannel.name || logChannel.id}:`, error.message);
        return false;
    }
}

// Helper: جلب المنفذ من Audit Log بدقة
async function getExecutor(guild, type, targetId = null, windowMs = 15000) {
    if (!guild?.members?.me?.permissions?.has('ViewAuditLog')) return null;

    // Retry mechanism: جرب 3 مرات لضمان التقاط الحدث من Audit Log
    for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 1000 + (i * 500))); // 1s, 1.5s, 2s
        try {
            const auditLogs = await guild.fetchAuditLogs({ type, limit: 20 });
            const entry = auditLogs.entries.find(e => {
                const isRecent = (Date.now() - e.createdTimestamp) < windowMs;
                const targetMatch = targetId
                    ? (e.target?.id === targetId || e.targetId === targetId)
                    : true;
                return isRecent && targetMatch;
            });
            if (entry) return entry.executor;
        } catch {
            // تجاهل الأخطاء واستمر في المحاولة
        }
    }
    return null;
}

function clipAuditValue(value, maxLength = 220) {
    if (value === null || value === undefined || value === '') return '—';
    let text;
    try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        text = serialized === undefined ? String(value) : serialized;
    } catch {
        text = String(value);
    }
    if (text.length > maxLength) return `${text.slice(0, maxLength - 3)}...`;
    return text;
}

function formatLogValue(value) {
    return clipAuditValue(value, 140).replace(/`/g, "'").replace(/\r?\n/g, ' ');
}

function formatMessageContent(content, maxLength = 900) {
    if (!content) return 'ماكو محتوى نصي.';

    const formatted = String(content)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/<@!?(\d+)>/g, '@عضو $1')
        .replace(/<@&(\d+)>/g, '@رتبة $1')
        .replace(/<#(\d+)>/g, '#قناة $1')
        .replace(/@everyone/gi, '@ everyone')
        .replace(/@here/gi, '@ here')
        .replace(/(?:https?:\/\/|www\.|discord\.gg\/|discord(?:app)?\.com\/invite\/)[^\s<>"`]+/gi, match => {
            const url = match.replace(/[),.!?،؛:]+$/g, '');
            const punctuation = match.slice(url.length);
            try {
                const hostname = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
                return `رابط (${hostname})${punctuation}`;
            } catch {
                return `رابط${punctuation}`;
            }
        })
        .replace(/```/g, 'ˋˋˋ')
        .replace(/([\\*_~|>])/g, '\\$1')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (!formatted) return 'ماكو محتوى نصي.';
    return formatted.length > maxLength
        ? `${formatted.slice(0, maxLength - 3)}...`
        : formatted;
}

function addLogChange(changes, label, before, after) {
    const beforeText = formatLogValue(before);
    const afterText = formatLogValue(after);
    if (beforeText !== afterText) {
        changes.push(`**${label}:** \`${beforeText}\` → \`${afterText}\``);
    }
}

async function logAuditEntry(entry, guild) {
    if (!entry || !guild || specializedAuditActions.has(entry.action)) return false;

    const actionName = AuditLogEvent[entry.action] || `إجراء غير معروف (${entry.action})`;
    const actionLabel = auditActionLabels[entry.action]
        || actionName.replace(/([a-z])([A-Z])/g, '$1 $2');
    const executorName = entry.executor?.tag || entry.executor?.username || 'غير معروف';
    const executorId = entry.executor?.id || entry.executorId;
    const targetName = typeof entry.target === 'string'
        ? entry.target
        : entry.target?.name || entry.target?.tag || entry.target?.username || '';
    const targetValue = [targetName, entry.targetId].filter((value, index, values) => value && values.indexOf(value) === index).join(' · ')
        || 'غير محدد';

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`🧾 ${actionLabel}`.slice(0, 256))
        .setDescription('تم رصد تغيير أو إجراء إداري في السيرفر.')
        .addFields(
            { name: '👮 المنفذ', value: clipAuditValue(executorId ? `${executorName} (${executorId})` : executorName, 250), inline: true },
            { name: '🎯 الهدف', value: clipAuditValue(targetValue, 250), inline: true },
        )
        .setTimestamp(entry.createdAt || new Date())
        .setFooter({ text: `Audit ID: ${entry.id || 'غير متاح'} • Action: ${entry.action}` });

    if (entry.reason) {
        embed.addFields({ name: '📋 السبب', value: clipAuditValue(entry.reason, 900), inline: false });
    }

    if (Array.isArray(entry.changes) && entry.changes.length > 0) {
        const changes = entry.changes.slice(0, 7).map(change => {
            const before = change.old === undefined ? '—' : clipAuditValue(change.old, 150);
            const after = change.new === undefined ? '—' : clipAuditValue(change.new, 150);
            return `• **${clipAuditValue(change.key, 80)}**\nقبل: ${before}\nبعد: ${after}`;
        }).join('\n');
        const remaining = entry.changes.length > 7 ? `\n… و${entry.changes.length - 7} تغيير آخر` : '';
        embed.addFields({ name: '🔎 التفاصيل', value: `${changes}${remaining}`.slice(0, 1024), inline: false });
    }

    if (entry.extra) {
        embed.addFields({ name: 'ℹ️ معلومات إضافية', value: clipAuditValue(entry.extra, 900), inline: false });
    }

    return sendLog(guild, embed);
}

async function logAutoModerationExecution(execution) {
    if (!execution?.guild) return false;

    const user = execution.user || execution.member?.user;
    const actionNames = {
        1: 'حظر الرسالة',
        2: 'إرسال تنبيه',
        3: 'إيقاف العضو مؤقتاً',
        4: 'منع التفاعل',
    };
    const ruleName = execution.autoModerationRule?.name || execution.ruleId || 'قاعدة غير معروفة';
    const channelName = execution.channel ? `#${execution.channel.name}` : execution.channelId || 'غير محددة';
    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('🛡️ تنفيذ إجراء AutoMod')
        .setDescription(`تم تطبيق قاعدة **${clipAuditValue(ruleName, 200)}**.`)
        .addFields(
            { name: '👤 العضو', value: user ? `${clipAuditValue(user.tag || user.username, 160)} (${user.id})` : `ID: ${execution.userId || 'غير معروف'}`, inline: true },
            { name: '⚡ الإجراء', value: actionNames[execution.action?.type] || 'إجراء غير معروف', inline: true },
            { name: '📍 القناة', value: clipAuditValue(channelName, 200), inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `Rule ID: ${execution.ruleId || 'غير متاح'}` });

    if (execution.matchedKeyword) {
        embed.addFields({ name: '🔎 الكلمة المطابقة', value: formatMessageContent(execution.matchedKeyword, 500), inline: true });
    }
    if (execution.matchedContent) {
        embed.addFields({ name: '🧩 النص المطابق', value: formatMessageContent(execution.matchedContent), inline: false });
    }
    if (execution.content) {
        embed.addFields({ name: '📝 محتوى الرسالة', value: formatMessageContent(execution.content), inline: false });
    }

    return sendLog(execution.guild, embed);
}

// === سجلات الصوت ===

// تحديث حالة الصوت (انضمام، مغادرة، انتقال)
async function logVoiceState(oldState, newState) {
    const member = newState.member || oldState.member; // العضو
    if (!member) return;

    const guild = member.guild;
    let embed = new EmbedBuilder().setTimestamp().setFooter({ text: `ID: ${member.id}` });
    let action = '';
    const stateChanges = [];

    const voiceProperties = [
        ['selfMute', '🎙️ المايك (كتم ذاتي)', value => value ? '🔴 مقفول' : '🟢 مفتوح'],
        ['serverMute', '🔇 كتم المايك من الإدارة', value => value ? '🔒 مفعّل' : '🔓 مرفوع'],
        ['selfDeaf', '🎧 السماعة (صامت ذاتياً)', value => value ? '🔴 مطفّية' : '🟢 شغّالة'],
        ['serverDeaf', '🔈 إسكات السماعة من الإدارة', value => value ? '🔒 مفعّل' : '🔓 مرفوع'],
        ['streaming', '📺 البث المباشر', value => value ? '🟢 شغّال' : '⚫ متوقف'],
        ['selfVideo', '📷 الكاميرا', value => value ? '🟢 شغّالة' : '⚫ متوقفة'],
        ['suppress', '🎤 التحدث على Stage', value => value ? '⏸️ موقوف' : '▶️ مسموح'],
    ];

    for (const [property, label, formatValue] of voiceProperties) {
        if (oldState[property] !== newState[property]) {
            stateChanges.push(`**${label}:** ${formatValue(oldState[property])} → ${formatValue(newState[property])}`);
        }
    }

    // حالة الانضمام
    if (!oldState.channelId && newState.channelId) {
        action = 'join';
        embed.setColor('#00FF00')
            .setTitle('🔊 انضمام لقناة صوتية')
            .setDescription(`${member} انضم إلى القناة الصوتية`)
            .addFields({ name: 'القناة', value: `${newState.channel}`, inline: true });
    }
    // حالة المغادرة (Disconnect)
    else if (oldState.channelId && !newState.channelId) {
        action = 'leave';
        const executor = await getExecutor(guild, AuditLogEvent.MemberDisconnect, member.id);

        embed.setColor('#FF0000')
            .setTitle('🚪 مغادرة القناة الصوتية')
            .setDescription(`غادر العضو ${member} القناة الصوتية.`)
            .addFields(
                { name: 'القناة', value: `${oldState.channel}`, inline: true },
                { name: 'التفاصيل', value: executor ? `تم فصله بواسطة ${executor.tag || executor.username}.` : 'غادر بنفسه أو بسبب انقطاع الاتصال.', inline: true }
            );
    }
    // حالة الانتقال (Move)
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        action = 'move';
        const executor = await getExecutor(guild, AuditLogEvent.MemberMove, member.id);

        embed.setColor('#FFA500')
            .setTitle('↔️ نقل بين القنوات الصوتية')
            .setDescription(`انتقل العضو ${member} بين القنوات الصوتية.`)
            .addFields(
                { name: 'من', value: `${oldState.channel}`, inline: true },
                { name: 'إلى', value: `${newState.channel}`, inline: true },
                { name: 'التفاصيل', value: executor ? `تم نقله بواسطة ${executor.tag || executor.username}.` : 'انتقل بنفسه أو تعذّر تحديد المنفذ.', inline: true }
            );
    }
    if (stateChanges.length > 0) {
        action ||= 'state-change';
        if (!embed.data.title) {
            const changedServerMute = oldState.serverMute !== newState.serverMute;
            const changedSelfMute = oldState.selfMute !== newState.selfMute;
            const title = changedServerMute
                ? (newState.serverMute ? '🔇 تم كتم المايك من الإدارة' : '🔊 تم رفع الكتم الإداري عن المايك')
                : changedSelfMute
                    ? (newState.selfMute ? '🎙️ العضو قفل المايك' : '🎙️ العضو فتح المايك')
                    : '🎙️ تغيّرت حالة الصوت';
            embed.setColor('#5865F2')
                .setTitle(title)
                .setDescription(`تغيّرت حالة الصوت للعضو ${member}.`);
        }
        embed.addFields({ name: '🎙️ تفاصيل الحالة', value: stateChanges.join('\n').slice(0, 1000) });
    }

    if (action) {
        await sendLog(guild, embed);
    }
}

// === سجلات الرسائل ===

// رسالة محذوفة
async function logMessageDelete(message) {
    if (!message.author) return;
    if (!message.guild) return;
    if (message.author.bot) return;

    // في حالة حذف الرسالة، الـ target في الـ Audit Log هو صاحب الرسالة
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);

    if (_isBotAction(executor)) return;

    const safeContent = formatMessageContent(message.content);

    const executorText = executor
        ? `${executor.tag || executor.username} (${executor.id})`
        : 'غير معروف (قد يكون صاحب الرسالة أو تطبيقاً خارجياً)';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ حذف رسالة')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`انحذفت رسالة في ${message.channel}.`)
        .addFields(
            { name: '📝 محتوى الرسالة', value: safeContent, inline: false },
            { name: '👤 صاحب الرسالة', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: '👮 حذفها', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `معرّف الرسالة: ${message.id}` });

    if (message.attachments.size > 0) {
        const attachments = [...message.attachments.values()]
            .slice(0, 5)
            .map(attachment => {
                const name = formatMessageContent(attachment.name || 'ملف', 120);
                const size = attachment.size ? ` (${(attachment.size / 1024).toFixed(1)} كيلوبايت)` : '';
                return `• ${name}${size}`;
            })
            .join('\n');
        const remaining = message.attachments.size > 5 ? `\nو${message.attachments.size - 5} مرفق إضافي` : '';
        embed.addFields({
            name: `📎 المرفقات (${message.attachments.size})`,
            value: `${attachments}${remaining}`.slice(0, 1024),
            inline: false,
        });
    }

    await sendLog(message.guild, embed);
}

// رسالة معدلة
async function logMessageUpdate(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;
    if (newMessage.author?.bot) return;

    const safeOldContent = formatMessageContent(oldMessage.content);
    const safeNewContent = formatMessageContent(newMessage.content);

    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('✏️ تعديل رسالة')
        .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
        .setDescription(`تعدّلت رسالة في ${newMessage.channel}.`)
        .addFields(
            { name: 'قبل التعديل', value: safeOldContent, inline: false },
            { name: 'بعد التعديل', value: safeNewContent, inline: false },
            { name: '👤 صاحب الرسالة', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `معرّف الرسالة: ${newMessage.id}` });

    await sendLog(newMessage.guild, embed);
}

// === سجلات الأعضاء ===

// عضو انضم
async function logMemberJoin(member) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('👋 عضو جديد')
        .setDescription(`${member} انضم إلى السيرفر`)
        .addFields(
            { name: 'الاسم', value: member.user.tag, inline: true },
            { name: 'تاريخ الإنشاء', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// عضو غادر
async function logMemberLeave(member) {
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚪 عضو غادر')
        .setDescription(`${member.user.tag} غادر السيرفر`)
        .addFields(
            { name: 'الاسم', value: member.user.tag, inline: true },
            { name: 'تاريخ الانضمام', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: 'عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// تحديث عضو (رولات، اسم، إلخ)
async function logMemberUpdate(oldMember, newMember) {
    const changes = [];

    if (oldMember.user.globalName !== newMember.user.globalName) {
        changes.push(`**الاسم العام:** \`${oldMember.user.globalName || 'لا يوجد'}\` → \`${newMember.user.globalName || 'لا يوجد'}\``);
    }

    // تغيير الاسم
    if (oldMember.nickname !== newMember.nickname) {
        changes.push(`**الاسم المستعار:** \`${oldMember.nickname || 'لا يوجد'}\` → \`${newMember.nickname || 'لا يوجد'}\``);
    }

    // تغيير الرولات
    const oldRoles = oldMember.roles.cache.filter(r => r.id !== oldMember.guild.id);
    const newRoles = newMember.roles.cache.filter(r => r.id !== newMember.guild.id);

    const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
    const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

    if (addedRoles.size > 0) {
        changes.push(`**رولات مضافة:** ${addedRoles.map(r => r).join(', ')}`);
    }
    if (removedRoles.size > 0) {
        changes.push(`**رولات محذوفة:** ${removedRoles.map(r => r).join(', ')}`);
    }

    if (changes.length === 0) return;

    const hasRoleChanges = addedRoles.size > 0 || removedRoles.size > 0;
    const executor = await getExecutor(
        newMember.guild,
        hasRoleChanges ? AuditLogEvent.MemberRoleUpdate : AuditLogEvent.MemberUpdate,
        newMember.id
    );
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('👤 تحديث عضو')
        .setDescription(`**العضو:** ${newMember}`)
        .addFields(
            { name: 'التغييرات', value: changes.join('\n').slice(0, 1000) },
            { name: '👮 بواسطة', value: executor ? `${executor.tag || executor.username} (${executor.id})` : 'غير معروف', inline: true },
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${newMember.id}` });

    await sendLog(newMember.guild, embed);
}

// === سجلات القنوات ===

// قناة تم إنشاؤها
async function logChannelCreate(channel) {
    if (!channel.guild) return;

    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('📁 قناة جديدة تم إنشاؤها')
        .setDescription(`**تم إنشاء قناة جديدة:** ${channel}`)
        .addFields(
            { name: '🏷️ اسم القناة', value: `\`${channel.name}\``, inline: true },
            { name: '📋 نوع القناة', value: channel.type === 0 ? 'نصية 💬' : (channel.type === 2 ? 'صوتية 🔊' : 'أخرى'), inline: true },
            { name: '👮 المنشئ', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${channel.id}` });

    await sendLog(channel.guild, embed);
}

// قناة تم حذفها
async function logChannelDelete(channel) {
    if (!channel.guild) return;

    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ قناة تم حذفها')
        .setDescription(`**اسم القناة:** \`${channel.name}\``)
        .addFields(
            { name: '📋 نوع القناة', value: channel.type === 0 ? 'نصية 💬' : (channel.type === 2 ? 'صوتية 🔊' : 'أخرى'), inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${channel.id}` });

    await sendLog(channel.guild, embed);
}

// === سجلات الرولات ===

// رول تم إنشاؤه
async function logRoleCreate(role) {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🎭 رتبة جديدة تم إنشاؤها')
        .setDescription(`**الرتبة:** ${role}`)
        .addFields(
            { name: '🏷️ اسم الرتبة', value: `\`${role.name}\``, inline: true },
            { name: '🎨 اللون', value: `\`${role.hexColor}\``, inline: true },
            { name: '👮 المنشئ', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${role.id}` });

    await sendLog(role.guild, embed);
}

// رول تم حذفه
async function logRoleDelete(role) {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ رتبة تم حذفها')
        .setDescription(`**اسم الرتبة:** \`${role.name}\``)
        .addFields(
            { name: '🎨 اللون', value: `\`${role.hexColor}\``, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${role.id}` });

    await sendLog(role.guild, embed);
}

// === سجلات الباند والكيك ===

// باند
async function logBan(ban) {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#8B0000')
        .setTitle('🔨 تم حظر عضو (Ban)')
        .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
        .setDescription(`**تم حظر العضو:** ${ban.user}`)
        .addFields(
            { name: '📋 السبب', value: `\`${ban.reason || 'لا يوجد سبب'}\``, inline: false },
            { name: '👤 العضو', value: `\`${ban.user.id}\``, inline: true },
            { name: '👮 المحظور بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `User ID: ${ban.user.id}` });

    await sendLog(ban.guild, embed);
}

// إلغاء باند
async function logUnban(ban) {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🔓 تم رفع الحظر (Unban)')
        .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
        .setDescription(`**تم رفع الحظر عن العضو:** ${ban.user}`)
        .addFields(
            { name: '👤 العضو', value: `\`${ban.user.id}\``, inline: true },
            { name: '👮 تم الإلغاء بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `User ID: ${ban.user.id}` });

    await sendLog(ban.guild, embed);
}

// === سجلات الطرد والتايم أوت ===

// طرد عضو (Kick)
async function logKick(member, executor = null) {
    // If executor is not passed directly, try to fetch it
    if (!executor) {
        executor = await getExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
    }
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#E67E22')
        .setTitle('👢 تم طرد عضو (Kick)')
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setDescription(`**تم طرد العضو:** ${member.user}`)
        .addFields(
            { name: '👤 العضو', value: `\`${member.id}\``, inline: true },
            { name: '👮 المطرود بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `User ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// تطبيق Timeout على عضو
async function logTimeout(oldMember, newMember) {
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;

    // Timeout مُضاف
    if (!wasTimedOut && isTimedOut) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';
        const until = Math.floor(new Date(isTimedOut).getTime() / 1000);

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🔇 تم إعطاء العضو كتم صوتي (Timeout)')
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`**العضو:** ${newMember}`)
            .addFields(
                { name: '⏳ حتى', value: `<t:${until}:R>`, inline: true },
                { name: '👮 بواسطة', value: executorText, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `User ID: ${newMember.id}` });

        await sendLog(newMember.guild, embed);
    }
    // Timeout مُرفع
    else if (wasTimedOut && !isTimedOut) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🔊 رُفع كتم الصوت (Timeout Removed)')
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`**العضو:** ${newMember}`)
            .addFields(
                { name: '👮 رُفع بواسطة', value: executorText, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `User ID: ${newMember.id}` });

        await sendLog(newMember.guild, embed);
    }
}

// تعديل قناة
async function logChannelUpdate(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];

    const channelFields = [
        ['name', 'الاسم'],
        ['topic', 'الوصف'],
        ['position', 'الترتيب'],
        ['parentId', 'الفئة'],
        ['nsfw', 'محتوى +18'],
        ['rateLimitPerUser', 'Slow Mode'],
        ['bitrate', 'جودة الصوت'],
        ['userLimit', 'حد الأعضاء'],
        ['rtcRegion', 'منطقة الصوت'],
        ['defaultAutoArchiveDuration', 'مدة أرشفة المواضيع'],
        ['defaultThreadRateLimitPerUser', 'Slow Mode للمواضيع'],
    ];
    for (const [property, label] of channelFields) {
        addLogChange(changes, label, oldChannel[property], newChannel[property]);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('📝 قناة تم تعديلها')
        .setDescription(`**القناة:** ${newChannel}`)
        .addFields(
            { name: '📋 التغييرات', value: changes.join('\n').slice(0, 1000), inline: false },
            { name: '👮 بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${newChannel.id}` });

    await sendLog(newChannel.guild, embed);
}

// تعديل رول
async function logRoleUpdate(oldRole, newRole) {
    const changes = [];

    for (const [property, label] of [
        ['name', 'الاسم'],
        ['hexColor', 'اللون'],
        ['hoist', 'الظهور المنفصل'],
        ['mentionable', 'قابل للمنشن'],
        ['position', 'الترتيب'],
        ['icon', 'الأيقونة'],
        ['unicodeEmoji', 'إيموجي الرتبة'],
    ]) {
        addLogChange(changes, label, oldRole[property], newRole[property]);
    }

    const oldPermissions = new Set(oldRole.permissions.toArray());
    const newPermissions = new Set(newRole.permissions.toArray());
    const addedPermissions = [...newPermissions].filter(permission => !oldPermissions.has(permission));
    const removedPermissions = [...oldPermissions].filter(permission => !newPermissions.has(permission));
    if (addedPermissions.length) {
        changes.push(`**صلاحيات مضافة:** ${addedPermissions.join(', ')}`);
    }
    if (removedPermissions.length) {
        changes.push(`**صلاحيات محذوفة:** ${removedPermissions.join(', ')}`);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎭 رتبة تم تعديلها')
        .setDescription(`**الرتبة:** ${newRole}`)
        .addFields(
            { name: '📋 التغييرات', value: changes.join('\n').slice(0, 1000), inline: false },
            { name: '👮 بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${newRole.id}` });

    await sendLog(newRole.guild, embed);
}

// === سجلات الإيموجيات ===
async function logEmojiCreate(emoji) {
    const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('😀 إيموجي جديد تم إضافته')
        .setDescription(`**الإيموجي:** <:${emoji.name}:${emoji.id}>`)
        .addFields(
            { name: '🏷️ الاسم', value: `\`${emoji.name}\``, inline: true },
            { name: '👮 المنشئ', value: executorText, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${emoji.id}` });

    await sendLog(emoji.guild, embed);
}

async function logEmojiDelete(emoji) {
    const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ إيموجي تم حذفه')
        .addFields(
            { name: '🏷️ الاسم', value: `\`${emoji.name}\``, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${emoji.id}` });

    await sendLog(emoji.guild, embed);
}

// === سجلات الدعوات ===
async function logInviteCreate(invite) {
    const executor = await getExecutor(invite.guild, AuditLogEvent.InviteCreate);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : (invite.inviter ? `${invite.inviter} (\`${invite.inviter.id}\`)` : 'غير معروف');

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🔗 رابط دعوة جديد')
        .setDescription(`**الرابط:** ${invite.url}`)
        .addFields(
            { name: '📣 القناة', value: `${invite.channel}`, inline: true },
            { name: '👮 المنشئ', value: executorText, inline: true },
            { name: '⏳ الاستخدامات المسموحة', value: invite.maxUses === 0 ? 'غير محدود' : `${invite.maxUses}`, inline: true },
            { name: '⏱️ ينتهي بعد', value: invite.maxAge === 0 ? 'أبداً' : `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Invite Code: ${invite.code}` });

    await sendLog(invite.guild, embed);
}

async function logInviteDelete(invite) {
    const executor = await getExecutor(invite.guild, AuditLogEvent.InviteDelete);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ رابط دعوة تم حذفه')
        .setDescription(`**الرمز:** \`${invite.code}\``)
        .addFields(
            { name: '📣 القناة', value: `${invite.channel}`, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Invite Code: ${invite.code}` });

    await sendLog(invite.guild, embed);
}

// === سجلات إعدادات السيرفر ===
async function logGuildUpdate(oldGuild, newGuild) {
    const changes = [];

    addLogChange(changes, 'الاسم', oldGuild.name, newGuild.name);
    if (oldGuild.icon !== newGuild.icon) {
        changes.push(`**الأيقونة:** تم تغيير الصورة`);
    }
    if (oldGuild.banner !== newGuild.banner) {
        changes.push(`**البانر:** تم تغيير البانر`);
    }
    if (oldGuild.splash !== newGuild.splash) {
        changes.push('**صورة الدعوة:** تم تغيير الصورة');
    }
    for (const [property, label] of [
        ['description', 'الوصف'],
        ['verificationLevel', 'مستوى التحقق'],
        ['explicitContentFilter', 'فلتر المحتوى'],
        ['defaultMessageNotifications', 'إشعارات الرسائل'],
        ['preferredLocale', 'اللغة'],
        ['vanityURLCode', 'رابط الدعوة المخصص'],
        ['afkChannelId', 'قناة AFK'],
        ['afkTimeout', 'مهلة AFK'],
        ['systemChannelId', 'قناة النظام'],
        ['rulesChannelId', 'قناة القوانين'],
        ['publicUpdatesChannelId', 'قناة تحديثات المجتمع'],
        ['safetyAlertsChannelId', 'قناة تنبيهات السلامة'],
        ['widgetEnabled', 'عرض الودجت'],
        ['widgetChannelId', 'قناة الودجت'],
        ['premiumProgressBarEnabled', 'شريط التعزيز'],
        ['premiumTier', 'مستوى التعزيز'],
        ['premiumSubscriptionCount', 'عدد التعزيزات'],
        ['nsfwLevel', 'مستوى المحتوى'],
        ['features', 'ميزات السيرفر'],
    ]) {
        addLogChange(changes, label, oldGuild[property], newGuild[property]);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('⚙️ إعدادات السيرفر تم تعديلها')
        .addFields(
            { name: '📋 التغييرات', value: changes.join('\n').slice(0, 1000), inline: false },
            { name: '👮 بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(newGuild.iconURL())
        .setTimestamp()
        .setFooter({ text: `Guild ID: ${newGuild.id}` });

    await sendLog(newGuild, embed);
}

module.exports = {
    sendLog, setBotId, logAuditEntry, logAutoModerationExecution,
    logMessageDelete,
    logMessageUpdate,
    logMemberJoin,
    logMemberLeave,
    logMemberUpdate,
    logChannelCreate,
    logChannelDelete,
    logRoleCreate,
    logRoleDelete,
    logBan,
    logUnban,
    logVoiceState,
    logKick,
    logTimeout,
    logChannelUpdate,
    logRoleUpdate,
    logEmojiCreate,
    logEmojiDelete,
    logInviteCreate,
    logInviteDelete,
    logGuildUpdate
};

