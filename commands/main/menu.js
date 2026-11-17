'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, MessageFlags
} = require('discord.js');
const config = require('../../config');
const db = require('../../utils/database');

// الألوان الاحترافية
const COLORS = {
    PRIMARY: '#5865F2',    // بنفسجي ديسكورد
    GOLD: '#FFD700',       // ذهبي
    ACCENT: '#00D4FF',     // أزرق نيون
};

module.exports = {
    name: 'menu',
    aliases: ['القائمة', 'اوامر', 'أوامر', 'المنيو', 'منيو', 'داشبورد', 'لوحة_التحكم', 'الداشبورد', 'start', 'ابدأ'],
    description: 'لوحة التحكم الرئيسية — كل شيء بأزرار',

    async execute(context) {
        const user = context.author || context.user;
        const msgStr = (context.content || context.commandName || '').toLowerCase().trim();

        // ميزة مالك السيرفر: واجهة تسجيل الدخول
        // إذا كان الأمر داشبورد والمستخدم هو مالك السيرفر (وليس مالك البوت، لأن مالك البوت تتم معالجته في owner.js)
        if (context.guild && user.id === context.guild.ownerId) {
            if (msgStr === 'داشبورد' || msgStr === 'dashboard' || msgStr === '!داشبورد' || msgStr === '!dashboard') {
                const PORT = process.env.PORT || 3000;
                const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
                const loginUrl = `${BASE_URL}/auth/discord`;

                const embed = new EmbedBuilder()
                    .setColor('#00D4FF')
                    .setTitle('🎛️ لوحة تحكم السيرفر (Server Dashboard)')
                    .setDescription([
                        'هلا بيك يا **مالك السيرفر**.',
                        'تگدر تدير إعدادات سيرفرك من لوحة التحكم.',
                        '',
                        '**اضغط الزر الجوه وسجّل دخولك بحسابك بالديسكورد:**'
                    ].join('\n'))
                    .setThumbnail(context.guild.iconURL({ dynamic: true }) || null)
                    .setFooter({ text: 'تسجيل الدخول محمي عبر Discord OAuth2.' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('دخول لوحة التحكم')
                        .setStyle(ButtonStyle.Link)
                        .setURL(loginUrl)
                );
                
                // نرسلها له في الخاص
                const replyObj = { embeds: [embed], components: [row] };
                try {
                    await user.send(replyObj);
                    if (context.reply) {
                        return context.reply({ content: 'دزّيتلك رابط لوحة التحكم بالخاص.', flags: MessageFlags.Ephemeral });
                    }
                } catch (e) {
                    if (context.reply) {
                        return context.reply({ content: 'خاصك مغلق؛ افتحه حتى أوصلك الرابط.', flags: MessageFlags.Ephemeral });
                    } else {
                        return context.channel.send('خاصك مغلق يا مالك السيرفر؛ افتحه حتى أوصلك رابط لوحة التحكم.');
                    }
                }
            }
        }

        const panel = await buildMainMenu(user, context.client);
        return context.reply({ ...panel });
    },

    async handleMenuInteraction(interaction) {
        const id = interaction.customId;

        if (id === 'menu_economy') {
            try {
                const ecoHub = require('../economy/economy-hub');
                const panel = await ecoHub.buildMainPanel(interaction.user.id, interaction.client);
                return interaction.update({ ...panel });
            } catch (e) {
                return interaction.reply({ content: 'ما گدرت أفتح لوحة الاقتصاد، جرّب بعد شوي.', flags: MessageFlags.Ephemeral });
            }
        }

        if (id === 'menu_games') {
            try {
                const gamesHub = require('../games/games-hub');
                const panel = gamesHub.buildGamesPanel();
                return interaction.update({ ...panel });
            } catch (e) {
                return interaction.reply({ content: 'ما گدرت أفتح لوحة الألعاب، جرّب بعد شوي.', flags: MessageFlags.Ephemeral });
            }
        }

        if (id === 'menu_profile') {
            try {
                // الملف الشخصي يعمل مع message فقط — نخبر المستخدم باستخدام الأمر
                return interaction.reply({
                    content: '> اكتب `بروفايل` أو `بروفايل @شخص` حتى تشوف ملفك.',
                    flags: MessageFlags.Ephemeral
                });
            } catch (e) {
                return interaction.reply({ content: 'ما گدرت أفتح الملف الشخصي، جرّب بعد شوي.', flags: MessageFlags.Ephemeral });
            }
        }

        if (id === 'menu_admin') {
            if (!interaction.member?.permissions.has('ModerateMembers')) {
                return interaction.reply({ content: 'هالقسم للمشرفين بس.', flags: MessageFlags.Ephemeral });
            }
            try {
                const adminPanelModule = require('../moderation/panel');
                // نبني اللوحة مباشرة بدلاً من execute() لأنها مبنية للرسائل
                const panel = adminPanelModule.buildAdminPanel(interaction.guild);
                return interaction.update({ ...panel });
            } catch (e) {
                return interaction.reply({ content: 'ما گدرت أفتح لوحة الإدارة، جرّب بعد شوي.', flags: MessageFlags.Ephemeral });
            }
        }

        if (id === 'menu_social') {
            const socialEmbed = new EmbedBuilder()
                .setColor('#E91E63')
                .setTitle('❤️ الأنظمة الاجتماعية')
                .setDescription([
                    '> هذي أوامر التواصل ويا باقي الأعضاء:',
                    '',
                    '💍 `زوج @شخص` — طلب زواج',
                    '💔 `طلاق` — طلب طلاق',
                    '🏰 `كلانات` — نظام الكلانات',
                    '👥 `اصدقاء` — قائمة أصدقائك',
                    '🎂 `عيدميلادي` — تعيين عيد ميلادك',
                    '',
                    '> 💡 اكتب الأمر مباشرة في أي قناة',
                ].join('\n'))
                .setTimestamp();
            return interaction.reply({ embeds: [socialEmbed], flags: MessageFlags.Ephemeral });
        }

        if (id === 'menu_help') {
            try {
                const helpModule = require('../main/help');
                // يبني embed المساعدة ويرسله
                if (helpModule.buildHelpEmbed) {
                    const helpData = helpModule.buildHelpEmbed();
                    return interaction.reply({ ...helpData, flags: MessageFlags.Ephemeral });
                }
                return interaction.reply({
                    content: '> ❓ اكتب `مساعدة` لعرض قائمة الأوامر الكاملة!',
                    flags: MessageFlags.Ephemeral
                });
            } catch (e) {
                return interaction.reply({
                    content: '> ❓ اكتب `مساعدة` لعرض قائمة الأوامر الكاملة!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (id === 'menu_refresh') {
            const user = interaction.user;
            const panel = await buildMainMenu(user, interaction.client);
            return interaction.update({ ...panel });
        }
    }
};

// بناء لوحة القائمة الرئيسية الفاخرة
async function buildMainMenu(user, client) {
    const userData = db.getUserData(user.id);
    const balance = (userData?.balance || 0).toLocaleString('ar-IQ');
    const bank = (userData?.bank || 0).toLocaleString('ar-IQ');
    const level = userData?.level || 1;
    const xp = userData?.xp || 0;
    const streak = userData?.dailyStreak || 0;
    const guildCount = client?.guilds?.cache?.size || 0;

    // شريط XP
    const xpForNext = level * 100;
    const xpPct = Math.min(Math.round((xp % xpForNext) / xpForNext * 10), 10);
    const xpBar = '█'.repeat(xpPct) + '░'.repeat(10 - xpPct);

    // رمز المستوى
    const levelEmoji = level >= 50 ? '💎' : level >= 30 ? '🏆' : level >= 15 ? '⭐' : level >= 5 ? '🔥' : '🌱';

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('القائمة الرئيسية')
        .setDescription([
            `هلا ${user.username}.`,
            'اختار القسم من الأزرار الجوه.',
        ].join('\n'))
        .addFields(
            {
                name: '💼 محفظتك',
                value: [
                    `💰 المحفظة: **${balance}** ${config.currency}`,
                    `🏦 البنك: **${bank}** ${config.currency}`,
                ].join('\n'),
                inline: true
            },
            {
                name: `${levelEmoji} مستواك`,
                value: [
                    `⭐ المستوى: **${level}**`,
                    `🔥 التتابع: **${streak}** يوم`,
                    `\`${xpBar}\` ${xpPct * 10}%`,
                ].join('\n'),
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: false
            },
            {
                name: '🎮 الأقسام المتاحة',
                value: [
                    '💰 **الاقتصاد** — رصيد، بنك، متجر، شركة، بورصة',
                    '🎮 **الألعاب** — تريفيا، اكس او، حجر ورقة مقص، مشنقة',
                    '❤️ **الاجتماعي** — زواج، كلان، أصدقاء',
                    '🛡️ **الإدارة** — لوحة المشرفين الكاملة',
                ].join('\n'),
                inline: false
            }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({
            text: `${guildCount} سيرفر • البريفكس: ${config.prefix} • اختار قسم.`,
            iconURL: client?.user?.displayAvatarURL()
        })
        .setTimestamp();

    // صف 1: الأقسام الرئيسية
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('menu_economy')
            .setLabel('💰 الاقتصاد')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('menu_games')
            .setLabel('🎮 الألعاب')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('menu_social')
            .setLabel('❤️ اجتماعيات')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('menu_admin')
            .setLabel('🛡️ الإدارة')
            .setStyle(ButtonStyle.Danger)
    );

    // صف 2: روابط سريعة
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('menu_profile')
            .setLabel('👤 ملفي')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('menu_help')
            .setLabel('❓ مساعدة')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('eco_leaderboard')
            .setLabel('🏆 المتصدرون')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('menu_refresh')
            .setLabel('🔄 تحديث')
            .setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2] };
}
