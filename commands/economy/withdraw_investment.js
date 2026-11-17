const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

module.exports = {
    name: 'withdraw_investment',
    aliases: ['سحب_استثمار', 'wi'],
    description: 'اسحب رأس مال استثمارك',
    usage: '!سحب_استثمار',

    async execute(message, args) {
        const userData = db.getUserData(message.author.id);

        if (!userData.investment || userData.investment === 0) {
            return message.reply('❌ ما عندك استثمارات حتى تسحبها.');
        }

        const amount = userData.investment;
        userData.balance += amount;
        userData.investment = 0;

        db.updateUserData(message.author.id, userData);
        db.addTransaction(message.author.id, 'withdraw_investment', amount, 'سحب الاستثمار');

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📉 سحب الاستثمار')
            .setDescription(`✅ سحبت **${amount.toLocaleString()} ${config.currency}** من رأس مال استثمارك!`)
            .addFields(
                { name: '💰 المحفظة', value: `${userData.balance.toLocaleString()} ${config.currency}`, inline: true }
            )
            .setFooter({ text: 'على فكرة: الاستثمار لفترة أطول ممكن يجيب ربح أكثر!' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
