/**
 * ═══════════════════════════════════════════════════════════════
 * 🎮 لوحة الألعاب — Games Hub 2.0
 * ألعاب 2D احترافية مع دعم مولتي بلاير عبر روابط تفاعلية
 * STATELESS: لا يُحفظ أي بيانات — كل شيء في المتصفح فقط
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags
} = require('discord.js');

const dashServer = require('../../dashboard-server');
const { buildGameUrl } = require('../../utils/game-url');

// ─── Helper: Build game URL ─────────────────────────────────────
function gameUrl(gamePath, params = {}) {
    return buildGameUrl(dashServer.getDashboardUrl(), gamePath, params);
}

// ═══════════════════════════════════════════════════════════════
// بناء لوحة الألعاب الرئيسية
// ═══════════════════════════════════════════════════════════════
function buildGamesPanel(username = '') {
    const nameParam = username || '';

    const arenaUrl = gameUrl('battle-arena.html', { name: nameParam, mode: 'solo' });
    const spaceUrl = gameUrl('space-defender.html', { name: nameParam });
    const tankUrl = gameUrl('tank-clash.html', { name: nameParam });
    const cyberUrl = gameUrl('cyber-jump.html', { name: nameParam });
    const survivalUrl = gameUrl('survival.html', { name: nameParam });
    const duelUrl = gameUrl('duel.html', { name: nameParam });

    const embed = new EmbedBuilder()
        .setColor('#0d1fd4')
        .setTitle('🎮 مركز الألعاب 2.0')
        .setDescription([
            '> 🚀 **ألعاب تفاعلية بالمتصفح، تگدر تلعب وحدك أو أونلاين!**',
            '> اضغط الأزرار جوّه أو افتح رابط اللعبة مباشرة:',
            '',
            `⚔️ [**ساحة المعركة — قتال 4 لاعبين**](${arenaUrl})`,
            `🎯 [**المهمة الأخيرة — نجاة وتصويب (فردي)**](${survivalUrl})`,
            `🥊 [**ساحة المبارزة — واجه خصم ذكي**](${duelUrl})`,
            `🚀 [**مدافع الفضاء — حرب بالفضاء**](${spaceUrl})`,
            `🛡️ [**مواجهة الدبابات — معركة دبابات**](${tankUrl})`,
            `🌩️ [**قفزة سايبر — قفز بعالم سايبربانك**](${cyberUrl})`,
            '',
            '> 💡 *إذا الزر ما اشتغل بديسكورد، اضغط على اسم اللعبة الأزرق فوگ.*',
        ].join('\n'))
        .setTimestamp()
        .setFooter({ text: '⚡ العب وحدك أو ويا جماعة — تشتغل عالكمبيوتر والموبايل!' });

    // ── Row 1: Battle Arena ────────────────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('⚔️ ساحة المعركة — وحدك')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'solo' })),
        new ButtonBuilder()
            .setLabel('🤺 ساحة المعركة — ضد البوت')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'bot' })),
        new ButtonBuilder()
            .setLabel('🌐 ساحة المعركة — جماعي')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'multi' }))
    );

    // ── Row 2: New combat games and arcade shooters ───────────
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🎯 المهمة الأخيرة')
            .setStyle(ButtonStyle.Link)
            .setURL(survivalUrl),
        new ButtonBuilder()
            .setLabel('🥊 ساحة المبارزة')
            .setStyle(ButtonStyle.Link)
            .setURL(duelUrl),
        new ButtonBuilder()
            .setLabel('🚀 مدافع الفضاء')
            .setStyle(ButtonStyle.Link)
            .setURL(spaceUrl),
        new ButtonBuilder()
            .setLabel('🛡️ مواجهة الدبابات')
            .setStyle(ButtonStyle.Link)
            .setURL(tankUrl)
    );

    // ── Row 3: Cyber Jump ─────────────────────────────────────
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🌩️ قفزة سايبر')
            .setStyle(ButtonStyle.Link)
            .setURL(cyberUrl)
    );

    // ── Row 4: Info ────────────────────────────────────────────
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('games_info')
            .setLabel('ℹ️ شلون تلعب ويا أصحابك؟')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('games_create_room')
            .setLabel('🌐 سوّي غرفة جماعية')
            .setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row1, row2, row3, row4] };
}

// ═══════════════════════════════════════════════════════════════
// معالج الأزرار
// ═══════════════════════════════════════════════════════════════
async function handleGameButton(interaction) {
    const id = interaction.customId;
    const username = interaction.user.username || interaction.user.globalName || 'لاعب';
    const nameParam = username;

    // ── معلومات المولتي بلاير ─────────────────────────────────
    if (id === 'games_info') {
        const embed = new EmbedBuilder()
            .setColor('#00c8ff')
            .setTitle('🌐 شلون تلعب ويا أصحابك؟')
            .setDescription([
                '**الخطوات سهلة:**',
                '',
                '1️⃣ اضغط **"جماعي"** بأي لعبة',
                '2️⃣ اختار **"إنشاء غرفة"** وراح يطلعلك **كود من 6 أحرف**',
                '3️⃣ دز الكود لأصحابك بديسكورد',
                '4️⃣ يضغطون **"جماعي"** ويدخلون الكود',
                '5️⃣ ابدي اللعب — سهلة! 🎮',
                '',
                '> ⚡ **ملاحظة:** ما تنحفظ نقاط أو بيانات — اللعبة مؤقتة',
                '> 🔒 **الخصوصية:** كل جلسة منفصلة عن الثانية',
            ].join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── إنشاء غرفة مشتركة ─────────────────────────────────────
    if (id === 'games_create_room') {
        const embed = new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('🌐 سوّي غرفة جماعية')
            .setDescription([
                `هلا **${username}**!`,
                '',
                '**اختار لعبة تلعبها ويا جماعة:**',
            ].join('\n'))
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('⚔️ ساحة المعركة')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'multi' })),
            new ButtonBuilder()
                .setLabel('🛡️ مواجهة الدبابات')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('tank-clash.html', { name: nameParam, mode: 'multi' })),
            new ButtonBuilder()
                .setLabel('🌩️ قفزة سايبر')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('cyber-jump.html', { name: nameParam, mode: 'multi' }))
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 مدافع الفضاء')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('space-defender.html', { name: nameParam, mode: 'multi' })),
        );

        return interaction.reply({ embeds: [embed], components: [row1, row2], flags: MessageFlags.Ephemeral });
    }

    // ── رجوع للقائمة ─────────────────────────────────────────
    if (id === 'games_back') {
        const panel = buildGamesPanel(username);
        return interaction.update({ ...panel });
    }
}

// ═══════════════════════════════════════════════════════════════
// الأمر الرئيسي
// ═══════════════════════════════════════════════════════════════
module.exports = {
    name: 'games',
    aliases: ['ألعاب', 'العاب', 'العب', 'لعبة', 'game', 'arcade'],
    description: 'مركز ألعاب تفاعلية — العب وحدك أو أونلاين ويا أصحابك',
    usage: 'العاب / games',

    async execute(context) {
        const username = context.author?.username || context.user?.username || 'لاعب';
        const panel = buildGamesPanel(username);
        if (context.isCommand?.()) return context.reply({ ...panel });
        return context.reply({ ...panel });
    },

    handleGameButton,
    buildGamesPanel,
};
