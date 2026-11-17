'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { hasPermOrOwner } = require('../../utils/permissions');

module.exports = {
    name: 'warnings',
    aliases: ['تحذيرات', 'انذارات'],
    description: 'يعرض تحذيرات عضو وتگدر تشيلها',
    usage: 'تحذيرات @user',
    
    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ما عندك صلاحية تعرض التحذيرات أو تديرها.');
        }

        const target = message.mentions.users.first();
        if (!target) {
            return message.reply('❌ منشن العضو حتى أعرض تحذيراته.\nمثال: `تحذيرات @شخص`');
        }

        const userData = db.getUserData(target.id);
        const warnings = userData.warnings || 0;
        const warnLogs = userData.warnLogs || [];

        if (warnings === 0 || warnLogs.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ سجله نظيف')
                        .setDescription(`> العضو ${target} ما عليه أي تحذير.`)
                        .setTimestamp()
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`⚠️ تحذيرات ${target.username}`)
            .setDescription(`> مجموع التحذيرات: **${warnings}**\n\n**تفاصيل التحذيرات:**`)
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        warnLogs.forEach((log, index) => {
            const dateStr = log.date ? `<t:${Math.floor(log.date / 1000)}:R>` : 'التاريخ مو معروف';
            embed.addFields({
                name: `التحذير رقم ${index + 1}`,
                value: `> 📝 **السبب:** ${log.reason}\n> 👮 **المسؤول:** <@${log.author}>\n> 📅 **التاريخ:** ${dateStr}`,
                inline: false
            });
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`clear_warns_${target.id}_${message.author.id}`)
                .setLabel('🗑️ شيل كل التحذيرات')
                .setStyle(ButtonStyle.Danger)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
