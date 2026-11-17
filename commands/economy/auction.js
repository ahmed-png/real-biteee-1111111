'use strict';
const appLogger = require('../../utils/app-logger');

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const db = require('../../utils/database');
const config = require('../../config');
const dashboard = require('../../dashboard-server');

module.exports = {
    name: 'auction',
    aliases: ['مزاد'],
    description: 'زايد أو بيع ممتلكاتك الفخمة بالمزاد',
    usage: 'مزاد',

    async execute(message) {
        try {
            const user = message.author;
            const userData = db.getUserData(user.id);
            const balance = userData.balance || 0;

            const token = dashboard.generateWebToken(user);
            const auctionUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/auction?token=${token}`;

            const dmEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('⚖️ رابط مزادك الخاص')
                .setDescription('دزّيتلك رابط المزاد بالخاص حتى يبقى حسابك بأمان.\nتگدر تبيع ممتلكاتك أو تزايد على ممتلكات غيرك.')
                .addFields(
                    {
                        name: '💰 رصيدك بالمحفظة',
                        value: `**${balance.toLocaleString()}** ${config.currency}`,
                        inline: false
                    },
                    {
                        name: '🔒 تنبيه أمان',
                        value: 'هذا الرابط **إلك وحدك** — لا تدزّه لغيرك!\nينتهي بعد **30 دقيقة**.',
                        inline: false
                    }
                )
                .setImage('https://images.unsplash.com/photo-1534080556114-1e0e7cdbb6aa?q=80&w=800')
                .setFooter({ text: '⏱️ الرابط ينتهي بعد 30 دقيقة' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('🌐 افتح المزاد').setStyle(ButtonStyle.Link).setURL(auctionUrl)
            );

            try {
                // محاولة الإرسال بالخاص
                await user.send({ embeds: [dmEmbed], components: [row] });
                await message.reply('📬 دزّيتلك رابط المزاد **بالخاص** حتى نحافظ على أمان حسابك! شيّك رسائلك الخاصة.').catch(() => {});
            } catch {
                // المستخدم أغلق DMs — نرسل في الروم مع تحذير
                const publicEmbed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('⚖️ المزاد العلني')
                    .setDescription('تگدر تبيع ممتلكاتك أو تزايد على ممتلكات غيرك.')
                    .addFields(
                        {
                            name: '💰 رصيدك بالمحفظة',
                            value: `**${balance.toLocaleString()}** ${config.currency}`,
                            inline: false
                        },
                        {
                            name: '⚠️ تنبيه',
                            value: '🔒 ما گدرت أدزّ الرابط بالخاص — هالرابط إلك، **لا تدزّه لغيرك!**',
                            inline: false
                        }
                    )
                    .setFooter({ text: '⏱️ الرابط ينتهي بعد 30 دقيقة' })
                    .setTimestamp();

                await message.reply({ embeds: [publicEmbed], components: [row] });
            }

        } catch (err) {
            appLogger.error('[Auction Error]', err);
            message.reply('صار خطأ وإحنا نفتح المزاد.').catch(() => {});
        }
    }
};
