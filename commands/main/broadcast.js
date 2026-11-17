'use strict';

/**
 * 📢 أمر Broadcast — إرسال رسالة لجميع السيرفرات
 * للمالك فقط
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'broadcast',
    aliases: ['بث', 'اعلان_عام'],
    description: 'دز رسالة لكل السيرفرات (للمالك بس)',
    usage: 'broadcast <الرسالة>',

    async execute(message, args) {
        // فحص المالك
        if (message.author.id !== config.ownerId) {
            return; // تجاهل هادئ لغير المالك
        }

        if (!args || args.length === 0) {
            return message.reply([
                'صيغة الأمر مو صحيحة:',
                '`!broadcast <الرسالة>`',
                'أو: `!broadcast "عنوان" <الرسالة>`',
            ].join('\n'));
        }

        const fullText = args.join(' ');
        let title = 'رسالة من مالك البوت';
        let body = fullText;

        // دعم صيغة: !broadcast "العنوان" الرسالة
        const titleMatch = fullText.match(/^"([^"]+)"\s+(.+)/s);
        if (titleMatch) {
            title = titleMatch[1];
            body = titleMatch[2];
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`📢 ${title}`)
            .setDescription(body)
            .setAuthor({
                name: 'رسالة من مالك البوت',
                iconURL: message.author.displayAvatarURL()
            })
            .setTimestamp();

        const guilds = message.client.guilds.cache;
        let sent = 0;
        let failed = 0;

        const statusMsg = await message.reply(`دا أرسل الرسالة لـ **${guilds.size}** سيرفر...`);

        for (const [, guild] of guilds) {
            try {
                const channel = guild.channels.cache.find(ch =>
                    ch.type === 0 &&
                    ch.permissionsFor(guild.members.me)?.has('SendMessages')
                );
                if (channel) {
                    await channel.send({ embeds: [embed] });
                    sent++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }

            // تأخير صغير لتجنب Rate Limit
            await new Promise(r => setTimeout(r, 100));
        }

        await statusMsg.edit([
            `خلص الإرسال.`,
            `وصلت لـ **${sent}** سيرفر`,
            `ما وصلت لـ **${failed}** سيرفر`,
            `المجموع: **${guilds.size}** سيرفر`,
        ].join('\n'));
    }
};
