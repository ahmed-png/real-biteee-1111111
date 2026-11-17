'use strict';

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// طلبات الزواج المعلقة
// المفتاح: msgId  { proposerId, targetId, cost, timestamp }
const pendingProposals = new Map();

const MARRIAGE_COST = 10_000;
const PROPOSAL_TIMEOUT = 60_000; // 60 ثانية

// تنظيف تلقائي للطلبات المنتهية
const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [msgId, data] of pendingProposals) {
        if (now - data.timestamp > PROPOSAL_TIMEOUT + 5000) {
            pendingProposals.delete(msgId);
        }
    }
}, 5 * 60 * 1000);
_cleanup.unref?.();

// بناء بطاقة الزواج
function buildMarriageCard(user, partner, since) {
    const days = Math.floor((Date.now() - since) / 86_400_000);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remDays = days % 30;

    const durationParts = [];
    if (years > 0) durationParts.push(`${years} سنة`);
    if (months > 0) durationParts.push(`${months} شهر`);
    durationParts.push(`${remDays} يوم`);
    const durationStr = durationParts.join(' و ') || 'أقل من يوم';

    const heartColor = days > 365 ? '#FF0080' : days > 30 ? '#FF69B4' : '#FFB6C1';

    return new EmbedBuilder()
        .setColor(heartColor)
        .setTitle('💍 بطاقة الزواج')
        .setDescription(
            [
                `> 💕 **${user.username}** × **${partner.username}**`,
                `> *قلوبكم متصلة، حسب كلام البطاقة 😄*`,
            ].join('\n')
        )
        .addFields(
            {
                name: '💒 تاريخ الزواج',
                value: `<t:${Math.floor(since / 1000)}:D>`,
                inline: true,
            },
            {
                name: '🗓️ شكد صارلكم',
                value: `**${durationStr}**`,
                inline: true,
            },
            {
                name: '❤️ ذكرى الزواج',
                value: `<t:${Math.floor(since / 1000) + 365 * 24 * 3600}:R>`,
                inline: true,
            }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setImage(partner.displayAvatarURL({ size: 512 }))
        .setFooter({ text: '💌 عقد زواج موثّق — استخدم طلاق إذا تريد تنهيه' })
        .setTimestamp(since);
}

// بناء embed طلب الزواج
function buildProposalEmbed(proposer, target) {
    return new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💍 طلب زواج')
        .setDescription(
            [
                `> 💌 ${proposer} دا يطلب إيد ${target}`,
                ``,
                `> 💰 الزواج يكلف: **${MARRIAGE_COST.toLocaleString()} ${config.currency}**`,
                `> ⏰ عندك **60 ثانية** ترد`,
            ].join('\n')
        )
        .setThumbnail(proposer.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${proposer.username} ينتظر جوابك، لا تخليه على أعصابه 😄` });
}

// الأمر الرئيسي
module.exports = {
    name: 'marry',
    aliases: ['زواج', 'خطوبة', 'تزوج'],
    description: 'دز طلب زواج لعضو ثاني',
    usage: 'زواج @شخص',

    async execute(message, args) {
        const proposer = message.author;
        const target = message.mentions.users.first();

        if (!target) {
            return message.reply(
                '❌ منشن الشخص اللي تريد تتقدمله.\n> مثال: `زواج @شخص`'
            );
        }
        if (target.id === proposer.id) {
            return message.reply('❌ ما تگدر تتقدم لنفسك!');
        }
        if (target.bot) {
            return message.reply('❌ ما تگدر تتقدم لبوت!');
        }

        const proposerData = db.getUserData(proposer.id);
        const targetData = db.getUserData(target.id);

        // فحص الزواج الحالي
        if (proposerData.marriedTo) {
            return message.reply('❌ إنت متزوج أصلاً! استخدم `طلاق` أول إذا تريد.');
        }
        if (targetData.marriedTo) {
            return message.reply(`❌ **${target.username}** متزوج/ة أصلاً.`);
        }

        // فحص الرصيد
        if ((proposerData.balance || 0) < MARRIAGE_COST) {
            return message.reply(
                `❌ رصيدك ما يكفي للزواج.\n` +
                `> تحتاج: **${MARRIAGE_COST.toLocaleString()} ${config.currency}**\n` +
                `> رصيدك هسه: **${(proposerData.balance || 0).toLocaleString()} ${config.currency}**`
            );
        }

        // إرسال طلب الزواج
        const embed = buildProposalEmbed(proposer, target);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`marry_accept_${proposer.id}_${target.id}`)
                .setLabel('💍 أوافق')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`marry_reject_${proposer.id}_${target.id}`)
                .setLabel('💔 ما أوافق')
                .setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({
            content: `${target}`,
            embeds: [embed],
            components: [row],
        });

        pendingProposals.set(msg.id, {
            proposerId: proposer.id,
            targetId: target.id,
            cost: MARRIAGE_COST,
            timestamp: Date.now(),
        });

        // انتهاء الوقت تلقائياً
        setTimeout(async () => {
            if (!pendingProposals.has(msg.id)) return;
            pendingProposals.delete(msg.id);

            const expiredEmbed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('⏰ خلص وقت الطلب')
                .setDescription(
                    `> **${target.username}** ما رد بالوقت المحدد.\n> تگدر تدز الطلب مرة ثانية بأي وقت.`
                );

            msg.edit({ embeds: [expiredEmbed], components: [], content: '' }).catch(() => {});
        }, PROPOSAL_TIMEOUT);
    },

    // معالج تفاعلات الأزرار
    async handleMarryInteraction(interaction) {
        const id = interaction.customId;

        // أزرار القبول/الرفض
        if (id.startsWith('marry_accept_') || id.startsWith('marry_reject_')) {
            const parts = id.split('_');
            const proposerId = parts[2];
            const targetId = parts[3];
            const isAccept = id.startsWith('marry_accept_');

            // التحقق: فقط المدعو يستطيع الرد
            if (interaction.user.id !== targetId) {
                return interaction.reply({
                    content: '❌ هالطلب مو إلك.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const msgId = interaction.message.id;
            pendingProposals.delete(msgId);

            // رفض
            if (!isAccept) {
                const rejectEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('💔 انرفض الطلب')
                    .setDescription(`> **${interaction.user.username}** ما وافق/ت على طلب الزواج.`)
                    .setTimestamp();
                return interaction.update({ embeds: [rejectEmbed], components: [], content: '' });
            }

            // قبول — فحوصات أخيرة
            const proposerData = db.getUserData(proposerId);
            const targetData = db.getUserData(targetId);

            if (proposerData.marriedTo) {
                return interaction.update({
                    content: '❌ المتقدم تزوج من شخص ثاني قبل شوي!',
                    embeds: [],
                    components: [],
                });
            }
            if (targetData.marriedTo) {
                return interaction.update({
                    content: '❌ إنت متزوج/ة أصلاً من شخص ثاني!',
                    embeds: [],
                    components: [],
                });
            }
            if ((proposerData.balance || 0) < MARRIAGE_COST) {
                return interaction.update({
                    content: '❌ رصيد المتقدم ما عاد يكفي حتى يكمل الزواج.',
                    embeds: [],
                    components: [],
                });
            }

            // تطبيق الزواج
            const now = Date.now();
            db.removeMoney(proposerId, MARRIAGE_COST);
            db.updateFields(proposerId, { marriedTo: targetId, marriedSince: now });
            db.updateFields(targetId, { marriedTo: proposerId, marriedSince: now });

            let proposerUser;
            try {
                proposerUser = await interaction.client.users.fetch(proposerId);
            } catch {
                proposerUser = { username: 'غير متاح', displayAvatarURL: () => '' };
            }

            const targetUser = interaction.user;

            const successEmbed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎊 مبروك — تم الزواج!')
                .setDescription(
                    [
                        `> 💕 **${proposerUser.username}** و **${targetUser.username}** — صرتوا متزوجين هسه`,
                        '',
                        `> 💰 كلفة الزواج: **${MARRIAGE_COST.toLocaleString()} ${config.currency}** (انخصمت)`,
                        `> 📅 تاريخ الزواج: <t:${Math.floor(now / 1000)}:D>`,
                    ].join('\n')
                )
                .setFooter({ text: '💌 استخدم زواجي حتى تشوف بطاقتكم' })
                .setTimestamp();

            const cardRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`married_card_${proposerId}_${targetId}`)
                    .setLabel('💍 عرض البطاقة')
                    .setStyle(ButtonStyle.Primary)
            );

            return interaction.update({
                content: '',
                embeds: [successEmbed],
                components: [cardRow],
            });
        }

        // زر عرض بطاقة الزواج
        if (id.startsWith('married_card_')) {
            const parts = id.split('_');
            const p1Id = parts[2];
            const p2Id = parts[3];

            // فقط أحد الزوجين يرى البطاقة
            if (interaction.user.id !== p1Id && interaction.user.id !== p2Id) {
                return interaction.reply({
                    content: '❌ بطاقة الزواج للزوجين بس.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const userData = db.getUserData(interaction.user.id);
            if (!userData.marriedTo) {
                return interaction.reply({
                    content: '❌ إنت مو متزوج هسه.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const partnerId = userData.marriedTo;
            try {
                const partner = await interaction.client.users.fetch(partnerId);
                const since = userData.marriedSince || Date.now();
                const card = buildMarriageCard(interaction.user, partner, since);
                return interaction.reply({ embeds: [card], flags: MessageFlags.Ephemeral });
            } catch {
                return interaction.reply({
                    content: '❌ ما گدرنا نلكه بيانات شريكك.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};
