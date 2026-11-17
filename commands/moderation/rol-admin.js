const appLogger = require('../../utils/app-logger');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const adminMessages = [
    'هلا بيك بفريق الإدارة! 🎉 جهّز نفسك للصداع ومشاكل الأعضاء اللي ما تخلص.',
    'مبروك رتبة الأدمن! هسه تگدر تقرا سجل العقوبات طول اليوم 😅',
    'صرت أدمن. تذكّر: الصلاحيات تجيب وياها رغبة تحظر الكل... قاومها 😏',
    'صرت أدمن؟ عاشت إيدك. روح رتّب الشات، شكله محتاج شوية اهتمام 🧹',
    'مبروك! فزت بلقب "مراقب الأطفال" الرسمي للسيرفر 👶',
];

module.exports = {
    name: 'رول ادمن',
    aliases: ['rol-admin', 'admin-role', 'اعطي ادمن', 'اعطِ ادمن', 'add-admin'],
    description: 'يعطي رتبة الأدمن لعضو (مالك البوت بس)',
    usage: 'رول ادمن @user',

    async execute(message, args) {
        // فقط مالك البوت
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ هالأمر لمالك البوت بس.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ منشن العضو اللي تريد تعيّنه **👮 Admin**.\n`رول ادمن @user`');
        }

        if (target.id === message.author.id) {
            return message.reply('إنت المالك يا صاحبي، ما تحتاج أدمن 😄');
        }

        // البحث عن رتبة الأدمن (تقبل أي صيغة فيها كلمة admin أو ادمن أو أدمن)
        const adminRole = message.guild.roles.cache.find(r =>
            r.name.toLowerCase().includes('admin') ||
            r.name.includes('أدمن') ||
            r.name.includes('ادمن')
        );

        if (!adminRole) {
            return message.reply('❌ ما لگيت رتبة **Admin** بالسيرفر.\nتأكد أكو رتبة باسم بيها `admin` أو `ادمن`.');
        }

        try {
            await target.roles.add(adminRole);

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('👮 تعيين أدمن جديد')
                .setDescription(`تعيّن ${target} برتبة **${adminRole.name}**.`)
                .addFields(
                    { name: 'العضو', value: `${target} (${target.user.username})`, inline: true },
                    { name: 'الرتبة', value: `${adminRole}`, inline: true },
                    { name: 'عيّنه', value: `${message.author}`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // رسالة خاصة ساخرة للأدمن الجديد
            const dm = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('👮 ترقية إدارية — مبروك!')
                .setDescription(adminMessages[Math.floor(Math.random() * adminMessages.length)])
                .addFields({ name: 'الصلاحيات', value: 'طرد، حظر، وإدارة القنوات... والباقي بعدين 😏' })
                .setFooter({ text: 'بالتوفيق، راح تحتاجه 😅' });

            await target.send({ embeds: [dm] }).catch(() => {
                message.channel.send(`⚠️ ما كدرت أرسل رسالة خاصة لـ ${target} (الخاص مغلق)، بس صار أدمن.`);
            });

        } catch (error) {
            appLogger.error('[rol-admin error]:', error);
            return message.reply(`❌ ما كدرت أعطيه الرتبة.\n> تأكد إن رتبة البوت **أعلى** من **${adminRole.name}** بقائمة الرتب.`);
        }
    }
};
