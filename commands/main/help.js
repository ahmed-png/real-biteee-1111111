'use strict';

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'help',
    aliases: ['مساعدة', 'هيلب'],
    description: 'دليل أوامر البوت الشامل',
    usage: 'help',

    async execute(message) {
        const isOwner = (message.author?.id || message.user?.id) === config.ownerId;
        const embed = buildMainEmbed(message.client?.user || message.user);
        const row = buildSelectMenu(false, isOwner);
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleHelpInteraction(interaction) {
        const isOwner = interaction.user.id === config.ownerId;
        const value = interaction.values ? interaction.values[0] : interaction.customId;
        let embed;

        switch (value) {
            case 'help_economy':          embed = getEconomyEmbed(); break;
            case 'help_economy_advanced': embed = getEconomyAdvancedEmbed(); break;
            case 'help_games':            embed = getGamesEmbed(); break;
            case 'help_social':           embed = getSocialEmbed(); break;
            case 'help_moderation':       embed = getModerationEmbed(); break;
            case 'help_fun':              embed = getFunEmbed(); break;
            case 'help_info':             embed = getInfoEmbed(); break;
            case 'help_owner':
                if (!isOwner) {
                    return interaction.reply({ content: 'ما تگدر تشوف هالقسم، خاص بمالك البوت.', flags: MessageFlags.Ephemeral });
                }
                embed = getOwnerEmbed();
                break;
            case 'help_back':
                embed = buildMainEmbed(interaction.client.user);
                return interaction.update({ embeds: [embed], components: [buildSelectMenu(false, isOwner)] });
            default:
                return;
        }

        const backRow = buildSelectMenu(true, isOwner);
        await interaction.update({ embeds: [embed], components: [backRow] });
    }
};

// بناء الـ Embed الرئيسي

function buildMainEmbed(botUser) {
    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🤖 ${botUser?.username || 'البوت'} — دليل الأوامر الشامل`)
        .setThumbnail(botUser?.displayAvatarURL({ size: 256 }))
        .setDescription([
            '> هلا بيك، اختار القسم من القائمة حتى تشوف أوامره.',
            '',
            `تگدر تكتب الأمر ويا \`${config.prefix}\` أو تكتبه وحده.`,
            'الأوامر تشتغل بالعربي والإنجليزي، وبعضها بيه أزرار تساعدك.',
        ].join('\n'))
        .addFields(
            { name: '💰 الاقتصاد الأساسي',   value: 'رصيد، يومي، راتب، عمل، سرقة', inline: true },
            { name: '📈 الاقتصاد المتقدم',    value: 'شركة، بورصة، مزاد، عقارات', inline: true },
            { name: '💹 السوق الجديد',         value: 'سوق، تداول، محفظة، رسوم بيانية', inline: true },
            { name: '🎮 الألعاب',              value: 'تريفيا، اكس او، مشنقة', inline: true },
            { name: '🎰 الكازينو المتطور',     value: 'كازينو، سلوتس، كراش، رولت', inline: true },
            { name: '🎯 الألعاب المصغرة',      value: 'mini bomb، mini speed، mini chain', inline: true },
            { name: '👥 الاجتماعي',            value: 'زواج، كلان، أصدقاء', inline: true },
            { name: '🛡️ الإدارة',             value: 'طرد، باند، ميوت، سجن', inline: true },
            { name: '🎉 ترفيه',               value: 'حظك، ميم، سفينة، 8بول', inline: true },
            { name: '🏅 إنجازات جديدة',       value: 'انجازات، بروفايل، تحليلات', inline: true },
            { name: '📊 التحليلات',            value: 'احصائيات يومية، رسوم بيانية', inline: true },
            { name: '🏓 نظام بينج',            value: 'ping — تقرير الأداء المتكامل', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'اختار القسم اللي تريده من القائمة.' });
}

// بناء القائمة المنسدلة

function buildSelectMenu(withBack = false, isOwner = false) {
    const options = [];
    if (withBack) options.push({ label: '🏠 الرئيسية', value: 'help_back', emoji: '🏠' });

    options.push(
        { label: 'الاقتصاد الأساسي',  value: 'help_economy',          description: 'رصيد، يومي، عمل، سرقة...', emoji: '💰' },
        { label: 'الاقتصاد المتقدم',   value: 'help_economy_advanced', description: 'شركة، بورصة، عقارات، قروض...', emoji: '📈' },
        { label: 'الألعاب',            value: 'help_games',            description: 'تريفيا، اكس او، مقص ورقة...', emoji: '🎮' },
        { label: 'الاجتماعي',          value: 'help_social',           description: 'زواج، أصدقاء، كلانات...', emoji: '👥' },
        { label: 'الإدارة والمودريشن', value: 'help_moderation',       description: 'طرد، باند، ميوت، سجن...', emoji: '🛡️' },
        { label: 'ترفيه وفن',          value: 'help_fun',              description: 'حظك، ميم، سفينة، 8بول...', emoji: '🎉' },
        { label: 'معلومات عامة',        value: 'help_info',             description: 'عن البوت والإصدار', emoji: 'ℹ️' }
    );

    // قسم المالك — يظهر فقط للمالك
    if (isOwner) {
        options.push({ label: '👑 أوامر المالك الحصرية', value: 'help_owner', description: 'أوامر خاصة بمالك البوت', emoji: '👑' });
    }

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder('اختار القسم اللي تريد تشوفه...')
            .addOptions(options)
    );
}

// Embed كل قسم

function getEconomyEmbed() {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💰 الاقتصاد الأساسي')
        .setDescription('> أوامر فلوسك والبنك والتعاملات.')
        .addFields(
            { name: '📊 الرصيد', value: '`رصيد` أو `رصيد @user` — شوف رصيدك أو رصيد غيرك\n`لوحة` — تفاصيل اقتصادك\n`متصدرين` — شوف أصحاب أعلى رصيد' },
            { name: '🏦 البنك', value: '`ايداع <مبلغ|نصف|ربع|كامل>` — حط فلوس بالبنك\n`سحب <مبلغ|نصف|ربع|كامل>` — اسحب من البنك' },
            { name: '💼 الكسب', value: '`يومي` — مكافأتك اليومية والتتابع\n`راتب` — راتب الأسبوع\n`عمل` — اشتغل وخذ مكافأة' },
            { name: '💸 التحويل', value: '`تحويل @user <مبلغ>` — دز فلوس لعضو\n`سرقة @user` — جرّب حظك بالسرقة (فرصة النجاح 40%)' },
            { name: '🏪 المتجر', value: '`متجر` — شوف الأغراض واشترِ منها\n`مجمع` — اجمع أرباح ممتلكاتك' }
        )
        .setTimestamp();
}

function getEconomyAdvancedEmbed() {
    return new EmbedBuilder()
        .setColor('#27AE60')
        .setTitle('📈 الاقتصاد المتقدم')
        .setDescription('> استثمار وشركات وعقارات، لا تصرف فلوسك كلها بمكان واحد.')
        .addFields(
            { name: '🏢 الشركات', value: '`شركة` — أسّس شركة، وظّف واجمع الأرباح' },
            { name: '📉 البورصة', value: '`بورصة` — شوف الأسهم\n`استثمار <سهم> <مبلغ>` — اشتري أسهم\n`سحب_استثمار <سهم>` — بيع أسهمك' },
            { name: '🏡 العقارات', value: '`عقارات` — شوف عقاراتك ودبّرها' },
            { name: '💳 القروض', value: '`قرض` — قدّم على قرض أو شوف قرضك الحالي' },
            { name: '🏛️ المزادات', value: '`مزاد` — شوف المزادات وشارك بيها' },
            { name: '🛡️ التأمين', value: '`تامين` — أمّن رصيدك من السرقة' }
        )
        .setTimestamp();
}

function getGamesEmbed() {
    return new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🎮 الألعاب')
        .setDescription('> اختار لعبة، وإذا فزت يمكن تطلع بكم فلس.')
        .addFields(
            { name: '🧠 معلومات وتحديات', value: '`تريفيا` — جاوب أسئلة بمستويات مختلفة\n`فحش الكلمة` — خمن الكلمة المخفية\n`رياضيات` — حل مسائل حسابية\n`ذاكرة` — جرّب ذاكرتك' },
            { name: '❌⭕ ألعاب اثنين', value: '`اكس_او` — العب ضد عضو ثاني\n`حجر_ورقة_مقص` — تحدّى أحد' },
            { name: '📝 كلمات', value: '`مشنقة` — خمن الكلمة حرف حرف\n`scramble` — رتّب الحروف وطلّع الكلمة' },
            { name: '🏆 بطولات', value: '`بطولة` — سجّل وتنافس ويا باقي الأعضاء' },
            { name: '💰 الجوائز', value: 'بعض الألعاب بيها مكافأة إذا فزت.' }
        )
        .setTimestamp();
}

function getSocialEmbed() {
    return new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('👥 الاجتماعي')
        .setDescription('> أوامر تسهّل سوالفكم وتفاعلكم بالسيرفر.')
        .addFields(
            { name: '💍 الزواج', value: '`زوج @user` — دز طلب زواج\n`طلاق @user` — اطلب الطلاق (يحتاج موافقة)\n`خلع @user` — اطلب طلاق من طرف واحد\n`متزوجين` — شوف الأزواج بالسيرفر' },
            { name: '👥 الكلانات', value: '`كلان` — افتح لوحة الكلان وسوّي كلان أو ادعُ أعضاء' },
            { name: '👫 الأصدقاء', value: '`اصدقاء` — شوف قائمة أصدقائك' },
            { name: '🎂 المناسبات', value: '`عيد_ميلادي` — سجّل ميلادك وخذ مكافأة بوقتها' }
        )
        .setTimestamp();
}

function getModerationEmbed() {
    return new EmbedBuilder()
        .setColor('#95A5A6')
        .setTitle('🛡️ الإدارة والمودريشن')
        .setDescription('> هالأوامر للمشرفين وتحتاج صلاحيات مناسبة.')
        .addFields(
            { name: '⚙️ الإعداد', value: '`تفعيل` — جهّز الرتب\n`تفعيل سيرفر` — جهّز قنوات السيرفر\n`تكيف` — خلّي لقب البوت وصورته مثل السيرفر' },
            { name: '🔨 العقوبات', value: '`طرد @user` — طلّع عضو\n`باند @user` — احظره\n`ميوت @user <مدة>` — اكتمه\n`سجن @user <مدة>` — اسجنه\n`تنبيه @user <سبب>` — وجّهله إنذار' },
            { name: '🔓 رفع العقوبات', value: '`فك_ميوت @user` — شيل الكتم\n`فك_سجن @user` — طلّعه من السجن' },
            { name: '🔧 القناة', value: '`كلير <عدد>` — امسح رسائل\n`قفل` — اقفل القناة\n`فتح` — افتحها\n`نقل @user` — انقله لفويس ثاني' },
            { name: '📋 لوحة المشرف', value: '`بانل` — افتح لوحة الإدارة بالأزرار' }
        )
        .setTimestamp();
}

function getFunEmbed() {
    return new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('🎉 ترفيه وفن')
        .setDescription('> شوية أوامر تغيّر جو الشات.')
        .addFields(
            { name: '🔮 حظ وأسئلة', value: '`حظي` — شوف حظك اليوم\n`8بول <سؤال>` — اسأل الكرة الثامنة' },
            { name: '❤️ تفاعل', value: '`سفينة @user1 @user2` — شوف نسبة التوافق\n`ماذا_تفضل` — اختار بين سؤالين' },
            { name: '😂 ميم', value: '`ميم` — جيب ميم عشوائي' },
            { name: '🎲 نرد', value: '`نرد <أوجه>` — ارمي النرد' },
            { name: '💬 غيرها', value: '`حقيقة` — اسمع معلومة\n`say <نص>` — خلّي البوت يكتب النص' }
        )
        .setTimestamp();
}

function getInfoEmbed() {
    return new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('ℹ️ معلومات عامة')
        .setDescription('> شوية معلومات عن البوت.')
        .addFields(
            { name: '📦 الإصدار', value: 'v3.0.0', inline: true },
            { name: '🌐 اللغة', value: 'عربي', inline: true },
            { name: '⚡ البريفكس', value: `\`${config.prefix}\` أو اكتب الأمر وحده`, inline: true },
            { name: '🆕 الأنظمة الجديدة', value: [
                '> 📊 تحليلات النشاط',
                '> 🧠 شخصية تتغير حسب الجو',
                '> 🛡️ حماية ونقاط ثقة',
                '> ⚡ تخزين مؤقت للأداء',
                '> 🎰 ألعاب كازينو',
                '> 💹 سوق وأسهم',
                '> 🏅 إنجازات',
                '> 🎯 ألعاب سريعة',
            ].join('\n') },
            { name: '💡 نصائح', value: '• اكتب الأمر وحده أو ويا البريفكس (مثلاً: `يومي`)\n• بعض الأوامر بيها أزرار تفاعلية\n• تمنشن البوت إذا تريد تحچي وياه\n• اكتب `انجازات` حتى تشوف إنجازاتك' }
        )
        .setTimestamp();
}

function getOwnerEmbed() {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('👑 أوامر المالك الحصرية')
        .setDescription('> هالأوامر خاصة بمالك البوت.')
        .addFields(
            {
                name: '📊 لوحة التحكم',
                value: '`داشبورد` أو `هيلب` أو `help` — فتح لوحة التحكم عبر الخاص (DM)'
            },
            {
                name: '🎮 التحكم',
                value: [
                    '`!status <نوع> <نص>` — تغيير حالة البوت',
                    '`!servers` — قائمة السيرفرات مع روابط دعوة',
                    '`!broadcast <رسالة>` — إرسال رسالة لجميع السيرفرات',
                ].join('\n')
            },
            {
                name: '🔧 الإعدادات',
                value: [
                    '`!say <نص>` — إرسال رسالة باسم البوت',
                    'لوحة التحكم عبر DM تحتوي على:',
                    '• تبديل وضع الصيانة',
                    '• إحصائيات تفصيلية',
                    '• جميع الأوامر المحملة',
                ].join('\n')
            },
            {
                name: '⚙️ أنواع الحالة',
                value: '`play` • `watch` • `listen` • `compete`\nمثال: `!status يلعب مع المستخدمين`'
            }
        )
        .setFooter({ text: '👑 هذا القسم مخفي عن باقي المستخدمين' })
        .setTimestamp();
}
