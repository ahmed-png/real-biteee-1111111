'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'divorce',
    aliases: ['طلاق', 'خلع', 'فراق'],
    description: 'طلّق شريكك الحالي',
    usage: 'طلاق',

    async execute(message) {
        const userId = message.author.id;
        const userData = db.getUserData(userId);

        // دعم الحقول القديمة والجديدة
        const partnerId = userData.marriedTo || userData.partner || null;

        if (!partnerId) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ إنت مو متزوج')
                        .setDescription(
                            '> ما عندك زواج حتى تنهيه.\n> استخدم `زواج @شخص` إذا تريد تتزوج.'
                        )
                        .setTimestamp(),
                ],
            });
        }

        const partnerUser = await message.client.users.fetch(partnerId).catch(() => null);
        const partnerName = partnerUser?.username ?? `مستخدم محذوف (${partnerId})`;

        // إحصائيات الزواج
        const since = userData.marriedSince || userData.marriageDate || null;
        const days = since ? Math.floor((Date.now() - since) / 86_400_000) : 0;

        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('💔 تأكيد الطلاق')
            .setDescription(
                [
                    `> متأكد تريد تطلّق **${partnerName}**؟`,
                    ``,
                    `> 🗓️ صارلكم متزوجين **${days} يوم**`,
                    `> ⚠️ هالقرار **ماكو رجعة بيه**.`,
                ].join('\n')
            )
            .setFooter({ text: '⏰ الطلب ينتهي بعد 30 ثانية' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`divorce_confirm_${userId}`)
                .setLabel('✅ إي، طلّق')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`divorce_cancel_${userId}`)
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        // فقط صاحب الأمر يستطيع التفاعل
        const filter = (i) => i.user.id === userId;

        let interaction;
        try {
            interaction = await confirmMsg.awaitMessageComponent({ filter, time: 30_000 });
        } catch {
            await confirmMsg
                .edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#95A5A6')
                            .setTitle('⏰ خلص الوقت')
                            .setDescription('> انلغى طلب الطلاق وحده.')
                            .setTimestamp(),
                    ],
                    components: [],
                })
                .catch(() => {});
            return;
        }

        await interaction.deferUpdate();

        // إلغاء
        if (interaction.customId.startsWith('divorce_cancel_')) {
            await confirmMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('❤️ تراجعت عن الطلاق')
                        .setDescription('> بعدكم متزوجين. خوش قرار 😄')
                        .setTimestamp(),
                ],
                components: [],
            });
            return;
        }

        // تنفيذ الطلاق — تنظيف الحقلين القديم والجديد
        db.updateFields(userId, {
            marriedTo: null,
            marriedSince: null,
            partner: null,
            marriageDate: null,
        });
        db.updateFields(partnerId, {
            marriedTo: null,
            marriedSince: null,
            partner: null,
            marriageDate: null,
        });

        await confirmMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('💔 صار الطلاق')
                    .setDescription(
                        [
                            `> انتهى الزواج بين **${message.author.username}** و **${partnerName}**.`,
                            `> بقيتوا متزوجين **${days} يوم**.`,
                            '',
                            `> 🕊️ نتمنالكم التوفيق الجاي.`,
                        ].join('\n')
                    )
                    .setTimestamp(),
            ],
            components: [],
        });
    },
};
