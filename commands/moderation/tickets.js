'use strict';

const { PermissionFlagsBits } = require('discord.js');
const ticketSystem = require('../../utils/ticket-system');

module.exports = {
    name: 'ticket-panel',
    aliases: ['تكت', 'التكت', 'تكت-اعداد', 'ticket-setup'],
    description: 'إنشاء أو تحديث لوحة الدعم الفني في القناة الحالية',
    usage: 'تكت',
    permissions: PermissionFlagsBits.ManageGuild,

    async execute(message) {
        if (!message.guild || !message.channel) return;

        const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
        const canManageGuild = message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
        if (!isAdmin && !canManageGuild) {
            return message.reply('❌ تحتاج إلى صلاحية إدارة السيرفر لإعداد نظام التكت.');
        }

        try {
            const result = await ticketSystem.setupTicketPanel(message.guild, message.channel);
            await message.reply(
                `✅ تم إعداد نظام التكت. أُرسلت لوحة فتح التكت في ${message.channel}، وستُنشأ التكتات داخل ${result.category}.`
            );
        } catch (error) {
            console.error(`[TicketSystem] Failed to set up tickets in guild ${message.guild.id}:`, error);
            await message.reply(`❌ تعذر إعداد نظام التكت: ${error.message}`);
        }
    },
};
