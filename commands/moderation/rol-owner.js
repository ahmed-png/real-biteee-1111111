const appLogger = require('../../utils/app-logger');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const ownerMessages = [
    'ها، منو صار الملك هالمرة؟ 👑 حاول لا تخرب السيرفر بأول خمس دقايق، اتفقنا؟',
    'مبروك يا صاحب الجلالة! 🙄 هسه عندك صلاحية الطرد والحظر، لا تتحمس هواية.',
    'صارت عندك رتبة أونر. إي، هسه صرت "مهم" هواية... لا تصدّگ نفسك 😏',
    'هسه صرت الأونر. تتوقع تصفيق؟ خلّصنا شغل وبعدين نحچي بالراتب 💸',
    'عاشت إيدنا، أونر جديد... كأن ما عدنا أوامر كفاية 🤷',
];

module.exports = {
    name: 'رول اونر',
    aliases: ['rol-owner', 'owner-role', 'اعطي اونر', 'اعطِ اونر', 'add-owner'],
    description: 'يعطي رتبة الأونر لعضو (مالك البوت بس)',
    usage: 'رول اونر @user',

    async execute(message, args) {
        // فقط مالك البوت
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ محاولة حلوة 😏 بس هالأمر لمالك البوت بس.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ منشن العضو اللي تريد تعيّنه **👑 Owner**.\n`رول اونر @user`');
        }

        if (target.id === message.author.id) {
            return message.reply('😂 تريد تعطي نفسك أونر؟ إنت المالك أصلاً!');
        }

        // البحث عن رتبة الأونر (تقبل أي صيغة فيها كلمة owner أو أونر)
        const ownerRole = message.guild.roles.cache.find(r =>
            r.name.toLowerCase().includes('owner') ||
            r.name.includes('أونر') ||
            r.name.includes('اونر')
        );

        if (!ownerRole) {
            return message.reply('❌ ما لگيت رتبة **Owner** بالسيرفر.\nتأكد أكو رتبة باسم بيها `owner` أو `أونر`.');
        }

        try {
            await target.roles.add(ownerRole);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 تعيين أونر جديد')
                .setDescription(`تعيّن ${target} برتبة **${ownerRole.name}**.`)
                .addFields(
                    { name: 'العضو', value: `${target} (${target.user.username})`, inline: true },
                    { name: 'الرتبة', value: `${ownerRole}`, inline: true },
                    { name: 'عيّنه', value: `${message.author}`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // رسالة خاصة ساخرة للعضو الجديد
            const dm = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 مبروك... يمكن؟')
                .setDescription(ownerMessages[Math.floor(Math.random() * ownerMessages.length)])
                .addFields({ name: 'الصلاحيات الجديدة', value: 'Administrator — بالتوفيق يا سيادة الملك 😏' })
                .setFooter({ text: 'رسالة تلقائية من البوت' });

            await target.send({ embeds: [dm] }).catch(() => {
                message.channel.send(`⚠️ ما كدرت أرسل رسالة خاصة لـ ${target} (الخاص مغلق)، بس الرتبة وصلت.`);
            });

        } catch (error) {
            appLogger.error('[rol-owner error]:', error);
            return message.reply(`❌ ما كدرت أعطيه الرتبة.\n> تأكد إن رتبة البوت **أعلى** من **${ownerRole.name}** بقائمة الرتب.`);
        }
    }
};
