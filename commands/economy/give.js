const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'give',
    aliases: ['اعطاء', 'اعطي', 'هبة'],
    description: 'إعطاء فلوس لشخص (للمطورين بس)',
    usage: 'اعطي @user <المبلغ>',

    async execute(message, args) {
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ هالأمر للمطورين بس.');
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ لازم تمنشن الشخص.');

        const amount = parseInt(args[1]);
        if (!amount || isNaN(amount)) return message.reply('❌ لازم تحدد مبلغ صحيح.');

        db.addMoney(target.id, amount);
        db.addTransaction(target.id, 'admin_give', amount, `هدية إدارية من ${message.author.username}`);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎁 هدية إدارية')
            .setDescription(`انضافت **${amount.toLocaleString()} ${config.currency}** إلى رصيد ${target}`)
            .addFields(
                { name: '💰 رصيده الجديد', value: `${db.getUserData(target.id).balance.toLocaleString()} ${config.currency}` }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
