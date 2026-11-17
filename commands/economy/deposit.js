const appLogger = require('../../utils/app-logger');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'deposit',
    aliases: ['ايداع', 'ادخر', 'dep'],
    description: 'حوّل فلوسك من المحفظة للبنك',
    usage: 'deposit <amount | all>',

    async execute(message, args) {
        try {
            const userData = db.getUserData(message.author.id);
            let amount;
            const input = (args[0] || '').toLowerCase();
            const bal = userData.balance || 0;

            if (input === 'all' || input === 'كل' || input === 'كامل') {
                amount = bal;
            } else if (input === 'half' || input === 'نصف') {
                amount = Math.floor(bal / 2);
            } else if (input === 'quarter' || input === 'ربع') {
                amount = Math.floor(bal / 4);
            } else if (input === 'third' || input === 'ثلث') {
                amount = Math.floor(bal / 3);
            } else {
                amount = Number(args[0]);
            }

            // حماية صارمة من الثغرات
            if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0 || amount % 1 !== 0) {
                return message.reply('❌ دخّل مبلغ صحيح! ما يصير كسور أو أرقام سالبة.');
            }
            if (bal < amount) return message.reply(`❌ رصيدك ما يكفي! بمحفظتك: **${bal.toLocaleString()}** ${config.currency}`);

            const newBalance = (userData.balance || 0) - amount;
            const newBank = (userData.bank || 0) + amount;

            db.updateFields(message.author.id, { balance: newBalance, bank: newBank });
            db.addTransaction(message.author.id, 'deposit', amount, 'إيداع بالبنك');

            const embed = PremiumEmbedBuilder.economy(
                '🏦 إيداع بالبنك',
                `حطّيت **${amount.toLocaleString()} ${config.currency}** بحسابك بالبنك.`,
                [
                    { name: '💰 المحفظة', value: `${newBalance.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '🏦 البنك', value: `${newBank.toLocaleString()} ${config.currency}`, inline: true }
                ]
            );

            message.reply({ embeds: [embed] });
        } catch (error) {
            appLogger.error('[deposit error]:', error);
            message.reply('❌ صار خطأ بأمر الإيداع.').catch(() => { });
        }
    }
};
