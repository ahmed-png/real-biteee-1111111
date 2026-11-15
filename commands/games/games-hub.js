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
        .setTitle('🎮 مركز الألعاب 2.0 — Arcade Hub')
        .setDescription([
            '> 🚀 **ألعاب 2D تفاعلية في المتصفح مع دعم أونلاين!**',
            '> اضغط على الأزرار بالأسفل أو افتح الروابط المباشرة:',
            '',
            `⚔️ [**Battle Arena — قتال أبطال 4 لاعبين**](${arenaUrl})`,
            `🎯 [**المهمة الأخيرة — نجاة وتصويب (فردي)**](${survivalUrl})`,
            `🥊 [**ساحة المبارزة — قتال منصات ضد خصم ذكي**](${duelUrl})`,
            `🚀 [**Space Defender — حرب الفضاء**](${spaceUrl})`,
            `🛡️ [**Tank Clash — حرب دبابات تكتيكية**](${tankUrl})`,
            `🌩️ [**Cyber Jump — منصات سايبربانك**](${cyberUrl})`,
            '',
            '> 💡 *إذا لم يستجب الزر في ديسكورد، اضغط على اسم اللعبة الأزرق أعلاه مباشرة.*',
        ].join('\n'))
        .setTimestamp()
        .setFooter({ text: '⚡ ألعاب فردية وجماعية — تعمل على الكمبيوتر والجوال!' });

    // ── Row 1: Battle Arena ────────────────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('⚔️ Battle Arena — منفرد')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'solo' })),
        new ButtonBuilder()
            .setLabel('🤺 Battle Arena — ضد Bot')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'bot' })),
        new ButtonBuilder()
            .setLabel('🌐 Battle Arena — مولتي بلاير')
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
            .setLabel('🚀 Space Defender')
            .setStyle(ButtonStyle.Link)
            .setURL(spaceUrl),
        new ButtonBuilder()
            .setLabel('🛡️ Tank Clash')
            .setStyle(ButtonStyle.Link)
            .setURL(tankUrl)
    );

    // ── Row 3: Cyber Jump ─────────────────────────────────────
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🌩️ Cyber Jump')
            .setStyle(ButtonStyle.Link)
            .setURL(cyberUrl)
    );

    // ── Row 4: Info ────────────────────────────────────────────
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('games_info')
            .setLabel('ℹ️ كيف تلعب مع أصدقائك?')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('games_create_room')
            .setLabel('🌐 إنشاء غرفة مشتركة')
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
            .setTitle('🌐 كيف تلعب مع أصدقائك؟')
            .setDescription([
                '**خطوات بسيطة:**',
                '',
                '1️⃣ اضغط على **"مولتي بلاير"** في أي لعبة',
                '2️⃣ اختر **"إنشاء غرفة"** وسيظهر لك **كود من 6 أحرف**',
                '3️⃣ شارك الكود مع أصدقائك في الديسكورد',
                '4️⃣ يضغطون على **"مولتي بلاير"** ويدخلون الكود',
                '5️⃣ ابدأ اللعبة — بسيط! 🎮',
                '',
                '> ⚡ **ملاحظة:** لا يُحفظ أي تاريخ أو نقاط — اللعبة مؤقتة بالكامل',
                '> 🔒 **أمان:** كل جلسة معزولة تماماً عن الأخريات',
            ].join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── إنشاء غرفة مشتركة ─────────────────────────────────────
    if (id === 'games_create_room') {
        const embed = new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('🌐 إنشاء غرفة مشتركة')
            .setDescription([
                `مرحباً **${username}**!`,
                '',
                '**اختر لعبة للعب الجماعي:**',
            ].join('\n'))
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('⚔️ Battle Arena')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('battle-arena.html', { name: nameParam, mode: 'multi' })),
            new ButtonBuilder()
                .setLabel('🛡️ Tank Clash')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('tank-clash.html', { name: nameParam, mode: 'multi' })),
            new ButtonBuilder()
                .setLabel('🌩️ Cyber Jump')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('cyber-jump.html', { name: nameParam, mode: 'multi' }))
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Space Defender')
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
    description: 'مركز الألعاب 2D الاحترافية — مولتي بلاير أونلاين',
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
