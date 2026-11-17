'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'loan',
    aliases: ['قرض', 'تسلف', 'سلفة'],
    description: 'خذ قرض من البنك وسدده بوقته',
    usage: 'قرض [معلومات/اقتراض <مبلغ>/سداد <مبلغ|كل>]',

    async execute(message, args) {
        const action = args[0]?.toLowerCase();
        const userData = db.getUserData(message.author.id);
        const maxLoan = config.maxLoan || 50000;

        // عرض المعلومات
        if (!action || action === 'info' || action === 'معلومات') {
            const loanInfo = userData.loan;

            if (!loanInfo || !loanInfo.amount || loanInfo.amount <= 0) {
                const embed = PremiumEmbedBuilder.info(
                    '💳 نظام القروض',
                    'خذ فلوس من البنك، بس لا تنسى ترجعها!',
                    [
                        { name: '📊 الحد الأعلى', value: `${maxLoan.toLocaleString()} ${config.currency}`, inline: true },
                        { name: '📈 الفائدة', value: '5% على المبلغ (ثابتة)', inline: true },
                        { name: '⏰ آخر مهلة', value: '30 يوم', inline: true },
                        { name: '⚠️ غرامة التأخير', value: 'غرامة تلقائية 2% باليوم', inline: true },
                    ]
                );

                embed.addFields({
                    name: '💡 الأوامر',
                    value: '`قرض اقتراض <مبلغ>`\n`قرض سداد <مبلغ/كل>`\n`قرض معلومات`'
                });

                return message.reply({ embeds: [embed] });
            }

            // إذا كان هناك قرض نشط
            const now = Date.now();
            const daysElapsed = Math.floor((now - (loanInfo.takenAt || now)) / 86400000);
            const daysLeft = Math.max(0, Math.ceil((loanInfo.dueDate - now) / 86400000));

            // حساب الفائدة البسيطة (5% على المبلغ الأصلي)
            const interest = Math.floor(loanInfo.originalAmount * 0.05);
            const totalDue = loanInfo.originalAmount + interest;
            const remaining = Math.max(0, loanInfo.amount);

            const embed = daysLeft <= 3
                ? PremiumEmbedBuilder.error('⚠️ تنبيه: باقي شوي وينتهي القرض!', null, [])
                : PremiumEmbedBuilder.warning('💳 قرضك الحالي', null, []);

            embed.addFields(
                { name: '💵 القرض الأصلي', value: `${loanInfo.originalAmount.toLocaleString()} ${config.currency}`, inline: true },
                { name: '📈 الفائدة (5%)', value: `${interest.toLocaleString()} ${config.currency}`, inline: true },
                { name: '💰 الباقي عليك', value: `${remaining.toLocaleString()} ${config.currency}`, inline: true },
                { name: '📅 الأيام اللي مرّت', value: `${daysElapsed} يوم`, inline: true },
                { name: '⏰ الأيام الباقية', value: daysLeft > 0 ? `${daysLeft} يوم` : '🔴 **خلصت المهلة!**', inline: true },
                { name: '⚖️ كل الدين', value: `${totalDue.toLocaleString()} ${config.currency}`, inline: true }
            );

            return message.reply({ embeds: [embed] });
        }

        // اقتراض
        if (action === 'borrow' || action === 'اقتراض' || action === 'اخذ') {
            // فحص: هل هناك قرض نشط
            if (userData.loan && userData.loan.amount > 0) {
                return message.reply('❌ عندك قرض بعده مفتوح! سدده قبل لا تاخذ قرض ثاني.\n✏️ اكتب `قرض معلومات` حتى تشوف تفاصيل قرضك.');
            }

            const amount = parseInt(args[1]?.replace(/,/g, ''));

            if (!amount || isNaN(amount) || amount <= 0) {
                return message.reply(`❌ لازم تحدد مبلغ صحيح.\nمثال: \`قرض اقتراض 10000\``);
            }

            if (amount < 100) {
                return message.reply(`❌ أقل مبلغ للقرض هو **100** ${config.currency}.`);
            }

            if (amount > maxLoan) {
                return message.reply(`❌ أعلى مبلغ للقرض هو **${maxLoan.toLocaleString()}** ${config.currency}.`);
            }

            // فحص: لا يمكن اقتراض أكثر من 3 أضعاف رصيده الحالي (منع الاستغلال)
            const currentWealth = (userData.balance || 0) + (userData.bank || 0);
            if (currentWealth === 0 && amount > 5000) {
                return message.reply(`❌ ما تگدر تاخذ أكثر من **5,000** ${config.currency} ببداية مشوارك.`);
            }

            const interest = Math.floor(amount * 0.05);
            const totalDue = amount + interest;

            db.updateFields(message.author.id, {
                balance: (userData.balance || 0) + amount,
                loan: {
                    amount: totalDue,        // المبلغ الكامل مع الفائدة
                    originalAmount: amount,
                    dueDate: Date.now() + 30 * 86400000,
                    takenAt: Date.now()
                }
            });
            db.addTransaction(message.author.id, 'loan_borrow', amount, `قرض: ${amount} + ${interest} فائدة`);

            const embed = PremiumEmbedBuilder.success(
                '💸 نزل القرض!',
                `انضاف **${amount.toLocaleString()} ${config.currency}** لمحفظتك.`,
                [
                    { name: '💵 القرض', value: `${amount.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '📈 الفائدة (5%)', value: `${interest.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '⚖️ المبلغ الكلي للسداد', value: `${totalDue.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '📅 موعد السداد', value: 'خلال 30 يوم', inline: true },
                    { name: '⚠️ تنبيه', value: 'التأخير يضيف عليك 2% باليوم!', inline: false }
                ]
            );

            return message.reply({ embeds: [embed] });
        }

        // سداد
        if (action === 'pay' || action === 'سداد' || action === 'رجع' || action === 'ادفع') {
            if (!userData.loan || !userData.loan.amount || userData.loan.amount <= 0) {
                return message.reply('✅ ما عليك قروض!');
            }

            const payAll = ['all', 'كل', 'كامل', 'الكل'].includes(args[1]?.toLowerCase());
            const payAmount = payAll
                ? Math.min(userData.loan.amount, userData.balance || 0)
                : parseInt(args[1]?.replace(/,/g, ''));

            if (!payAll && (isNaN(payAmount) || payAmount <= 0)) {
                return message.reply('❌ لازم تحدد مبلغ سداد صحيح.\nمثال: `قرض سداد 5000` أو `قرض سداد كل`');
            }

            if ((userData.balance || 0) < payAmount) {
                return message.reply(`❌ رصيدك **${(userData.balance || 0).toLocaleString()}** ما يكفي تسدد **${payAmount.toLocaleString()}** ${config.currency}!`);
            }

            const remaining = userData.loan.amount - payAmount;
            const updates = {
                balance: (userData.balance || 0) - payAmount,
            };

            if (remaining <= 0) {
                updates.loan = null;
                db.updateFields(message.author.id, updates);
                db.addTransaction(message.author.id, 'loan_pay', payAmount, 'سداد القرض بالكامل');
                return message.reply(`✅ **سددت القرض كله!** 🎉\nرصيدك هسه: **${updates.balance.toLocaleString()}** ${config.currency}`);
            }

            updates.loan = { ...userData.loan, amount: remaining };
            db.updateFields(message.author.id, updates);
            db.addTransaction(message.author.id, 'loan_pay', payAmount, `سداد جزئي للقرض: باقي ${remaining}`);
            return message.reply(`✅ سددت **${payAmount.toLocaleString()}** ${config.currency}.\n💳 باقي عليك: **${remaining.toLocaleString()}** ${config.currency}`);
        }

        // أمر غير معروف
        return message.reply('❓ تگدر تستخدم هالأوامر:\n`قرض معلومات` | `قرض اقتراض <مبلغ>` | `قرض سداد <مبلغ/كل>`');
    }
};
