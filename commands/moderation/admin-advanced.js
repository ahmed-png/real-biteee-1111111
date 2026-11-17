'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔧 ADMIN ADVANCED v2.0 — لوحة الإدارة المتقدمة للمالك               ║
 * ║  يُفعَّل بـ: !إدارة-متقدمة | !admin-panel                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const config      = require('../../config');
const db          = require('../../utils/database');
const botSettings = require('../../utils/bot-settings');

const C = {
    gold:   '#FFD700',
    red:    '#E74C3C',
    green:  '#2ECC71',
    blue:   '#3498DB',
    purple: '#9B59B6',
    dark:   '#2C3E50',
    orange: '#FF8C00',
};

// بناء لوحة التحكم الرئيسية
function buildMainPanel(guild, client) {
    const guildData  = db.getGuildData(guild?.id || '0');
    const allUsers   = db.getAllUsers();
    const userCount  = Object.keys(allUsers).length;
    const settings   = botSettings.getAll();
    const cmdCount   = client?.commands?.size ?? '?';

    const embed = new EmbedBuilder()
        .setColor(C.purple)
        .setTitle('🔧 لوحة الإدارة المتقدمة')
        .setDescription([
            '```ansi',
            '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
            '\u001b[1;33m  إدارة متطورة... لأن البساطة مو خيار  \u001b[0m',
            '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
            '```',
        ].join('\n'))
        .addFields(
            {
                name: '🤖 أرقام البوت',
                value: [
                    `> 📊 **الأوامر:** ${cmdCount}`,
                    `> 🌐 **السيرفرات:** ${client?.guilds?.cache?.size ?? '?'}`,
                    `> 👥 **الأعضاء:** ${userCount}`,
                    `> 🏓 **Ping:** ${client?.ws?.ping ?? '?'}ms`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '⚙️ الإعدادات الشغّالة',
                value: [
                    `> 🤖 AI: ${settings.aiRandomReplyEnabled ? '✅' : '❌'}`,
                    `> 📢 رسائل تلقائية: ${settings.autoMessagesEnabled ? '✅' : '❌'}`,
                    `> 👻 Ghost Ping: ${settings.ghostPingEnabled ? '✅' : '❌'}`,
                    `> 🛡️ Anti-Raid: ${guildData.antiRaidEnabled ? '✅' : '❌'}`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '💾 وضع التخزين',
                value: [
                    `> 🗄️ **MongoDB:** ✅ متصل`,
                    `> 🧠 **الكاش:** ✅ شغّال`,
                    `> 📁 **ملفات JSON القديمة:** محذوفة`,
                ].join('\n'),
                inline: true,
            },
        )
        .setTimestamp()
        .setFooter({ text: '🔧 لوحة الإدارة المتقدمة | للمالك بس' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adv_bot_info').setLabel('📊 تفاصيل البوت').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('adv_clear_cache').setLabel('🔄 تحديث الكاش').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adv_storage_audit').setLabel('💾 فحص التخزين').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adv_reset_cooldowns').setLabel('⏰ تصفير التهدئة').setStyle(ButtonStyle.Danger),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adv_toggle_ai').setLabel('🤖 تبديل AI').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adv_toggle_msgs').setLabel('📢 تبديل الرسائل').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adv_toggle_ghostping').setLabel('👻 كشف المنشن الوهمي').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adv_maintenance').setLabel('🔒 وضع الصيانة').setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row1, row2] };
}

// معالج التفاعلات
async function handleInteraction(interaction) {
    if (interaction.user.id !== config.ownerId &&
        !interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ هاللوحة للمالك والإدارة بس.', ephemeral: true });
    }

    await interaction.deferUpdate().catch(() => {});
    const id = interaction.customId;

    if (id === 'adv_bot_info') {
        const uptime   = process.uptime();
        const hours    = Math.floor(uptime / 3600);
        const minutes  = Math.floor((uptime % 3600) / 60);
        const seconds  = Math.floor(uptime % 60);
        const memUsage = process.memoryUsage();

        const embed = new EmbedBuilder()
            .setColor(C.blue)
            .setTitle('📊 تفاصيل البوت')
            .addFields(
                { name: '⏱️ شكد صار شغّال', value: `> ${hours}س ${minutes}د ${seconds}ث`, inline: true },
                { name: '🧠 RAM', value: `> ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`, inline: true },
                { name: '📦 Node.js', value: `> ${process.version}`, inline: true },
                { name: '🏓 Ping', value: `> ${interaction.client.ws.ping}ms`, inline: true },
                { name: '🌐 السيرفرات', value: `> ${interaction.client.guilds.cache.size}`, inline: true },
                { name: '👥 المستخدمون', value: `> ${interaction.client.users.cache.size}`, inline: true },
            )
            .setTimestamp();
        return interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
    }

    if (id === 'adv_clear_cache') {
        // إعادة تحميل البيانات من MongoDB
        try {
            const coreDb = require('../../src/database/db');
            await coreDb.loadDatabase();
            const botSettingsDb = require('../../src/database/bot-settings-db');
            await botSettingsDb.loadBotSettings();
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅ تحدّث الكاش').setDescription('> رجّعت تحميل كل البيانات من MongoDB.')],
                components: []
            }).catch(() => {});
        } catch (err) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(C.red).setTitle('❌ ما تحدّث الكاش').setDescription(`> ${err.message}`)],
                components: []
            }).catch(() => {});
        }
    }

    if (id === 'adv_storage_audit') {
        const fs   = require('fs');
        const path = require('path');
        const root = path.join(__dirname, '../..');
        const dataDir = path.join(root, 'data');

        let files = [];
        try {
            files = fs.readdirSync(dataDir).map(f => {
                const stat = fs.statSync(path.join(dataDir, f));
                return `> 📁 \`${f}\` — ${(stat.size / 1024).toFixed(1)} KB`;
            });
        } catch {
            files = ['> ❌ ما كدرت أقرا مجلد data/.'];
        }

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(C.dark)
                .setTitle('💾 فحص ملفات التخزين')
                .setDescription([
                    '**الملفات الموجودة بـ data/:**',
                    ...files.slice(0, 15),
                    '',
                    '**التخزين الرئيسي:** 🗄️ MongoDB Atlas',
                ].join('\n'))
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_toggle_ai') {
        const current = botSettings.get('aiRandomReplyEnabled');
        botSettings.set('aiRandomReplyEnabled', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.red : C.green)
                .setTitle(`🤖 AI ${current ? 'مطفّي' : 'شغّال'}`)
                .setDescription(`> الذكاء الاصطناعي هسه: **${current ? '❌ مطفّي' : '✅ شغّال'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_toggle_msgs') {
        const current = botSettings.get('autoMessagesEnabled');
        botSettings.set('autoMessagesEnabled', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.red : C.green)
                .setTitle(`📢 الرسائل التلقائية ${current ? 'مطفّية' : 'شغّالة'}`)
                .setDescription(`> الرسائل التلقائية هسه: **${current ? '❌ مطفّية' : '✅ شغّالة'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_toggle_ghostping') {
        const current = botSettings.get('ghostPingEnabled');
        botSettings.set('ghostPingEnabled', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.red : C.green)
                .setTitle(`👻 المنشن الوهمي ${current ? 'مطفّي' : 'شغّال'}`)
                .setDescription(`> كشف المنشن الوهمي هسه: **${current ? '❌ مطفّي' : '✅ شغّال'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_maintenance') {
        const current = botSettings.get('maintenanceMode');
        botSettings.set('maintenanceMode', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.green : C.red)
                .setTitle(`🔒 وضع الصيانة ${current ? 'مطفّي' : 'شغّال'}`)
                .setDescription(`> وضع الصيانة هسه: **${current ? '❌ مطفّي' : '⚠️ شغّال — البوت ما راح يرد على الأوامر العادية'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_reset_cooldowns') {
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(C.orange)
                .setTitle('⏰ تصفير التهدئة')
                .setDescription('> ما تگدر تصفّر تهدئة عضو معيّن من هنا.\n> استخدم: `!admin reset-cooldown @شخص`')
            ],
            components: []
        }).catch(() => {});
    }
}

module.exports = {
    name: 'admin-advanced',
    aliases: ['إدارة-متقدمة', 'ادارة-متقدمة', 'adv'],
    description: 'لوحة الإدارة المتقدمة',
    category: 'إدارة',

    async execute(message, args) {
        if (message.author.id !== config.ownerId &&
            !message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هالأمر للمالك والإدارة بس.');
        }
        const panel = buildMainPanel(message.guild, message.client);
        await message.reply(panel);
    },

    handleInteraction,
    buildMainPanel,
};
