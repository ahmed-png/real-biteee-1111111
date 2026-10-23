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

const config = require('../../config');
const dashServer = require('../../dashboard-server');

// ─── Helper: Build game URL ─────────────────────────────────────
function gameUrl(gamePath, params = {}) {
    const base = dashServer.getDashboardUrl();
    const query = new URLSearchParams(params).toString();
    return `${base}/games/${gamePath}${query ? '?' + query : ''}`;
}

// ═══════════════════════════════════════════════════════════════
// بناء لوحة الألعاب الرئيسية
// ═══════════════════════════════════════════════════════════════
function buildGamesPanel(username = '') {
    const nameParam = username ? encodeURIComponent(username) : '';

    const embed = new EmbedBuilder()
        .setColor('#0d1fd4')
        .setTitle('🎮 مركز الألعاب 2.0 — Arcade Hub')
        .setDescription([
            '> 🚀 **ألعاب 2D احترافية مع دعم مولتي بلاير!**',
            '> اضغط على أي زر لفتح اللعبة في متصفحك',
            '',
            '⚔️ **Battle Arena** — قتال 4 لاعبين مع أسلحة عشوائية',
            '🛡️ **Tank Clash** — حرب دبابات تكتيكية وأسلحة نيون',
            '🐍 **Snake 2.0** — ثعبان نيون تنافسي متعدد اللاعبين',
            '🚀 **Space Defender** — حرب الفضاء وموجات الروبوتات',
            '🃏 **Memory Match** — تطابق البطاقات الذهني',
            '🌩️ **Cyber Jump** — منصات سايبربانك',
            '',
            '> 🔵 **منفرد** | 🟡 **ضد الروبوت** | 🟢 **مولتي بلاير أونلاين**',
        ].join('\n'))
        .setTimestamp()
        .setFooter({ text: '⚡ لا يُحفظ أي تاريخ — العب واستمتع!' });

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

    // ── Row 2: Snake ──────────────────────────────────────────
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🐍 Snake — منفرد')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('snake.html', { name: nameParam, mode: 'solo' })),
        new ButtonBuilder()
            .setLabel('🐍 Snake — ضد Bot')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('snake.html', { name: nameParam, mode: 'bot' })),
        new ButtonBuilder()
            .setLabel('🐍 Snake — مولتي بلاير')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('snake.html', { name: nameParam, mode: 'multi' }))
    );

    // ── Row 3: Space + Tanks + Memory + Cyber ─────────────────
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🚀 Space Defender')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('space-defender.html', { name: nameParam })),
        new ButtonBuilder()
            .setLabel('🛡️ Tank Clash')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('tank-clash.html', { name: nameParam })),
        new ButtonBuilder()
            .setLabel('🃏 Memory Match')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('memory-match.html', { name: nameParam })),
        new ButtonBuilder()
            .setLabel('🌩️ Cyber Jump')
            .setStyle(ButtonStyle.Link)
            .setURL(gameUrl('cyber-jump.html', { name: nameParam }))
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
    const nameParam = encodeURIComponent(username);

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
        const baseUrl = gameUrl('battle-arena.html', { name: nameParam, mode: 'multi' });
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
                .setLabel('🐍 Snake 2.0')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('snake.html', { name: nameParam, mode: 'multi' }))
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Space Defender')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('space-defender.html', { name: nameParam, mode: 'multi' })),
            new ButtonBuilder()
                .setLabel('🃏 Memory Match')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('memory-match.html', { name: nameParam, mode: 'multi' })),
            new ButtonBuilder()
                .setLabel('🌩️ Cyber Jump')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl('cyber-jump.html', { name: nameParam, mode: 'multi' }))
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
