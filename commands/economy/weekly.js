const appLogger = require('../../utils/app-logger');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

module.exports = {
    name: 'weekly',
    aliases: ['اسبوعي', 'أسبوعي', 'راتب'],
    description: 'خذ راتبك الأسبوعي',
    usage: 'راتب',

    async execute(message) {
        try {
            const userData = db.getUserData(message.author.id);
            const now = Date.now();
            const cooldown = 7 * 24 * 60 * 60 * 1000;

            if (userData.lastWeekly && (now - userData.lastWeekly) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWeekly);
                const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
                const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

                return message.reply(`⏰ تگدر تاخذ راتبك الأسبوعي بعد **${days} يوم و ${hours} ساعة**!`);
            }

            let weeklyAmount = config.weeklyPayAmount || 2000;

            if (userData.inventory && userData.inventory['multiplier'] && userData.inventory['multiplier'].expiresAt > now) {
                weeklyAmount = Math.floor(weeklyAmount * 1.5);
            }

            db.updateFields(message.author.id, {
                balance: (userData.balance || 0) + weeklyAmount,
                lastWeekly: now
            });

            db.addTransaction(message.author.id, 'weekly', weeklyAmount, 'راتب أسبوعي');
            levels.addXP(message.author.id, 20, message);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💼 راتبك الأسبوعي!')
                .setDescription(`انضاف **${weeklyAmount.toLocaleString()} ${config.currency}** لمحفظتك!`)
                .addFields(
                    { name: '💰 رصيدك الحالي', value: `${((userData.balance || 0) + weeklyAmount).toLocaleString()} ${config.currency}` }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            appLogger.error('[weekly error]:', error);
            message.reply('❌ صار خطأ بأمر الراتب الأسبوعي.').catch(() => { });
        }
    }
};
