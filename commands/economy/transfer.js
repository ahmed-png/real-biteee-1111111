const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'transfer',
    aliases: ['تحويل', 'حول', 'اعط', 'send', 'pay'],
    description: 'حوّل فلوس من محفظتك لشخص ثاني',
    usage: 'transfer @user <amount>',

    async execute(message, args) {
        const target = message.mentions.users.first();
        let amount = Number(args.find(arg => !arg.includes('<@')));

        if (!target) {
            return message.reply(`❌ طريقة الاستخدام: \`${config.prefix}transfer @user <amount>\``);
        }

        // حماية صارمة من الثغرات
        if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0 || amount % 1 !== 0) {
            return message.reply('❌ دخّل مبلغ صحيح! ما يصير كسور أو أرقام سالبة.');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ ما تگدر تحوّل لنفسك.');
        }

        const userData = db.getUserData(message.author.id);
        if (userData.balance < amount) {
            return message.reply(`❌ رصيدك ما يكفي! عندك بس **${userData.balance.toLocaleString()} ${config.currency}**.`);
        }

        // تحريك الأموال
        db.removeMoney(message.author.id, amount);
        db.addMoney(target.id, amount);

        const embed = PremiumEmbedBuilder.success(
            '✅ حوّلت بنجاح!',
            `${message.author} حوّل **${amount.toLocaleString()} ${config.currency}** إلى ${target}.`,
            [{ name: '💰 الباقي برصيدك', value: `${(userData.balance - amount).toLocaleString()} ${config.currency}` }]
        );

        message.reply({ embeds: [embed] });
    }
};
