'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

// طلبات التأكيد المعلقة
// المفتاح: msgId  ActionData
const pendingActions = new Map();

// تنظيف تلقائي كل 10 دقائق
const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [msgId, data] of pendingActions) {
        if (now - data.createdAt > 35_000) pendingActions.delete(msgId);
    }
}, 10 * 60 * 1000);
_cleanup.unref?.();

// بناء embed التأكيد
async function requestConfirmation(message, action) {
    const { type, target, reason, author } = action;

    const META = {
        ban:  { icon: '🔨', color: '#ED4245', label: 'حظر نهائي' },
        kick: { icon: '👢', color: '#E67E22', label: 'طرد'       },
        mute: { icon: '🔇', color: '#FEE75C', label: 'كتم'       },
        warn: { icon: '⚠️',  color: '#FFA500', label: 'تحذير'    },
        jail: { icon: '🔒', color: '#95A5A6', label: 'سجن'       },
    };
    const m = META[type] || META.ban;

    const embed = new EmbedBuilder()
        .setColor(m.color)
        .setTitle(`${m.icon} تأكيد — ${m.label}`)
        .setDescription(
            [
                `> **العضو:** ${target}`,
                `> **السبب:** ${reason || 'ما محدد سبب'}`,
                `> **المسؤول:** ${author}`,
                '',
                `> ⚠️ تريد تنفّذ هالإجراء؟`,
            ].join('\n')
        )
        .setThumbnail(target.displayAvatarURL?.() || null)
        .setFooter({ text: '⏰ التأكيد ينتهي بعد 30 ثانية' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mod_confirm_${type}_${target.id}_${author.id}`)
            .setLabel(`✅ ${m.label}`)
            .setStyle(type === 'warn' ? ButtonStyle.Primary : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`mod_cancel_${type}_${target.id}_${author.id}`)
            .setLabel('❌ إلغاء')
            .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });
    pendingActions.set(msg.id, { ...action, createdAt: Date.now(), authorId: author.id });

    // إلغاء تلقائي بعد 30 ثانية
    setTimeout(() => {
        if (!pendingActions.has(msg.id)) return;
        pendingActions.delete(msg.id);
        embed.setColor('#95A5A6').setDescription('> ⏰ **خلص وقت التأكيد، فانلغى الإجراء.**');
        msg.edit({ embeds: [embed], components: [] }).catch(() => {});
    }, 30_000);
}

// بناء embed النتيجة
function buildResultEmbed(type, target, reason, author, extra = '') {
    const META = {
        ban:    { icon: '🔨', color: '#ED4245', label: 'حظر نهائي'   },
        kick:   { icon: '👢', color: '#E67E22', label: 'طرد'          },
        mute:   { icon: '🔇', color: '#FEE75C', label: 'كتم مؤقت'    },
        warn:   { icon: '⚠️',  color: '#FFA500', label: 'تحذير'       },
        jail:   { icon: '🔒', color: '#95A5A6', label: 'سجن'          },
        unjail: { icon: '🔓', color: '#57F287', label: 'إطلاق سراح'  },
        unmute: { icon: '🔊', color: '#57F287', label: 'رفع الكتم'   },
    };
    const m = META[type] || META.ban;

    return new EmbedBuilder()
        .setColor(m.color)
        .setTitle(`${m.icon} اتنفّذ ${m.label}`)
        .addFields(
            { name: '👤 العضو',    value: `${target}`,             inline: true },
            { name: '📝 السبب',    value: reason || 'ماكو سبب',   inline: true },
            { name: '👮 المسؤول',  value: `${author}`,             inline: true }
        )
        .setFooter({ text: extra || 'اتنفّذ الإجراء.' })
        .setTimestamp();
}

// BAN
module.exports.ban = {
    name: 'ban',
    aliases: ['باند', 'حظر', 'طرد_نهائي'],
    description: 'يحظر عضو من السيرفر بعد التأكيد',
    usage: 'ban @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.BanMembers)) {
            return message.reply({ content: '❌ ما عندك صلاحية تحظر أعضاء.', flags: MessageFlags.Ephemeral });
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو اللي تريد تحظره.\nمثال: `ban @شخص السبب`');
        if (!target.bannable) return message.reply('❌ ما أگدر أحظر هالعضو؛ يمكن رتبته أعلى من رتبتي.');
        if (target.id === message.author.id) return message.reply('❌ ما تگدر تحظر نفسك.');

        const reason = args.slice(1).join(' ') || 'ماكو سبب';
        await requestConfirmation(message, {
            type: 'ban', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// KICK
module.exports.kick = {
    name: 'kick',
    aliases: ['طرد', 'كيك'],
    description: 'يطرد عضو من السيرفر بعد التأكيد',
    usage: 'kick @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ ما عندك صلاحية تطرد أعضاء.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو اللي تريد تطرده.');
        if (!target.kickable) return message.reply('❌ ما أگدر أطرد هالعضو.');
        if (target.id === message.author.id) return message.reply('❌ ما تگدر تطرد نفسك.');

        const reason = args.slice(1).join(' ') || 'ماكو سبب';
        await requestConfirmation(message, {
            type: 'kick', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// WARN
module.exports.warn = {
    name: 'warn',
    aliases: ['تحذير', 'انذار'],
    description: 'ينبّه عضو بعد التأكيد',
    usage: 'warn @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ما عندك صلاحية توجّه تحذير.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو اللي تريد تحذّره.');
        if (target.id === message.author.id) return message.reply('❌ ما تگدر تحذّر نفسك.');

        const reason = args.slice(1).join(' ') || 'ماكو سبب';
        await requestConfirmation(message, {
            type: 'warn', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// MUTE
module.exports.mute = {
    name: 'mute',
    aliases: ['كتم', 'صمت'],
    description: 'يكتم عضو مؤقتاً بعد التأكيد',
    usage: 'mute @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ما عندك صلاحية تكتم أعضاء.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو اللي تريد تكتمه.');
        if (!target.moderatable) return message.reply('❌ ما أگدر أكتم هالعضو.');
        if (target.id === message.author.id) return message.reply('❌ ما تگدر تكتم نفسك.');

        const reason = args.slice(1).join(' ') || 'ماكو سبب';
        await requestConfirmation(message, {
            type: 'mute', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
            duration: 10 * 60 * 1000, // 10 دقائق افتراضياً
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// معالج الأزرار الموحّد
async function handleModButton(interaction) {
    const id = interaction.customId;

    if (id.startsWith('clear_warns_')) {
        const [, , targetId, authorId] = id.split('_');
        if (interaction.user.id !== authorId) {
            return interaction.reply({ content: '❌ بس اللي طلب الأمر يگدر يمسح التحذيرات.', flags: MessageFlags.Ephemeral });
        }
        if (!hasPermOrOwner(interaction.member, PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ ما عندك صلاحية.', flags: MessageFlags.Ephemeral });
        }
        db.updateFields(targetId, { warnings: 0, warnLogs: [] });
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🗑️ انمسح السجل')
                    .setDescription('> انشالت كل التحذيرات.')
                    .setTimestamp()
            ],
            components: []
        });
    }

    if (!id.startsWith('mod_confirm_') && !id.startsWith('mod_cancel_')) return;

    // استخراج authorId من الـ customId (المنسق: mod_confirm_type_targetId_authorId)
    const parts = id.split('_');
    // parts = ['mod','confirm'/'cancel', type, targetId, authorId]
    const authorId = parts[4];

    // تحقق: فقط صاحب الأمر الأصلي يستطيع تأكيده
    if (authorId && interaction.user.id !== authorId) {
        return interaction.reply({
            content: '❌ بس الشخص اللي طلب هالأمر يگدر يأكده أو يلغيه.',
            flags: MessageFlags.Ephemeral,
        });
    }

    // فحص صلاحيات عامة
    if (!hasPermOrOwner(interaction.member, PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ما عندك صلاحية.', flags: MessageFlags.Ephemeral });
    }

    const msgId = interaction.message.id;
    const actionData = pendingActions.get(msgId);

    if (!actionData) {
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setDescription('> ⏰ خلص وقت هالإجراء. تگدر تطلبه من جديد.'),
            ],
            components: [],
        });
    }

    // إلغاء
    if (id.startsWith('mod_cancel_')) {
        pendingActions.delete(msgId);
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('❌ انلغى الإجراء')
                    .setDescription(`> ألغاه ${interaction.user}`)
                    .setTimestamp(),
            ],
            components: [],
        });
    }

    // تنفيذ
    pendingActions.delete(msgId);
    const { type, member, target, reason, author, guild, duration } = actionData;

    try {
        let resultExtra = '';

        if (type === 'ban') {
            await member.ban({ reason: `بواسطة ${author.username}: ${reason}` });
            resultExtra = '🔨 انحظر العضو.';

        } else if (type === 'kick') {
            await member.kick(`بواسطة ${author.username}: ${reason}`);
            resultExtra = '👢 انطرد العضو.';

        } else if (type === 'warn') {
            const userData = db.getUserData(target.id);
            const warnings = (userData.warnings || 0) + 1;
            
            const warnLogs = userData.warnLogs || [];
            warnLogs.push({
                reason: reason,
                author: author.id,
                date: Date.now()
            });
            
            db.updateFields(target.id, { warnings, warnLogs });
            resultExtra = `⚠️ هالتحذير رقم ${warnings} للعضو.`;
            
            let escalationMsg = '';
            if (warnings === 2) {
                await member.timeout(60 * 60 * 1000, `تلقائي: التحذير الثاني - ${reason}`).catch(()=>{});
                escalationMsg = `\n🔇 **الإجراء:** كتم لمدة ساعة (التحذير الثاني)`;
                resultExtra += escalationMsg;
            } else if (warnings === 3) {
                await member.timeout(24 * 60 * 60 * 1000, `تلقائي: التحذير الثالث - ${reason}`).catch(()=>{});
                escalationMsg = `\n🔇 **الإجراء:** كتم لمدة 24 ساعة (التحذير الثالث)`;
                resultExtra += escalationMsg;
            } else if (warnings >= 4) {
                await member.kick(`تلقائي: التحذير ${warnings} - ${reason}`).catch(()=>{});
                escalationMsg = `\n👢 **الإجراء:** طرد من السيرفر (التحذير الرابع أو أكثر)`;
                resultExtra += escalationMsg;
            }

            // إرسال DM
            target.send?.(
                `⚠️ **إشعار تحذير** بالسيرفر\nالسبب: ${reason}\nمجموع تحذيراتك: **${warnings}**${escalationMsg}`
            ).catch(() => {});

        } else if (type === 'mute') {
            const muteDuration = duration || 10 * 60 * 1000;
            await member.timeout(muteDuration, `بواسطة ${author.username}: ${reason}`);
            const mins = Math.round(muteDuration / 60_000);
            resultExtra = `🔇 انكتم لمدة ${mins} دقيقة.`;
        }

        const resultEmbed = buildResultEmbed(type, target, reason, author, resultExtra);

        // زر رفع الكتم للكتم فقط
        const components = [];
        if (type === 'mute') {
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_confirm_unmute_${target.id}_${author.id}`)
                        .setLabel('🔊 رفع الكتم')
                        .setStyle(ButtonStyle.Success)
                )
            );
        }

        return interaction.update({ embeds: [resultEmbed], components });

    } catch (err) {
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ ما كدرنا ننفّذ الإجراء')
                    .setDescription(`> ${err.message}`)
                    .setTimestamp(),
            ],
            components: [],
        });
    }
}

// تصدير المعالج
module.exports.handleModButton = handleModButton;

module.exports.name = 'mod-buttons';
module.exports.execute = async () => {};
