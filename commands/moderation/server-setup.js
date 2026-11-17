'use strict';
const appLogger = require('../../utils/app-logger');

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   🏆 NEXUS SERVER SETUP v4.0 — نظام بناء السيرفر الكامل 2060     ║
 * ║   يُفعَّل بكتابة: تفعيل سيرفر | اعادة تفعيل سيرفر | setup-server ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('../../config');
const db = require('../../utils/database');
const channelResolver = require('../../utils/channel-resolver');

// الألوان
const C = {
    gold:   '#FFD700',
    cyan:   '#00FFFF',
    purple: '#9B59B6',
    green:  '#2ECC71',
    red:    '#E74C3C',
    blue:   '#3498DB',
    orange: '#FF8C00',
    pink:   '#FF69B4',
    dark:   '#2C3E50',
    neon:   '#39FF14',
    teal:   '#1ABC9C',
    indigo: '#6610F2',
};

// القوانين
const SERVER_RULES = [
    { num: '١', icon: '🚫', rule: 'ممنوع السب والتنمر بكل أشكاله وبأي لغة' },
    { num: '٢', icon: '🎵', rule: 'شارك روابط الأغاني والترفيه بالقنوات المخصصة إلها بس' },
    { num: '٣', icon: '👑', rule: 'لا تستغل صلاحياتك الإدارية ولا تستخدمها بشكل تعسفي' },
    { num: '٤', icon: '🕌', rule: 'ابتعدوا عن الطائفية والتعصب الديني أو القبلي؛ إحنا هنا حتى نلعب سوا' },
    { num: '٥', icon: '🛡️', rule: 'إذا عندك ملاحظة تخص أونر السيرفر، احچي وياه بالخاص وباحترام' },
    { num: '٦', icon: '☮️', rule: 'خلّونا نتعاون ونحافظ على جو هادي وممتع للجميع' },
    { num: '٧', icon: '📵', rule: 'لا تعلن عن سيرفر أو منتج أو خدمة بدون إذن الإدارة' },
    { num: '٨', icon: '🔞', rule: 'ممنوع نشر محتوى مسيء أو غير لائق أو مخصص للكبار' },
    { num: '٩', icon: '🤝', rule: 'احترموا كل الأعضاء، والتمييز العنصري ممنوع' },
];

// بنية السيرفر الكاملة
function buildServerStructure(guild) {
    return {
        categories: [
            {
                name: '📌 المعلومات والإعلانات',
                emoji: '📌',
                locked: true,       // الفئة كلها للقراءة فقط
                channels: [
                    {
                        name: '📜┃القوانين',
                        type: ChannelType.GuildText,
                        topic: '⚖️ قوانين السيرفر — اقروها والتزموا بيها',
                        readOnly: true,
                        botPost: 'rules',   // البوت ينشر هنا
                    },
                    {
                        name: '📢┃الإعلانات',
                        type: ChannelType.GuildText,
                        topic: '📢 إعلانات الإدارة الرسمية',
                        readOnly: true,
                    },
                    {
                        name: '👋┃الترحيب',
                        type: ChannelType.GuildText,
                        topic: '🌟 هلا بالأعضاء الجدد — من هنا تبدي رحلتكم!',
                        readOnly: true,
                    },
                    {
                        name: '🤖┃أوامر-البوت',
                        type: ChannelType.GuildText,
                        topic: '⚙️ اكتب أوامر البوت هنا | للشرح الكامل اكتب شرح',
                        readOnly: false,
                        dbKey: 'botChannel',
                        botPost: 'botGuide',
                    },
                ]
            },
            {
                name: '💬 الدردشة العامة',
                emoji: '💬',
                channels: [
                    {
                        name: '💬┃الدردشة-العامة',
                        type: ChannelType.GuildText,
                        topic: '🗣️ احچي عن أي شي — الدردشة مفتوحة للكل',
                    },
                    {
                        name: '🖼️┃الصور-والميمز',
                        type: ChannelType.GuildText,
                        topic: '🎭 شارك الصور والميمز اللي تعجبك',
                    },
                    {
                        name: '📲┃السوشيال-ميديا',
                        type: ChannelType.GuildText,
                        topic: '📱 شارك محتوى السوشيال ميديا — يوتيوب، تيك توك، إنستا',
                    },
                    {
                        name: '🤖┃البوت-الذكي',
                        type: ChannelType.GuildText,
                        topic: '🧠 احچي ويا الذكاء الاصطناعي — منشن البوت أو اكتب رسالة',
                        dbKey: 'aiChannel',
                    },
                ]
            },
            {
                name: '💰 البنك والاقتصاد',
                emoji: '💰',
                channels: [
                    {
                        name: '💰┃البنك',
                        type: ChannelType.GuildText,
                        topic: '🏦 خدمات البنك — رصيد، يومي، عمل، تحويل',
                        dbKey: 'bankChannel',
                    },
                    {
                        name: '🛒┃المتجر',
                        type: ChannelType.GuildText,
                        topic: '🛍️ اكتب: متجر | أغراض نادرة وعروض يومية',
                    },
                    {
                        name: '📈┃الأسهم-والاستثمار',
                        type: ChannelType.GuildText,
                        topic: '💹 اكتب: استثمار | جرّب تضاعف ثروتك',
                    },
                    {
                        name: '🏆┃لوحة-الصدارة',
                        type: ChannelType.GuildText,
                        topic: '👑 أغنى أعضاء السيرفر — اكتب: صدارة',
                        dbKey: 'leaderboardChannel',
                        botPost: 'leaderboard',
                    },
                ]
            },
            {
                name: '🎮 ألعاب البوت',
                emoji: '🎮',
                channels: [
                    {
                        name: '🎮┃الألعاب-المصغرة',
                        type: ChannelType.GuildText,
                        topic: '🎲 العب XO وRPS وتريفيا — اكتب: العاب',
                        dbKey: 'gamesChannel',
                    },
                    {
                        name: '🎯┃التريفيا',
                        type: ChannelType.GuildText,
                        topic: '🧠 اختبر معلوماتك — اكتب: تريفيا',
                    },
                    {
                        name: '🎰┃الكازينو',
                        type: ChannelType.GuildText,
                        topic: '🎲 بلاك جاك، روليت، سلوت — اكتب: كازينو',
                    },
                    {
                        name: '🏆┃الإنجازات',
                        type: ChannelType.GuildText,
                        topic: '⭐ شوف مستواك وإنجازاتك — اكتب: بروفايل',
                    },
                ]
            },
            {
                name: '🕹️ غرف الألعاب الشهيرة',
                emoji: '🕹️',
                channels: [
                    {
                        name: '👾┃عام-الألعاب',
                        type: ChannelType.GuildText,
                        topic: '🎮 دردشة الألعاب — شارك مقاطعك ونتائجك',
                    },
                    {
                        name: '🔴┃أموك-اص-Among-Us',
                        type: ChannelType.GuildText,
                        topic: '👀 منو الغشّاش؟ | اكتب: غرفة جديدة [اسم] امونق اص',
                        game: 'AmongUs',
                    },
                    {
                        name: '🟡┃ببجي-PUBG',
                        type: ChannelType.GuildText,
                        topic: '🔫 غرف PUBG | اكتب: غرفة جديدة [اسم] ببجي',
                        game: 'PUBG',
                    },
                    {
                        name: '🟢┃كول-اوف-ديوتي-COD',
                        type: ChannelType.GuildText,
                        topic: '💥 غرف COD Warzone | اكتب: غرفة جديدة [اسم] كول اوف ديوتي',
                        game: 'COD',
                    },
                    {
                        name: '🔵┃فورتنايت',
                        type: ChannelType.GuildText,
                        topic: '🏗️ غرف Fortnite | اكتب: غرفة جديدة [اسم] فورتنايت',
                        game: 'Fortnite',
                    },
                    {
                        name: '🟣┃فالورانت',
                        type: ChannelType.GuildText,
                        topic: '🎯 غرف Valorant | اكتب: غرفة جديدة [اسم] فالورانت',
                        game: 'Valorant',
                    },
                    {
                        name: '⚫┃ماين-كرافت',
                        type: ChannelType.GuildText,
                        topic: '⛏️ غرف Minecraft | اكتب: غرفة جديدة [اسم] ماين كرافت',
                        game: 'Minecraft',
                    },
                    {
                        name: '🌟┃موبايل-ليجند',
                        type: ChannelType.GuildText,
                        topic: '⚔️ غرف Mobile Legends | اكتب: غرفة جديدة [اسم] موبايل ليجند',
                        game: 'MobileLegends',
                    },
                    {
                        name: '📣┃الإعلان-عن-غرف',
                        type: ChannelType.GuildText,
                        topic: '📣 أعلن عن غرفتك هنا، مهما كانت اللعبة',
                    },
                ]
            },
            {
                name: '🎨 الألوان والزينة',
                emoji: '🎨',
                channels: [
                    {
                        name: '🎨┃اختيار-الألوان',
                        type: ChannelType.GuildText,
                        topic: '🌈 اختار لون حسابك — اضغط أحد الأزرار!',
                        readOnly: true,
                        dbKey: 'colorsChannel',
                        botPost: 'colors',
                    },
                ]
            },
            {
                name: '🏠 الغرف المخصصة',
                emoji: '🏠',
                channels: [
                    {
                        name: '📖┃شرح-نظام-الغرف',
                        type: ChannelType.GuildText,
                        topic: '💡 شلون تسوي غرفتك الخاصة؟',
                        readOnly: true,
                        dbKey: 'roomsChannel',
                        botPost: 'roomsGuide',
                    },
                ]
            },
            {
                name: '⚖️ العقوبات والتقارير',
                emoji: '⚖️',
                privateAdmin: true,
                channels: [
                    {
                        name: '⚖️┃العقوبات',
                        type: ChannelType.GuildText,
                        topic: '📋 سجل إجراءات الإشراف التلقائية',
                        privateAdmin: true,
                        dbKey: 'punishmentsChannel',
                    },
                    {
                        name: '🚨┃التقارير',
                        type: ChannelType.GuildText,
                        topic: '📝 بلاغات الأعضاء — الإدارة تتابعها',
                        privateAdmin: true,
                    },
                    {
                        name: '🛡️┃الحماية',
                        type: ChannelType.GuildText,
                        topic: '🔒 سجل أحداث الأمان — Anti-Nuke, Anti-Spam',
                        privateAdmin: true,
                        dbKey: 'logChannel',
                    },
                ]
            },
            {
                name: '🔒 السجن',
                emoji: '🔒',
                isJail: true,
                channels: [
                    {
                        name: '🔒┃السجن',
                        type: ChannelType.GuildText,
                        topic: '⛓️ انحطّيت هنا بسبب مخالفة القوانين',
                        dbKey: 'jailChannel',
                    },
                ]
            },
            {
                name: '👑 الإدارة',
                emoji: '👑',
                privateAdmin: true,
                channels: [
                    {
                        name: '👑┃لوحة-الأونر',
                        type: ChannelType.GuildText,
                        topic: '🔐 للأونر بس — اكتب داشبورد حتى تفتح لوحة التحكم',
                        privateAdmin: true,
                        dbKey: 'ownerChannel',
                    },
                    {
                        name: '⚙️┃الإدارة-العامة',
                        type: ChannelType.GuildText,
                        topic: '🛠️ قناة الإدارة — للنقاشات والقرارات الداخلية',
                        privateAdmin: true,
                        dbKey: 'adminChannel',
                    },
                    {
                        name: '📝┃السجلات-الكاملة',
                        type: ChannelType.GuildText,
                        topic: '📊 سجلات النظام بالتفصيل — كل الأحداث',
                        privateAdmin: true,
                        dbKey: 'logChannel',
                    },
                ]
            },
            {
                name: '🔊 القنوات الصوتية',
                emoji: '🔊',
                voice: true,
                channels: [
                    { name: '🔊┃صوتي-عام-1',    type: ChannelType.GuildVoice },
                    { name: '🔊┃صوتي-عام-2',    type: ChannelType.GuildVoice },
                    { name: '👾┃Among-Us-🔴',   type: ChannelType.GuildVoice },
                    { name: '🔫┃PUBG-🟡',        type: ChannelType.GuildVoice },
                    { name: '💥┃COD-🟢',         type: ChannelType.GuildVoice },
                    { name: '🏗️┃Fortnite-🔵',   type: ChannelType.GuildVoice },
                    { name: '🎯┃Valorant-🟣',    type: ChannelType.GuildVoice },
                    { name: '🌟┃Mobile-Legends', type: ChannelType.GuildVoice },
                    { name: '🎵┃الموسيقى',       type: ChannelType.GuildVoice },
                    { name: '🔕┃AFK-غائب',       type: ChannelType.GuildVoice },
                ]
            },
        ]
    };
}

// نشر القوانين
async function postRules(guild, rulesChannel) {
    try {
        // حذف الرسائل القديمة
        const old = await rulesChannel.messages.fetch({ limit: 20 }).catch(() => null);
        if (old && old.size > 0) {
            await rulesChannel.bulkDelete(old).catch(() => {});
        }

        // Embed القوانين الرئيسي
        const rulesEmbed = new EmbedBuilder()
            .setColor(C.gold)
            .setTitle('⚖️ قوانين السيرفر')
            .setDescription([
                '```ansi',
                '\u001b[1;33m══════════════════════════════════════════\u001b[0m',
                '\u001b[1;33m       قوانين لازم الكل يلتزم بيها       \u001b[0m',
                '\u001b[1;33m══════════════════════════════════════════\u001b[0m',
                '```',
                '',
                '> 📌 **كل الأعضاء لازم يقروها ويلتزمون بيها**',
                '> ⚠️ **مخالفة القوانين ممكن يترتب عليها إجراء إشرافي**',
            ].join('\n'))
            .setThumbnail(guild.iconURL({ size: 256 }) || null)
            .setTimestamp()
            .setFooter({ text: `${guild.name} • نظام القوانين الرسمي`, iconURL: guild.iconURL() || undefined });

        SERVER_RULES.forEach(r => {
            rulesEmbed.addFields({
                name: `${r.icon} القانون ${r.num}`,
                value: `> ${r.rule}`,
                inline: false,
            });
        });

        // Embed الإقرار
        const acceptEmbed = new EmbedBuilder()
            .setColor(C.green)
            .setTitle('✅ موافقتك على القوانين')
            .setDescription([
                '**بانضمامك للسيرفر، إنت توافق على:**',
                '',
                '• 📖 تقرا كل القوانين المذكورة فوق',
                '• ✅ تلتزم بيها بكل الأوقات',
                '• ⚖️ تتعاون ويّا الإدارة إذا صارت مخالفة',
                '• 🤝 تساعدنا نخلي المكان إيجابي ومحترم',
                '',
                '```',
                'نتمنى لك وقت حلو بسيرفرنا! 🎮✨',
                '```',
            ].join('\n'))
            .setTimestamp();

        await rulesChannel.send({ embeds: [rulesEmbed] });
        await rulesChannel.send({ embeds: [acceptEmbed] });
        appLogger.info('[ServerSetup] تم نشر القوانين');
        return true;
    } catch (err) {
        appLogger.error('[ServerSetup] خطأ في نشر القوانين:', err.message);
        return false;
    }
}

// نشر شرح نظام الغرف
async function postRoomsGuide(guild, roomsChannel) {
    try {
        const old = await roomsChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (old && old.size > 0) await roomsChannel.bulkDelete(old).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor(C.purple)
            .setTitle('🏠 دليل الغرف الخاصة')
            .setDescription([
                '```ansi',
                '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
                '\u001b[1;35m       سوّي غرفتك الخاصة هسه! 🏠      \u001b[0m',
                '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
                '```',
            ].join('\n'))
            .addFields(
                {
                    name: '🎮 الألعاب المتوفرة',
                    value: [
                        '> **👾 امونق اص** (Among Us)',
                        '> **🔫 ببجي** (PUBG)',
                        '> **💥 كول اوف ديوتي** (COD)',
                        '> **🏗️ فورتنايت** (Fortnite)',
                        '> **🎯 فالورانت** (Valorant)',
                        '> **⛏️ ماين كرافت** (Minecraft)',
                        '> **🌟 موبايل ليجند** (Mobile Legends)',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🏠 تسوي غرفة خاصة',
                    value: [
                        '```',
                        'الأمر: غرفة جديدة [اسم الغرفة] [اللعبة]',
                        'مثال: غرفة جديدة غرفة الصقور ببجي',
                        'مثال: غرفة جديدة عشيرة النور موبايل ليجند',
                        '```',
                        '💰 **السعر:** **2,500** عملة من البنك',
                        '⏰ **المدة:** 7 أيام (وتگدر تجدّدها)',
                        '👑 **الصلاحيات:** تتحكم بالغرفة',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '⚙️ شتگدر تسوي بصفتك المالك',
                    value: [
                        '✅ تغيّر اسم الغرفة',
                        '✅ تنقل أعضاء من الروم الصوتي',
                        '✅ تكتم الأعضاء',
                        '✅ تقفل الغرفة أو تفتحها',
                        '✅ تجدّد الغرفة (+1000 عملة)',
                        '✅ تحذف الغرفة بأي وقت',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '⚠️ قواعد الغرف',
                    value: [
                        '❌ قوانين السيرفر تنطبق عليها',
                        '❌ لا تسيء للأعضاء',
                        '❌ لا تنشر إعلانات تجارية',
                        '❌ الغرف اللي ما تنستخدم لمدة 48 ساعة تنحذف',
                        '❌ لكل شخص غرفة وحدة بس',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📋 أوامر الغرف',
                    value: [
                        '`غرفة جديدة [اسم] [لعبة]` — تسوي غرفة',
                        '`غرف` — تشوف الغرف الشغّالة',
                        '`غرفتي` — تدير غرفتك بالأزرار',
                        '`تجديد غرفة` — تجدّدها 7 أيام (1000 💰)',
                        '`حذف غرفة` — تحذف غرفتك',
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({ text: '💡 الغرف تنحذف وحدها إذا انتهت مدتها أو ما استخدمها أحد' })
            .setTimestamp();

        // أزرار إنشاء غرفة سريع
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quickroom_pubg').setLabel('🔫 ببجي').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quickroom_cod').setLabel('💥 COD').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quickroom_valorant').setLabel('🎯 فالورانت').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('quickroom_ml').setLabel('🌟 موبايل ليجند').setStyle(ButtonStyle.Secondary),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quickroom_fortnite').setLabel('🏗️ فورتنايت').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quickroom_among').setLabel('👾 أموك اص').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quickroom_minecraft').setLabel('⛏️ ماين كرافت').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('quickroom_custom').setLabel('🏠 غرفة خاصة').setStyle(ButtonStyle.Danger),
        );

        await roomsChannel.send({ embeds: [embed], components: [row1, row2] });
        appLogger.info('[ServerSetup] تم نشر دليل الغرف');
    } catch (err) {
        appLogger.error('[ServerSetup] خطأ في نشر شرح الغرف:', err.message);
    }
}

// نشر شرح الألوان
async function postColorsGuide(guild, colorsChannel) {
    try {
        const colorSystem = require('../../utils/color-system');
        await colorSystem.setupColorChannel(guild, colorsChannel, null);
    } catch (err) {
        appLogger.error('[ServerSetup] خطأ في إعداد قناة الألوان:', err.message);
    }
}

// نشر دليل البوت
async function postBotGuide(guild, botChannel) {
    try {
        const old = await botChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (old && old.size > 0) await botChannel.bulkDelete(old).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor(C.cyan)
            .setTitle('🤖 دليل البوت — إصدار 2060')
            .setDescription([
                '```ansi',
                '\u001b[1;36m══════════════════════════════════════════════\u001b[0m',
                '\u001b[1;36m     هلا بيك بأذكى بوت ديسكورد! 🧠🚀     \u001b[0m',
                '\u001b[1;36m══════════════════════════════════════════════\u001b[0m',
                '```',
                '> **البوت يشتغل بدون بادئة — اكتب الأمر دغري!**',
            ].join('\n'))
            .addFields(
                {
                    name: '💰 الاقتصاد',
                    value: [
                        '`رصيد` — تعرف على رصيدك',
                        '`يومي` — مكافأتك اليومية',
                        '`عمل` — اجمع عملات',
                        '`متجر` — تسوّق',
                        '`استثمار` — استثمر عملاتك',
                        '`بنك` — خدمات البنك',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎮 الألعاب',
                    value: [
                        '`العاب` — قائمة الألعاب',
                        '`xo @شخص` — XO',
                        '`رحجة @شخص` — حجرة، ورقة',
                        '`تريفيا` — جرّب معلوماتك',
                        '`كازينو` — ألعاب الكازينو',
                        '`سباق` — سباق الألعاب',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📊 حسابك',
                    value: [
                        '`بروفايل` — حسابك',
                        '`مستوى` — مستواك وXP',
                        '`إنجازات` — إنجازاتك',
                        '`تحديات` — تحدياتك اليومية',
                        '`سمعة @شخص` — سمعتك',
                        '`rep @شخص` — زيد سمعة عضو',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🏠 الغرف',
                    value: [
                        '`غرفة جديدة [اسم] [لعبة]`',
                        '`غرف` — كل الغرف',
                        '`غرفتي` — تدير غرفتك',
                        '`تجديد غرفة` — تجدّدها',
                        '`حذف غرفة` — تحذفها',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎨 التخصيص',
                    value: [
                        '`ألوان` — ألوان حسابك',
                        '`لون [اسم]` — تغيّر لونك',
                        '`بول [سؤال]` — تسوي استطلاع',
                        '`كلان` — تدير الكلان',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🛡️ الإدارة',
                    value: [
                        '`مساعدة` — قائمة الأوامر',
                        '`تقرير @شخص` — بلّغ عن عضو',
                        '`عقوبات` — إجراءات الإشراف',
                        '`بان @شخص` — حظر',
                        '`ميوت @شخص` — كتم',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🧠 الذكاء الاصطناعي',
                    value: [
                        '> 💬 **احچي ويا البوت بقناة البوت-الذكي**',
                        '> 🤖 يتذكر محادثاتك السابقة',
                        '> 📚 يتعلم من الأعضاء باستمرار',
                        '> 🌟 يتأقلم ويا أسلوبك',
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({ text: '🚀 بوت 2060 — الذكاء الاصطناعي بإصدار أحدث' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bot_guide_economy').setLabel('💰 الاقتصاد').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('bot_guide_games').setLabel('🎮 الألعاب').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bot_guide_rooms').setLabel('🏠 الغرف').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('bot_guide_ai').setLabel('🧠 الذكاء').setStyle(ButtonStyle.Danger),
        );

        await botChannel.send({ embeds: [embed], components: [row] });
        appLogger.info('[ServerSetup] تم نشر دليل البوت');
    } catch (err) {
        appLogger.error('[ServerSetup] خطأ في نشر دليل البوت:', err.message);
    }
}

// Embed شريط التقدم
function buildProgressEmbed(status, percent, isReset) {
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return new EmbedBuilder()
        .setColor(percent === 100 ? C.green : C.cyan)
        .setTitle(isReset ? '♻️ إعادة تجهيز السيرفر' : '🚀 تجهيز السيرفر')
        .setDescription([
            '```ansi',
            '\u001b[1;36m[' + bar + ']\u001b[0m',
            `\u001b[1;33m${percent}%\u001b[0m`,
            '```',
            `> **${status}**`,
        ].join('\n'))
        .setTimestamp();
}

// Embed النتيجة النهائية
function buildSuccessEmbed(guild, results, isReset) {
    return new EmbedBuilder()
        .setColor(C.gold)
        .setTitle(isReset ? '✅ رجعنا جهّزنا السيرفر!' : '🚀 السيرفر صار جاهز!')
        .setDescription([
            '```ansi',
            '\u001b[1;32m══════════════════════════════════════\u001b[0m',
            '\u001b[1;32m    السيرفر صار جاهز ومترتّب! 🎮     \u001b[0m',
            '\u001b[1;32m══════════════════════════════════════\u001b[0m',
            '```',
            `> 🏠 **السيرفر:** ${guild.name}`,
            `> 📅 **الوقت:** <t:${Math.floor(Date.now() / 1000)}:f>`,
        ].join('\n'))
        .addFields(
            { name: '📁 الأقسام',  value: `**${results.categories}** قسم`,  inline: true },
            { name: '📣 القنوات', value: `**${results.channels}** قناة`,   inline: true },
            { name: '❌ المشاكل', value: `**${results.errors}** مشكلة`,      inline: true },
            {
                name: '📋 شنو صار',
                value: [
                    '✅ قنوات المعلومات والإعلانات',
                    '✅ قنوات الدردشة العامة',
                    '✅ قنوات البنك والاقتصاد',
                    '✅ قنوات ألعاب البوت',
                    '✅ غرف لـ 8 ألعاب شهيرة وMobile Legends',
                    '✅ نظام ألوان تفاعلي بالأزرار',
                    '✅ نظام غرف خاصة بالأزرار',
                    '✅ قنوات خاصة للإدارة',
                    '✅ 10 قنوات صوتية',
                    '✅ نشر القوانين تلقائياً ✨',
                    '✅ نشر الأدلة تلقائياً ✨',
                ].join('\n'),
                inline: false,
            }
        )
        .setThumbnail(guild.iconURL({ size: 256 }) || null)
        .setTimestamp()
        .setFooter({ text: '🤖 بوت 2060 — كلشي جاهز للخدمة' });
}

// دالة البناء الرئيسية
async function buildServer(guild, progressMsg, isReset = false) {
    const structure = buildServerStructure(guild);
    const guildData = db.getGuildData(guild.id);
    const results = { categories: 0, channels: 0, errors: 0 };

    // خريطة لحفظ مراجع القنوات المنشأة
    const channelRefs = {};

    // الخطوة 1: حذف البنية القديمة
    await progressMsg.edit({ embeds: [buildProgressEmbed('🗑️ دا أحذف البنية القديمة...', 5, isReset)] }).catch(() => {});

    if (isReset) {
        const currentChannel = progressMsg.channel;
        const allChannels = guild.channels.cache;

        // حذف قنوات نصية
        for (const [, ch] of allChannels.filter(c => c.type === ChannelType.GuildText && c.id !== currentChannel.id)) {
            await ch.delete('♻️ إعادة تفعيل').catch(() => {});
            await _sleep(300);
        }
        // حذف قنوات صوتية
        for (const [, ch] of allChannels.filter(c => c.type === ChannelType.GuildVoice)) {
            await ch.delete('♻️ إعادة تفعيل').catch(() => {});
            await _sleep(300);
        }
        // حذف الفئات
        for (const [, cat] of allChannels.filter(c => c.type === ChannelType.GuildCategory)) {
            await cat.delete('♻️ إعادة تفعيل').catch(() => {});
            await _sleep(300);
        }
    }

    await progressMsg.edit({ embeds: [buildProgressEmbed('🏗️ دا أنشئ الرتب الأساسية...', 12, isReset)] }).catch(() => {});

    // الخطوة 2: إنشاء الرتب
    let adminRole = guild.roles.cache.find(r => r.name === '🛡️ إدارة');
    if (!adminRole) {
        adminRole = await guild.roles.create({
            name: '🛡️ إدارة',
            color: '#E74C3C',
            hoist: true,
            permissions: [PermissionFlagsBits.Administrator],
            reason: '⚙️ إعداد السيرفر التلقائي',
        }).catch(() => null);
    }

    // رتبة السجن
    const jailRoleName = config.jailRoleName || '🔒┃سجين';
    let jailRole = guild.roles.cache.find(r =>
        r.name === jailRoleName || r.name === config.jailRoleName ||
        r.name.toLowerCase().includes('سجين') || r.name.toLowerCase().includes('jail')
    );
    if (!jailRole) {
        jailRole = await guild.roles.create({
            name: jailRoleName,
            color: '#000000',
            reason: '⚙️ إعداد السيرفر التلقائي - رتبة السجن',
        }).catch(() => null);
    }
    if (jailRole) {
        guildData.jailRole = jailRole.id;
    }

    // رتبة الكتم
    const muteRoleName = config.muteRoleName || '🔇┃مكتوم';
    let muteRole = guild.roles.cache.find(r =>
        r.name === muteRoleName || r.name === config.muteRoleName ||
        r.name.toLowerCase().includes('مكتوم') || r.name.toLowerCase().includes('muted')
    );
    if (!muteRole) {
        muteRole = await guild.roles.create({
            name: muteRoleName,
            color: '#808080',
            reason: '⚙️ إعداد السيرفر التلقائي - رتبة الكتم',
        }).catch(() => null);
    }
    if (muteRole) {
        guildData.muteRole = muteRole.id;
    }

    const everyoneRole = guild.roles.everyone;
    const totalCats = structure.categories.length;
    let progress = 15;

    // الخطوة 3: إنشاء الفئات والقنوات
    for (let i = 0; i < structure.categories.length; i++) {
        const catDef = structure.categories[i];
        progress = 15 + Math.floor((i / totalCats) * 65);

        await progressMsg.edit({
            embeds: [buildProgressEmbed(`🏗️ إنشاء: ${catDef.name}`, progress, isReset)]
        }).catch(() => {});

        try {
            // صلاحيات الفئة
            const catPermissions = [];
            if (jailRole) {
                if (catDef.isJail) {
                    catPermissions.push({ id: jailRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                } else {
                    catPermissions.push({ id: jailRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                }
            }

            if (catDef.isJail) {
                catPermissions.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                if (adminRole) {
                    catPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }
            } else if (catDef.privateAdmin) {
                catPermissions.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                if (adminRole) {
                    catPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }
            } else if (catDef.locked) {
                catPermissions.push({
                    id: everyoneRole.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                    deny: [PermissionFlagsBits.SendMessages],
                });
                if (adminRole) {
                    catPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
                }
            }

            const category = await guild.channels.create({
                name: catDef.name,
                type: ChannelType.GuildCategory,
                permissionOverwrites: catPermissions,
                reason: '⚙️ إعداد السيرفر',
            });
            results.categories++;

            // إنشاء القنوات داخل الفئة
            for (const chDef of catDef.channels) {
                try {
                    const chPermissions = [];

                    if (catDef.privateAdmin || chDef.privateAdmin) {
                        // قنوات الإدارة السرية
                        chPermissions.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                        if (adminRole) {
                            chPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        }
                    } else if (chDef.adminOnly) {
                        // مرئية للجميع لكن الكتابة للإدارة فقط
                        chPermissions.push({
                            id: everyoneRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages],
                        });
                        if (adminRole) {
                            chPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
                        }
                    } else if (chDef.readOnly || catDef.locked) {
                        // للقراءة فقط
                        chPermissions.push({
                            id: everyoneRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
                        });
                        if (adminRole) {
                            chPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AddReactions] });
                        }
                    }

                    const channel = await guild.channels.create({
                        name: chDef.name,
                        type: chDef.type || ChannelType.GuildText,
                        parent: category,
                        topic: chDef.topic || null,
                        permissionOverwrites: chPermissions,
                        reason: '⚙️ إعداد السيرفر',
                    });

                    // حفظ معرف القنوات المهمة
                    if (chDef.dbKey) {
                        guildData[chDef.dbKey] = channel.id;
                        channelRefs[chDef.dbKey] = channel;
                    }

                    // تسجيل مرجع للنشر لاحقاً
                    if (chDef.botPost) {
                        channelRefs[`post_${chDef.botPost}`] = channel;
                    }

                    results.channels++;
                    await _sleep(350);
                } catch (err) {
                    results.errors++;
                    appLogger.error(`[ServerSetup] فشل إنشاء ${chDef.name}:`, err.message);
                }
            }

            await _sleep(400);
        } catch (err) {
            results.errors++;
            appLogger.error(`[ServerSetup] فشل إنشاء فئة ${catDef.name}:`, err.message);
        }
    }

    // الخطوة 4: حفظ البيانات + مسح cache القنوات
    guildData.setupComplete = true;
    guildData.setupDate = Date.now();
    db.updateGuildData(guild.id, guildData);

    // مسح cache channel-resolver وإعادة بنائه بناءً على القنوات المنشأة
    channelResolver.invalidate(guild.id);
    // حفظ القنوات المعروفة من channelRefs مباشرة
    for (const [key, ch] of Object.entries(channelRefs)) {
        if (!key.startsWith('post_') && ch && ch.id) {
            channelResolver.save(guild.id, key, ch.id);
        }
    }

    // الخطوة 5: نشر المحتوى
    await progressMsg.edit({ embeds: [buildProgressEmbed('📝 دا أنشر القوانين والأدلة...', 88, isReset)] }).catch(() => {});

    // نشر القوانين
    if (channelRefs['post_rules']) {
        await postRules(guild, channelRefs['post_rules']);
    }

    // نشر دليل الغرف
    if (channelRefs['post_roomsGuide']) {
        await postRoomsGuide(guild, channelRefs['post_roomsGuide']);
    }

    // نشر دليل الألوان
    if (channelRefs['post_colors']) {
        try {
            const colorRoles = require('./color-roles');
            await colorRoles.createGuildColorRoles(guild);
        } catch (err) {
            appLogger.error('[ServerSetup] خطأ في إنشاء رتب الألوان:', err.message);
        }
        await postColorsGuide(guild, channelRefs['post_colors']);
    }

    // نشر دليل البوت
    if (channelRefs['post_botGuide']) {
        await postBotGuide(guild, channelRefs['post_botGuide']);
    }

    // نشر لوحة المتصدرين الأولية
    if (channelRefs['post_leaderboard']) {
        try {
            const leaderboard = require('../main/leaderboard');
            await leaderboard.sendLeaderboardToChannel(
                channelRefs['post_leaderboard'],
                guild.client,
                guild.id
            );
            appLogger.info('[ServerSetup] تم نشر لوحة المتصدرين');
        } catch (err) {
            appLogger.warn('[ServerSetup] تعذر نشر لوحة المتصدرين:', err.message);
        }
    }

    await progressMsg.edit({ embeds: [buildProgressEmbed('✅ خلص تجهيز السيرفر!', 100, isReset)] }).catch(() => {});

    return { results, channelRefs };
}

// مساعد: تأخير
function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// تصدير الوحدة
module.exports = {
    name: 'server-setup',
    aliases: [
        'تفعيل-سيرفر',
        'اعداد-سيرفر',
        'اعادةتفعيل',
        'اعادة-تفعيل',
        'setup-server',
        'reset-server',
        'بناء-سيرفر',
        'بناءسيرفر',
    ],
    description: 'يرتّب السيرفر وقنواته بالكامل — تفعيل سيرفر',
    permissions: [PermissionFlagsBits.Administrator],
    category: 'إدارة',

    async execute(message, args, options = {}) {
        // فحص الصلاحيات
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) &&
            message.author.id !== config.ownerId) {
            return message.reply('❌ هالأمر يحتاج صلاحية **Administrator**.');
        }

        // إصلاح isReset: نكتشف من اسم الأمر المُستخدَم أو من محتوى الرسالة
        const usedCommand = message.content.slice(config.prefix.length).trim().split(/\s+/)[0].toLowerCase();
        const resetKeywords = ['اعادةتفعيل', 'اعادة-تفعيل', 'reset-server', 'reset'];
        const isReset = options.isReset === true ||
            resetKeywords.includes(usedCommand) ||
            message.content.toLowerCase().includes('اعادة') ||
            message.content.toLowerCase().includes('reset');

        // رسالة التأكيد بأزرار
        const confirmEmbed = new EmbedBuilder()
            .setColor(C.orange)
            .setTitle(isReset ? '⚠️ تأكيد إعادة تجهيز السيرفر' : '🚀 تأكيد تجهيز السيرفر')
            .setDescription([
                isReset
                    ? '> **⚠️ راح تنحذف كل القنوات الحالية وينبني السيرفر من جديد!**'
                    : '> **🚀 راح نرتّب هيكل السيرفر بالكامل!**',
                '',
                '**📋 شنو راح يصير:**',
                isReset ? '• 🗑️ تنحذف كل القنوات الحالية' : '• ✅ تنعمل قنوات جديدة',
                '• 📁 تنعمل 10 أقسام مرتبة',
                '• 🎮 تنعمل قنوات لـ 8 ألعاب وMobile Legends',
                '• 💰 ينضاف نظام البنك والاقتصاد',
                '• 📜 تننشر القوانين تلقائياً بقناتها',
                '• 🏠 يننشر دليل الغرف ويا أزرار الإنشاء السريع',
                '• 🎨 ينضاف نظام الألوان التفاعلي',
                '• 🤖 يننشر دليل البوت',
                '• 🔒 تنعمل قنوات خاصة للإدارة',
                '',
                '> **اضغط ✅ حتى تأكد أو ❌ حتى تلغي (30 ثانية)**',
            ].join('\n'))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setup_confirm')
                .setLabel(isReset ? '✅ إي، جهّز من جديد' : '✅ إي، جهّز')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('setup_cancel')
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Danger),
        );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        const filter = i => i.user.id === message.author.id;
        try {
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30_000 });

            // دالة استجابة آمنة تتأكد من حالة الـ interaction
            const safeAck = async (payload) => {
                if (response.deferred || response.replied) {
                    return await response.editReply(payload).catch(() => {});
                } else {
                    return await response.update(payload).catch(() => {});
                }
            };

            if (response.customId === 'setup_cancel') {
                await safeAck({
                    embeds: [new EmbedBuilder().setColor(C.red).setTitle('❌ انلغت العملية').setDescription('> ما صار أي تغيير.')],
                    components: []
                });
                return;
            }

            // بدء البناء
            await safeAck({
                embeds: [buildProgressEmbed('🚀 دا أبدي...', 0, isReset)],
                components: []
            });

            const { results } = await buildServer(message.guild, confirmMsg, isReset);

            // رسالة النجاح
            await confirmMsg.edit({
                embeds: [buildSuccessEmbed(message.guild, results, isReset)],
                components: []
            }).catch(() => {});

        } catch (err) {
            if (err.message?.includes('time')) {
                await confirmMsg.edit({
                    embeds: [new EmbedBuilder().setColor(C.red).setTitle('⏰ خلص الوقت').setDescription('> ما وصلني تأكيد خلال 30 ثانية.')],
                    components: []
                }).catch(() => {});
            } else {
                appLogger.error('[ServerSetup] خطأ:', err.message);
                await confirmMsg.edit({
                    embeds: [new EmbedBuilder().setColor(C.red).setTitle('❌ صار خطأ').setDescription(`> ${err.message}`)],
                    components: []
                }).catch(() => {});
            }
        }
    },

    // تصدير للاستخدام الخارجي
    buildServer,
    postRules,
    postColorsGuide,
    postRoomsGuide,
    postBotGuide,
};
