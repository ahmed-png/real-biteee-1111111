const appLogger = require('../../utils/app-logger');
const db = require('../../utils/database');
const config = require('../../config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'withdraw',
    aliases: ['سحب', 'تسحب', 'with', 'wd', 'سحب_بنك'],
    description: 'اسحب فلوسك من البنك للمحفظة',
    usage: 'سحب <مبلغ | كامل | نصف | ربع>',

    async execute(context, args) {
        try {
            const userId = context.user?.id ?? context.author?.id;
            if (!userId) return;

            const userData = db.getUserData(userId);
            const bankBal = userData.bank || 0;

            if (!args || args.length === 0) {
                return context.reply(
                    bankBal <= 0
                        ? '❌ حساب البنك فارغ! أودع بيه أولاً.'
                        : `❌ طريقة الاستخدام: \`سحب <مبلغ | كامل | نصف | ربع>\`\n🏦 بالبنك: **${bankBal.toLocaleString()}** ${config.currency}`
                );
            }

            const input = String(args[0]).toLowerCase().trim();

            let amount;
            if (['كامل', 'كل', 'كلها', 'all'].includes(input)) amount = bankBal;
            else if (['نصف', 'half'].includes(input)) amount = Math.floor(bankBal / 2);
            else if (['ربع', 'quarter'].includes(input)) amount = Math.floor(bankBal / 4);
            else if (['ثلث', 'third'].includes(input)) amount = Math.floor(bankBal / 3);
            else amount = Number(input.replace(/,/g, ''));

            // حماية صارمة من الثغرات
            if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0 || amount % 1 !== 0) {
                return context.reply('❌ دخّل مبلغ صحيح! ما يصير كسور أو أرقام سالبة.');
            }
            if (amount > bankBal)
                return context.reply(`❌ بالبنك بس **${bankBal.toLocaleString()}** ${config.currency}!`);

            const newBank = bankBal - amount;
            const newBalance = (userData.balance || 0) + amount;

            db.updateFields(userId, { balance: newBalance, bank: newBank });
            db.addTransaction(userId, 'withdraw', amount, 'سحب من البنك');

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('💸 سحب فلوس')
                .setDescription(`سحبت **${amount.toLocaleString()} ${config.currency}** من البنك لمحفظتك. ✅`)
                .addFields(
                    { name: '💰 المحفظة', value: `${newBalance.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '🏦 البنك', value: `${newBank.toLocaleString()} ${config.currency}`, inline: true }
                )
                .setTimestamp();

            context.reply({ embeds: [embed] });
        } catch (error) {
            appLogger.error('[withdraw error]:', error);
            context.reply('❌ صار خطأ وإحنا نسحب الفلوس.').catch(() => { });
        }
    }
};
