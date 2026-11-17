const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'insurance',
    aliases: ['تأمين', 'تامين', 'حماية_بنكية'],
    description: 'نظام التأمين وحماية الفلوس',
    usage: 'تأمين [معلومات/اشتراك]',

    async execute(message, args) {
        const action = args[0]?.toLowerCase();
        const userData = db.getUserData(message.author.id);
        const now = Date.now();
        const cost = 1000;
        const duration = 30 * 24 * 60 * 60 * 1000;

        const hasActive = userData.insurance && userData.insurance.expiresAt > now;

        if (!action || action === 'info' || action === 'معلومات') {
            const embed = PremiumEmbedBuilder.custom({
                color: hasActive ? '#2ECC71' : '#E74C3C',
                title: '🛡️ مكتب التأمين',
                description: hasActive ? '✅ تأمينك مفعّل هسه.' : '❌ ما عندك تأمين فعّال.',
                fields: [
                    { name: 'سعر الباقة', value: `${cost.toLocaleString()} ${config.currency}`, inline: true },
                    { name: 'مدة الحماية', value: '30 يوم كاملة', inline: true },
                    { name: 'المزايا', value: '• حماية كاملة من السرقة\n• تعويض 50% إذا خسرت بالألعاب' }
                ]
            });

            if (hasActive) {
                const daysLeft = Math.ceil((userData.insurance.expiresAt - now) / (24 * 60 * 60 * 1000));
                embed.addFields({ name: 'باقي على التأمين', value: `ينتهي بعد ${daysLeft} يوم` });
            } else {
                embed.addFields({ name: '💡 اشترك هسه', value: 'اكتب `تأمين اشتراك` حتى تفعّل الحماية' });
            }

            return message.reply({ embeds: [embed] });
        }

        if (action === 'buy' || action === 'اشتراك' || action === 'تجديد') {
            if (hasActive) return message.reply('❌ تأمينك فعّال هسه! تگدر تجدده من ينتهي.');

            if (userData.balance < cost) {
                return message.reply(`❌ رصيدك ما يكفي! تحتاج **${cost.toLocaleString()}** ${config.currency}`);
            }

            userData.balance -= cost;
            userData.insurance = {
                active: true,
                boughtAt: now,
                expiresAt: now + duration
            };

            db.updateUserData(message.author.id, userData);

            return message.reply(`✅ تفعّل التأمين بنجاح لمدة 30 يوم! هسه فلوسك محمية من السرقة والنهب.`);
        }
    }
};
