const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags
} = require('discord.js');
const config = require('../../config');

// صفحات الدليل
const GUIDE_PAGES = [
    {
        emoji: '💰',
        title: 'دليل الاقتصاد — البداية',
        color: '#FFD700',
        description: [
            '> هلا بيك بنظام الاقتصاد! بهالدليل نشرحلك كلشي.',
            '',
            '**📌 الأساسيات:**',
            '`محفظة` — الفلوس اللي وياك، وممكن تنسرق',
            '`بنك` — فلوس مودعها بالبنك، أأمن شوي',
            '`خزنة شخصية` — فلوس محمية 100% وما تنسرق (تشتريها من المتجر)',
            '',
            '**📋 أهم الأوامر حتى تبدي:**',
            `\`رصيد\` — لوحة الاقتصاد كاملة وبها أزرار`,
            `\`عمل\` — اشتغل واكسب (انتظر ${Math.floor((config.workCooldown || 3600000) / 60000)} دقيقة بين كل مرة)`,
            `\`يومي\` — مكافأة كل 24 ساعة، وأيام التتابع تزيدها`,
            `\`راتب\` — مكافأة كل 7 أيام`,
            '',
            '**💡 نصيحة:** لا تنسى `يومي` كل يوم حتى تزيد مكافأة التتابع!'
        ].join('\n')
    },
    {
        emoji: '🏦',
        title: 'دليل الاقتصاد — البنك',
        color: '#3498DB',
        description: [
            '**🏦 البنك:**',
            '',
            '`ايداع <مبلغ>` — حوّل فلوس من المحفظة للبنك',
            '`سحب <مبلغ>` — رجّع فلوس من البنك للمحفظة',
            '`تحويل @user <مبلغ>` — دز فلوس لشخص ثاني',
            '',
            '**اختصارات المبلغ:**',
            '`كامل` أو `all` — كل الفلوس',
            '`نصف` أو `half` — نص الفلوس',
            '`ربع` أو `quarter` — ربع الفلوس',
            '`ثلث` أو `third` — ثلث الفلوس',
            '',
            '**مثال:**',
            '`ايداع نصف` — يودع نص اللي بمحفظتك بالبنك',
            '`سحب 5000` — يسحب 5000 من البنك',
            '',
            '> **نصيحة:** خلي فلوسك بالبنك حتى تحميها من السرقة!',
        ].join('\n')
    },
    {
        emoji: '🔐',
        title:         'دليل الاقتصاد — الخزنة الشخصية',
        color: '#F1C40F',
        description: [
            '**🔐 الخزنة الشخصية:**',
            '',
            '> تشتري الخزنة الشخصية من المتجر (قسم VIP) بـ **8,000** عملة',
            '',
            '**شلون تستخدمها:**',
            '1️⃣ اكتب `متجر` أو `رصيد` واضغط زر المتجر',
            '2️⃣ روح لقسم **👑 VIP**',
            '3️⃣ اشتري **🏦 خزنة شخصية** (8000 عملة)',
            '4️⃣ من تشتريها، يطلع زر **🔐 خزنتي** بلوحة `رصيد`',
            '5️⃣ اضغطه وتلكه أزرار **إيداع** و**سحب**',
            '',
            '**شنو يفيدك بيها:**',
            '✅ محد يسرق منها — حتى لو عنده طقم السرقة VIP',
            '✅ تشيل لحد 100,000 عملة',
            '✅ تبين بلوحة الرصيد الرئيسية',
            '',
            '> **مهم:** الخزنة للادخار لفترة طويلة، مو للاستخدام اليومي!',
        ].join('\n')
    },
    {
        emoji: '🕵️',
        title: 'دليل الاقتصاد — السرقة',
        color: '#E74C3C',
        description: [
            '**🕵️ السرقة:**',
            '',
            '`سرقة @user` — حاول تسرق شخص',
            '',
            '**فرصة النجاح:**',
            '— بدون شي: **40%**',
            '— ويا 🍀 جرعة الحظ: **60%**',
            '— ويا 🕵️ طقم السرقة: تستخدم محاولة إضافية بدل الانتظار',
            '',
            '**إذا نجحت:** تاخذ 10-40% من محفظة الشخص',
            '**إذا ما ضبطت:** تنخصم غرامة 10% من محفظتك',
            '',
            '**طرق الحماية:**',
            '🛡️ **درع الحماية**: يمنع السرقة عنك لمدة 24 ساعة',
            '⚔️ **مناعة السرقة VIP**: حماية دائمة',
            '🔐 **الخزنة**: فلوسك بيها تبقى بأمان',
            '',
            `⏰ **وقت الانتظار بين السرقات:** ${Math.floor((config.robCooldown || 86400000) / 3600000)} ساعة`
        ].join('\n')
    },
    {
        emoji: '🛒',
        title: 'دليل الاقتصاد — المتجر',
        color: '#9B59B6',
        description: [
            '**🛒 متجر السيرفر:**',
            '',
            '`متجر` — افتح المتجر بالأزرار',
            '',
            '**الأقسام:**',
            '',
            '**🎒 الأغراض:**',
            '`🛡️ درع` — يحميك من السرقة 24 ساعة (500)',
            '`🍀 حظ` — يخلي فرصة نجاح السرقة 60% (300)',
            '`⚡ XP` — يضاعف نقاط الخبرة ساعتين (400)',
            '`💰 كيس فلوس` — +1200~1800 فوراً (1000)',
            '`🕵️ طقم سرقة` — 3 محاولات زيادة (800)',
            '`⏩ تصفير الانتظار` — يصفر وقت العمل والسرقة (700)',
            '',
            '**⬆️ التطويرات:**',
            '`💫/🌟 XP` — حزم خبرة فورية (500/1500)',
            '`🎁 مضاعف اليومي` — مكافأتك تصير ×2 (1200)',
            '`🏦 توسعة البنك` — +50K للحد (2000)',
            '',
            '**👑 VIP:**',
            '`👑 شارة VIP` — تبقى وياك (5000)',
            '`🔐 خزنة` — تحمي فلوسك (8000)',
            '`⚔️ مناعة السرقة` — حماية دائمة (10000)',
        ].join('\n')
    },
    {
        emoji: '⭐',
        title: 'دليل الاقتصاد — المستويات والـ Streak',
        color: '#2ECC71',
        description: [
            '**⭐ المستويات:**',
            '',
            '— كل رسالة تعطيك **5 XP** (مرة كل 30 ثانية)',
            '— كل شغل ناجح يضيفلك **3 XP**',
            '— من يعلى مستواك تاخذ **مكافأة فورية**',
            '— كل 5 مستويات: **+1000 زيادة**',
            '— كل 10 مستويات: **مكافأة كلش كبيرة**',
            '',
            '**🔥 التتابع اليومي:**',
            '',
            '— كل يوم تاخذ `يومي` تزيد أيام التتابع',
            '— كل يوم زيادة = **+100 عملة** مكافأة',
            '— أعلى مكافأة: **+1000 عملة**',
            '— إذا نسيت يوم، يرجع التتابع للصفر (إلا ويا 🔒 حماية التتابع)',
            '',
            '**🏆 المتصدرين:**',
            '`رصيد` ← زر المتصدرين — أغنى 10 أشخاص بالسيرفر',
        ].join('\n')
    },
];

module.exports = {
    name: 'دليل',
    aliases: ['guide', 'help-eco', 'شرح', 'مساعدة اقتصاد', 'كيف اشتغل'],
    description: 'دليل كامل لنظام الاقتصاد',
    usage: 'دليل',

    async execute(message) {
        let page = 0;
        const userId = message.author.id;

        const buildMsg = (p) => {
            const g = GUIDE_PAGES[p];
            const embed = new EmbedBuilder()
                .setColor(g.color)
                .setTitle(`${g.emoji} ${g.title}`)
                .setDescription(g.description)
                .setFooter({ text: `صفحة ${p + 1} / ${GUIDE_PAGES.length}  •  اقتصاد السيرفر` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('guide_prev')
                    .setLabel('◀ اللي قبل')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('guide_page')
                    .setLabel(`${p + 1} / ${GUIDE_PAGES.length}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('guide_next')
                    .setLabel('اللي بعد ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === GUIDE_PAGES.length - 1),
                new ButtonBuilder()
                    .setCustomId('guide_economy')
                    .setLabel('💼 لوحة الاقتصاد')
                    .setStyle(ButtonStyle.Success)
            );

            return { embeds: [embed], components: [row] };
        };

        const reply = await message.reply(buildMsg(0));

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 3 * 60 * 1000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'guide_prev') { page = Math.max(0, page - 1); }
            else if (i.customId === 'guide_next') { page = Math.min(GUIDE_PAGES.length - 1, page + 1); }
            else if (i.customId === 'guide_economy') {
                const ecoHub = require('./economy-hub');
                const panel = await ecoHub.buildMainPanel(userId, i.client);
                return i.update({ ...panel });
            }
            await i.update(buildMsg(page));
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
