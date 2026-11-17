'use strict';
const appLogger = require('./app-logger');

/**
 * ════════════════════════════════════════════════════════
 *  color-system.js — نظام ألوان البروفايل الاحترافي
 *  ─ يُرسل Embed جميل مع Select Menu للألوان
 *  ─ يمنع التكرار عند Restart
 *  ─ يحذف الرسائل القديمة عند تغيير الروم
 * ════════════════════════════════════════════════════════
 */

const {
    EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ChannelType, PermissionsBitField,
} = require('discord.js');
const config = require('../config');
const db = require('./database');

// خريطة الألوان مع مجموعات
const COLOR_GROUPS = [
    {
        label: '🔥 ألوان النار',
        emoji: '🔥',
        colors: ['red', 'orange'],
    },
    {
        label: '🌊 ألوان الماء والسماء',
        emoji: '🌊',
        colors: ['blue', 'cyan'],
    },
    {
        label: '🌿 ألوان الطبيعة',
        emoji: '🌿',
        colors: ['green'],
    },
    {
        label: '💫 ألوان الفخامة',
        emoji: '💫',
        colors: ['gold', 'purple', 'pink'],
    },
    {
        label: '🌑 ألوان الغموض',
        emoji: '🌑',
        colors: ['black', 'white'],
    },
];

// Build Main Color Embed
function buildColorEmbed() {
    const availColors = config.availableColors || {};
    const colorList = Object.entries(availColors)
        .map(([id, c]) => `${c.emoji} **${c.name}** — \`${c.hex}\``)
        .join('\n');

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎨 نظام ألوان البروفايل')
        .setDescription([
            '> اختار اللون اللي يعجبك لبروفايلك بالسيرفر.',
            '',
            '**الألوان الموجودة:**',
            colorList,
            '',
            '> اختار لون من القائمة الجوه ويتبدل بروفايلك.',
        ].join('\n'))
        .addFields(
            { name: '📌 شلون تشوفه', value: 'اكتب `!profile` حتى تشوف بروفايلك باللون الجديد.', inline: true },
            { name: '✅ مجاني', value: 'تغيير اللون ببلاش.', inline: true },
        )
        .setFooter({ text: 'اختار لونك من القائمة.' })
        .setTimestamp();
}

// Build Color Select Menu
function buildColorSelectMenu() {
    const availColors = config.availableColors || {};
    const options = Object.entries(availColors).map(([id, c]) => ({
        label: c.name,
        value: id,
        description: `لون ${c.name} — ${c.hex}`,
        emoji: c.emoji,
    }));

    // Discord limit: 25 options per menu max
    const chunks = [];
    for (let i = 0; i < options.length; i += 25) {
        chunks.push(options.slice(i, i + 25));
    }

    const rows = chunks.map((chunk, idx) => {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`color_select_${idx}`)
            .setPlaceholder(idx === 0 ? '🎨 اختار لون...' : '🎨 ألوان أكثر...')
            .addOptions(chunk);
        return new ActionRowBuilder().addComponents(menu);
    });

    // أضف زر إزالة اللون
    return rows;
}

// Setup Color Channel
/**
 * يُجهّز قناة الألوان:
 * 1. يمسح رسائل البوت القديمة إذا أمكن
 * 2. يرسل Embed + Select Menu جديد
 * 3. يحفظ message_id في DB لمنع التكرار
 * @param {Guild} guild
 * @param {TextChannel} channel
 * @param {string|null} oldChannelId القناة القديمة (لمسحها)
 */
async function setupColorChannel(guild, channel, oldChannelId = null) {
    try {
        const guildData = db.getGuildData(guild.id);

        // 1. تنظيف القناة القديمة
        if (oldChannelId && oldChannelId !== channel.id) {
            const oldChannel = guild.channels.cache.get(oldChannelId);
            if (oldChannel && oldChannel.type === ChannelType.GuildText) {
                const oldMsgId = guildData.colorMessageId;
                if (oldMsgId) {
                    try {
                        const oldMsg = await oldChannel.messages.fetch(oldMsgId);
                        if (oldMsg) await oldMsg.delete();
                    } catch {}
                }
            }
        }

        // 2. تنظيف القناة الجديدة (رسائل البوت القديمة)
        const botMember = guild.members.me;
        if (botMember?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            try {
                const messages = await channel.messages.fetch({ limit: 50 });
                const botMessages = messages.filter(m => m.author.id === guild.client.user.id);
                if (botMessages.size > 0) {
                    await channel.bulkDelete(botMessages).catch(() => {
                        // إذا فشل bulkDelete (رسائل قديمة >14 يوم)، احذفهم فرداً
                        for (const msg of botMessages.values()) {
                            msg.delete().catch(() => {});
                        }
                    });
                }
            } catch {}
        }

        // 3. إرسال النظام الجديد
        const embed = buildColorEmbed();
        const rows = buildColorSelectMenu();

        const sent = await channel.send({
            embeds: [embed],
            components: rows,
        });

        // 4. حفظ Message ID
        db.updateGuildData(guild.id, {
            colorChannelId: channel.id,
            colorMessageId: sent.id,
        });

        appLogger.info(`[ColorSystem] Color channel setup in ${guild.name}  #${channel.name}`);
        return sent;
    } catch (err) {
        appLogger.error(`[ColorSystem] Error in ${guild.name}:`, err.message);
        throw err;
    }
}

// Check & Restore (بعد Restart — لا نُعيد الإرسال إذا الرسالة موجودة)
/**
 * يتحقق عند Restart هل نظام الألوان موجود أم لا
 * إذا الرسالة موجودة: لا يُعيد الإرسال
 * إذا محذوفة: يُعيد الإرسال فقط
 */
async function checkAndRestoreColorChannel(guild) {
    try {
        const guildData = db.getGuildData(guild.id);
        const { colorChannelId, colorMessageId } = guildData;
        if (!colorChannelId) return; // لا يوجد color channel محدد

        const channel = guild.channels.cache.get(colorChannelId);
        if (!channel) {
            // القناة محذوفة
            db.updateGuildData(guild.id, { colorChannelId: null, colorMessageId: null });
            return;
        }

        // تحقق هل الرسالة موجودة
        if (colorMessageId) {
            try {
                const msg = await channel.messages.fetch(colorMessageId);
                if (msg) {
                    appLogger.info(`[ColorSystem] Color message exists in ${guild.name} — no re-send`);
                    return; // الرسالة موجودة — لا نُعيد الإرسال
                }
            } catch {
                // الرسالة محذوفة — نُعيد الإرسال
            }
        }

        // أعد الإرسال فقط إذا كانت الرسالة محذوفة
        await setupColorChannel(guild, channel, null);
    } catch (err) {
        appLogger.error(`[ColorSystem] Restore error in ${guild.name}:`, err.message);
    }
}

// Handle Color Selection
/**
 * يُعالج اختيار المستخدم للون من Select Menu
 * @param {StringSelectMenuInteraction} interaction
 */
async function handleColorSelect(interaction) {
    const colorId = interaction.values[0];
    const availColors = config.availableColors || {};
    const colorData = availColors[colorId];

    if (!colorData) {
        return interaction.reply({ content: '❌ اللون غير موجود', ephemeral: true });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        // حفظ اللون في قاعدة البيانات (للبروفايل)
        const db2 = require('./database');
        db2.updateUserData(interaction.user.id, { color: colorData.hex });

        // إسناد رتبة في الديسكورد ليتغير اللون في الشات
        let assignedRole = false;
        try {
            const roleName = `🎨 ${colorData.name}`;
            
            // البحث عن الرتبة بالاسم (مع الإيموجي أو بدونه)
            let role = interaction.guild.roles.cache.find(r => 
                r.name === roleName || r.name === colorData.name
            );

            if (!role) {
                // إنشاء الرتبة إذا لم تكن موجودة
                role = await interaction.guild.roles.create({
                    name: roleName,
                    color: colorData.hex,
                    permissions: [],
                    mentionable: false,
                    reason: 'نظام الألوان: إنشاء رتبة لون تلقائياً'
                });
            }

            // إزالة جميع ألوان الأعضاء السابقة (الرتب التي تبدأ بـ  أو تطابق الألوان المتاحة)
            const colorRoleNames = Object.values(availColors).map(c => c.name);
            const rolesToRemove = interaction.member.roles.cache.filter(r => 
                r.name.startsWith('🎨') || colorRoleNames.includes(r.name)
            );

            if (rolesToRemove.size > 0) {
                await interaction.member.roles.remove(rolesToRemove);
            }

            // إضافة اللون الجديد
            await interaction.member.roles.add(role);
            assignedRole = true;
        } catch (roleErr) {
            appLogger.error('[ColorSystem] Failed to assign role:', roleErr.message);
            // سنستمر حتى نعلم المستخدم، لكن مع رسالة تحذيرية بخصوص الرتب
        }

        const { EmbedBuilder: EB } = require('discord.js');
        await interaction.editReply({
            embeds: [
                new EB()
                    .setColor(colorData.hex)
                    .setTitle(`${colorData.emoji} تبدل لونك!`)
                    .setDescription([
                        `> **لون بروفايلك الآن:** ${colorData.name} (${colorData.hex})`,
                        assignedRole 
                            ? `> ✅ **لون الشات:** تم إعطاؤك رتبة اللون لتغيير لون اسمك في الشات.`
                            : `> ⚠️ **تنبيه الشات:** لم أتمكن من إعطائك رتبة اللون. تأكد أن رتبة البوت أعلى من رتب الألوان ولديه صلاحية "إدارة الرتب".`,
                        '',
                        `> اكتب \`!profile\` لترى بطاقتك بلونك الجديد 🎨`,
                    ].join('\n'))
                    .setTimestamp()
            ],
        });
    } catch (err) {
        appLogger.error('[ColorSystem] handleColorSelect error:', err.message);
        if (!interaction.replied && !interaction.deferred) {
            interaction.reply({ content: 'صار خلل وإني أبدل لونك.', ephemeral: true }).catch(() => {});
        } else {
            interaction.editReply({ content: 'صار خلل وإني أبدل لونك.' }).catch(() => {});
        }
    }
}

module.exports = {
    setupColorChannel,
    checkAndRestoreColorChannel,
    handleColorSelect,
    buildColorEmbed,
    buildColorSelectMenu,
};
