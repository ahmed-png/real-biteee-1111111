'use strict';
const appLogger = require('../../utils/app-logger');

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

const JOBS = [
    // وظائف عادية
    { name: 'مبرمج',     emoji: '💻', min: 250, max: 550, desc: 'كتبت كود مرتب وسلّمت مشروع كبير بوقته!',                    xp: 5 },
    { name: 'طبيب',      emoji: '⚕️', min: 350, max: 650, desc: 'سويت عملية ناجحة وساعدت مريض يرجع بصحته!',                 xp: 5 },
    { name: 'مهندس',     emoji: '🔧', min: 280, max: 580, desc: 'صممت جسر كبير وتابعت شغله خطوة بخطوة!',                      xp: 4 },
    { name: 'معلم',      emoji: '📚', min: 180, max: 420, desc: 'شرحت الدرس بطريقة حلوة والطلاب فهموه من أول مرة!',            xp: 3 },
    { name: 'طاهي',      emoji: '👨‍🍳', min: 200, max: 480, desc: 'طبخت وجبة طيبة والزبائن رجعوا يطلبون زيادة!',             xp: 3 },
    { name: 'سائق',      emoji: '🚗', min: 150, max: 380, desc: 'وصلت الركاب بالسلامة وبأسرع طريق!',                           xp: 2 },
    { name: 'تاجر',      emoji: '🏪', min: 300, max: 620, desc: 'خلصت صفقة حلوة وطلعت منها بربح زين!',                         xp: 5 },
    { name: 'مصمم',      emoji: '🎨', min: 220, max: 500, desc: 'صممت شعار عجب الزبون وطلع أحلى من اللي متوقعه!',               xp: 4 },
    { name: 'رياضي',     emoji: '⚽', min: 200, max: 450, desc: 'سجلت هدف حسم المباراة بآخر دقيقة!',                            xp: 3 },
    { name: 'صياد',      emoji: '🎣', min: 150, max: 400, desc: 'صدت سمكة نادرة وبعتها بسعر خوش!',                               xp: 2 },
    { name: 'نجار',      emoji: '🪚', min: 200, max: 460, desc: 'سويت أثاث خشب مرتب بإيدك وشغلك الحلو!',                         xp: 3 },
    { name: 'حارس أمن',  emoji: '🛡️', min: 160, max: 360, desc: 'أمّنت الفعالية الكبيرة ومشت الأمور بدون مشاكل!',               xp: 2 },
    { name: 'كاتب',      emoji: '✍️', min: 190, max: 430, desc: 'كتبت مقال حلو ونشروه بمنصة كبيرة وجاب تفاعل!',                  xp: 4 },
    { name: 'مسوّق',     emoji: '📊', min: 240, max: 520, desc: 'سويت حملة إعلانية ناجحة وزادت المبيعات خلال أسبوع!',            xp: 4 },
    { name: 'مصوّر',     emoji: '📸', min: 180, max: 400, desc: 'التقطت صور حلوة بمؤتمر دولي كبير!',                              xp: 3 },
    { name: 'محامي',     emoji: '⚖️', min: 350, max: 700, desc: 'دافعت عن موكلك زين وطلعتله حكم براءة!',                         xp: 5 },

    // وظائف عراقية مضحكة
    { name: 'بائع گاي',    emoji: '☕', min: 80, max: 220,  desc: 'بعت گاي بنص بغداد، واليوم الكل مدح الخلطة مالك 😂',                   xp: 2 },
    { name: 'سائق تكتك',  emoji: '🛺', min: 100, max: 300, desc: 'وصلت الزبون للمحطة، وبالنهاية عطاك بقشيش زيادة 😅',                  xp: 2 },
    { name: 'بقال محلة',  emoji: '🏬', min: 120, max: 350, desc: 'بعت مرطبات وثلج من الصبح، وكل أهل المحلة سلموا عليك 😁',             xp: 3 },
    { name: 'قهوجي',      emoji: '🍵', min: 90, max: 260,  desc: 'سويت قهوة طيبة والزبون كال: "تسلم إيدك!" ☕',                         xp: 2 },
    { name: 'كاسب الجيم', emoji: '🏋️', min: 200, max: 480, desc: 'درّبت الشباب، وواحد وعد يرجع باچر بعد ما يرتاح من التمرين 😂',         xp: 4 },
    { name: 'عامل فلافل', emoji: '🧆', min: 100, max: 280, desc: 'قليت فلافل طيبة والطلبات ما وقفت طول الدوام 😁',                    xp: 2 },
    { name: 'دلّال',       emoji: '🤝', min: 300, max: 700, desc: 'دلّيت على سيارة وانباعت بسرعة، واليوم عمولتك خوش شي! 💰',           xp: 5 },
    { name: 'عامل فرن',   emoji: '🫓', min: 90, max: 250,  desc: 'خبزت خبز حار والناس صفت من الفجر — البيع اليوم مولّع 😂',            xp: 2 },
    { name: 'حلاق محلة',  emoji: '💈', min: 120, max: 320, desc: 'قصّيت شعر 15 زبون، والكل طلع راضي 😅',                              xp: 3 },
    { name: 'صاحب مولدة', emoji: '⚡', min: 200, max: 500, desc: 'شغّلت المولدة للمحلة وجمعت الحسابات، يومك مشى تمام 💡',             xp: 4 },
    { name: 'عامل مسلّخ', emoji: '🥩', min: 130, max: 350, desc: 'جهزت طلبات اللحم كلها بوقتها، شغل مرتب 💪',                          xp: 3 },
    { name: 'بائع كيك',   emoji: '🎂', min: 80, max: 240,  desc: 'بعت كيك بالإشارة وكل السيارات وقفت تشتري — يوم موفق! 🥳',            xp: 2 },
    { name: 'مصلّح أجهزة',emoji: '🔌', min: 150, max: 400, desc: 'رجّعت تلفزيون عمره 20 سنة يشتغل، وصاحبه ما صدّگ 😎',                xp: 4 },
    { name: 'صيّاد سمك دجلة', emoji: '🐟', min: 90, max: 280, desc: 'صدت شبوط كبير من دجلة وبعته بسعر زين 🎣',                         xp: 2 },
];

module.exports = {
    name: 'work',
    aliases: ['عمل', 'شتغل', 'اشتغل', 'اعمل'],
    description: 'اشتغل حتى تكسب فلوس وخبرة',
    usage: 'عمل',

    // Slash Command Definition
    slash: {
        name: 'work',
        description: 'اشتغل حتى تكسب فلوس وخبرة (كل ساعة)',
    },

    async execute(message) {

        try {
            const userId = message.author.id;
            const userData = db.getUserData(userId);
            const now = Date.now();
            const cooldown = config.workCooldown || 3_600_000;

            // كولداون
            if (userData.lastWork && (now - userData.lastWork) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWork);
                const minutes = Math.floor(timeLeft / 60_000);
                const seconds = Math.floor((timeLeft % 60_000) / 1000);

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏰ تحتاج ترتاح شوي!')
                    .setDescription(
                        `> تگدر ترجع للشغل بعد:\n> ## ⌛ ${minutes} دقيقة و ${seconds} ثانية`
                    )
                    .setFooter({ text: 'ارتاح شوي وارجع بنشاط!' });

                const row = _buildCooldownRow(minutes, seconds);
                return message.reply({ embeds: [embed], components: [row] });
            }

            // اختيار المهنة عشوائياً
            const job = JOBS[Math.floor(Math.random() * JOBS.length)];
            let earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
            const boostLines = [];
            let boostMultiplier = 1.0;

            // بوستات المتجر
            const inv = userData.inventory || {};
            if (inv.laptop?.expiresAt > now) {
                boostMultiplier *= 1.5;
                boostLines.push('💻 *مضاعف اللابتوب (+50%)*');
            } else if (inv.pickaxe?.expiresAt > now) {
                boostMultiplier *= 1.2;
                boostLines.push('⛏️ *مضاعف المعول (+20%)*');
            }
            if (userData.dailyBoostUntil && now < userData.dailyBoostUntil) {
                boostMultiplier *= 1.25;
                boostLines.push('🎁 *مضاعف اليومي (+25%)*');
            }
            if (boostMultiplier > 1.0) {
                earned = Math.floor(earned * boostMultiplier);
            }

            // حفظ البيانات (addMoney يطبق الحد تلقائياً)
            const actualEarned = db.addMoney(userId, earned);
            db.updateFields(userId, { lastWork: now });
            db.addTransaction(userId, 'work', actualEarned, `شغل — ${job.name}`);
            levels.addXP(userId, job.xp, message);

            // تقييم الراتب
            const newBalance = (userData.balance || 0) + actualEarned;

            // تقييم الراتب
            const earningPct = Math.round(((earned - job.min) / (job.max - job.min)) * 100);
            const ratingEmoji = earningPct >= 80 ? '🔥 خوش شغل!' : earningPct >= 50 ? '✅ زين' : '😐 عادي';
            const embedColor = earningPct >= 80 ? '#57F287' : earningPct >= 50 ? '#FEE75C' : '#5865F2';

            const descParts = [`> ${job.desc}`];
            if (boostLines.length) descParts.push('', boostLines.map(l => `> ${l}`).join('\n'));

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`${job.emoji} اشتغلت ${job.name}`)
                .setDescription(descParts.join('\n'))
                .addFields(
                    { name: '💵 اللي كسبته',     value: `**+${earned.toLocaleString()} ${config.currency}**`, inline: true },
                    { name: '⭐ XP اللي كسبته',   value: `**+${job.xp} XP**`,                                 inline: true },
                    { name: '📊 التقييم',         value: ratingEmoji,                                         inline: true },
                    { name: '💰 رصيدك الآن',      value: `${newBalance.toLocaleString()} ${config.currency}`, inline: false }
                )
                .setFooter({ text: `⏰ الشغل الجاي بعد ${Math.floor(cooldown / 60_000)} دقيقة` })
                .setTimestamp();

            const row = _buildWorkRow();
            await message.reply({ embeds: [embed], components: [row] });

            // التحليلات والإنجازات
            try {
                const analytics = require('../../utils/analytics');
                analytics?.trackEconomy?.('earn', earned, userId);
            } catch { /* اختياري */ }

            try {
                const achievementsCmd = require('../main/achievements-cmd');
                achievementsCmd?.checkAchievements?.(userId, 'work', {}, message).catch(() => {});
            } catch { /* اختياري */ }

        } catch (err) {
            appLogger.error('[work] خطأ:', err);
            message.reply('❌ صار خطأ غير متوقع بأمر الشغل.').catch(() => {});
        }
    },

    // معالج الأزرار
    async handleWorkInteraction(interaction) {
        const id = interaction.customId;

        if (id === 'work_daily') {
            return interaction.reply({ content: '> 🎁 اكتب `يومي` حتى تاخذ مكافأتك اليومية!', flags: MessageFlags.Ephemeral });
        }
        if (id === 'work_balance') {
            const userData = db.getUserData(interaction.user.id);
            return interaction.reply({
                content: [
                    `> 💰 **رصيدك:** ${(userData.balance || 0).toLocaleString()} ${config.currency}`,
                    `> 🏦 **البنك:** ${(userData.bank || 0).toLocaleString()} ${config.currency}`,
                ].join('\n'),
                flags: MessageFlags.Ephemeral,
            });
        }
        if (id === 'work_rob') {
            return interaction.reply({ content: '> 🕵️ اكتب `سرقة @شخص` حتى تحاول تسرق!', flags: MessageFlags.Ephemeral });
        }
        if (id === 'work_casino') {
            return interaction.reply({ content: '> 🎰 اكتب `كازينو` حتى تفتح الكازينو!', flags: MessageFlags.Ephemeral });
        }
        // زر "وقت التالي" المحدَّث — يُظهر الوقت المتبقي الفعلي
        if (id === 'work_timer') {
            const userData = db.getUserData(interaction.user.id);
            const cooldown = config.workCooldown || 3_600_000;
            const now = Date.now();
            if (userData.lastWork && (now - userData.lastWork) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWork);
                const m = Math.floor(timeLeft / 60_000);
                const s = Math.floor((timeLeft % 60_000) / 1000);
                return interaction.reply({
                    content: `> ⏰ تگدر تشتغل مرة ثانية بعد **${m} دقيقة و ${s} ثانية**.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            return interaction.reply({ content: '> ✅ تگدر تشتغل هسه! اكتب `عمل`.', flags: MessageFlags.Ephemeral });
        }
    },
};

// أزرار عند الكولداون
function _buildCooldownRow(minutes, seconds) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('work_timer')
            .setLabel(`⏰ ${minutes}د ${seconds}ث`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder().setCustomId('work_daily').setLabel('🎁 يوميتي').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('work_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('work_rob').setLabel('🕵️ اسرق!').setStyle(ButtonStyle.Danger)
    );
}

// أزرار ما بعد العمل
function _buildWorkRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('work_timer')        .setLabel('⏰ وقت الشغل الجاي').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('work_daily').setLabel('🎁 يوميتي').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('work_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('work_casino').setLabel('🎰 كازينو').setStyle(ButtonStyle.Danger)
    );
}
