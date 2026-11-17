const appLogger = require('../../utils/app-logger');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

// رسائل ساخرة للأونر
const ownerMessages = [
    "ها، منو صار الملك هالمرة؟ 👑 حاول لا تخرب السيرفر بأول خمس دقايق، اتفقنا؟",
    "مبروك يا صاحب الجلالة! 🙄 هسه عندك صلاحية الطرد والحظر، لا تتحمس هواية.",
    "صارت عندك رتبة أونر. إي، هسه صرت \"مهم\" هواية... لا تصدّگ نفسك 😏",
    "هسه صرت الأونر. تتوقع تصفيق؟ خلّصنا شغل وبعدين نحچي بالراتب 💸",
    "عاشت إيدنا، أونر جديد... كأن ما عدنا أوامر كفاية 🤷"
];

// رسائل ساخرة للأدمن
const adminMessages = [
    "هلا بيك بفريق الإدارة! 🎉 جهّز نفسك للصداع ومشاكل الأعضاء اللي ما تخلص.",
    "مبروك رتبة الأدمن! هسه تگدر تقرا سجل العقوبات طول اليوم 😅",
    "صرت أدمن. تذكّر: الصلاحيات تجيب وياها رغبة تحظر الكل... قاومها 😏",
    "صرت أدمن؟ عاشت إيدك. روح رتّب الشات، شكله محتاج شوية اهتمام 🧹",
    "مبروك! فزت بلقب \"مراقب الأطفال\" الرسمي للسيرفر 👶"
];

async function giveOwner(message, args) {
    // التحقق من أن المستخدم هو مالك البوت (config.ownerId)
    if (message.author.id !== config.ownerId) {
        return message.reply('❌ محاولة حلوة 😏 بس هالأمر لمالك البوت بس.');
    }

    const target = message.mentions.members.first();
    if (!target) {
        return message.reply('❌ منشن العضو اللي تريد تعيّنه أونر.');
    }

    const ownerRole = message.guild.roles.cache.find(r => r.name === '👑 Owner' || r.name.toLowerCase() === 'owner');
    if (!ownerRole) {
        return message.reply('❌ رتبة **👑 Owner** مو موجودة. تأكد إن اسمها مطابق بالضبط.');
    }

    try {
        await target.roles.add(ownerRole);
        message.reply(`✅ تعيّن ${target} **👑 Owner**! الله يستر 😏`);
    } catch (error) {
        appLogger.error('Error adding Owner role:', error);
        return message.reply('❌ ما كدرت أعطيه الرتبة. تأكد إن رتبة البوت أعلى من **👑 Owner**.');
    }

    // إرسال رسالة خاصة ساخرة
    const randomMsg = ownerMessages[Math.floor(Math.random() * ownerMessages.length)];
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👑 مبروك... يمكن؟')
            .setDescription(randomMsg)
            .addFields({ name: 'الصلاحيات', value: 'تقريباً كلشي (Administrator)' })
            .setFooter({ text: 'رسالة تلقائية من البوت اللي يمزح وياك' });

        await target.send({ embeds: [dmEmbed] });
    } catch (e) {
        message.channel.send(`⚠️ ما كدرت أرسل رسالة خاصة لـ ${target} (يمكن الخاص مغلق)، بس الرتبة وصلت.`);
    }
}

async function giveAdmin(message, args) {
    // التحقق من أن المستخدم هو مالك البوت
    if (message.author.id !== config.ownerId) {
        return message.reply('❌ هالأمر لمالك البوت بس.');
    }

    const target = message.mentions.members.first();
    if (!target) {
        return message.reply('❌ منشن العضو الجديد بالإدارة... مو الضحية طبعاً 😅');
    }

    const adminRole = message.guild.roles.cache.find(r => r.name === '👮 Admin' || r.name.toLowerCase() === 'admin');
    if (!adminRole) {
        return message.reply('❌ رتبة **👮 Admin** مو موجودة. تأكد إن اسمها مطابق بالضبط.');
    }

    try {
        await target.roles.add(adminRole);
        message.reply(`✅ تعيّن ${target} **👮 Admin**! جهّزوا المسكّنات 😅`);
    } catch (error) {
        appLogger.error('Error adding Admin role:', error);
        return message.reply('❌ ما كدرت أعطيه الرتبة. تأكد إن رتبة البوت أعلى من **👮 Admin**.');
    }

    // إرسال رسالة خاصة ساخرة
    const randomMsg = adminMessages[Math.floor(Math.random() * adminMessages.length)];
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('👮 ترقية إدارية')
            .setDescription(randomMsg)
            .addFields({ name: 'الصلاحيات', value: 'طرد، حظر، وإدارة قنوات... والباقي بعدين 😏' })
            .setFooter({ text: 'بالتوفيق، راح تحتاجه 😅' });

        await target.send({ embeds: [dmEmbed] });
    } catch (e) {
        message.channel.send(`⚠️ ما كدرت أرسل رسالة خاصة لـ ${target}، بس صار أدمن.`);
    }
}

module.exports = {
    // واجهة الأمر المطلوبة من commandHandler
    name: 'admin-roles',
    aliases: ['رول-ادمن', 'رول-اونر'],
    description: 'يعطي رتبة Owner أو Admin لعضو (مالك البوت بس)',
    usage: 'admin-roles [owner/admin] @user',

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'owner' || sub === 'اونر') return giveOwner(message, args.slice(1));
        if (sub === 'admin' || sub === 'ادمن') return giveAdmin(message, args.slice(1));
        return message.reply('❌ الاستخدام: `admin-roles owner @user` أو `admin-roles admin @user`');
    },

    // export الدوال للاستخدام المباشر
    giveOwner,
    giveAdmin,
};
