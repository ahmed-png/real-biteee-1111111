'use strict';
const appLogger = require('../../utils/app-logger');

const { PermissionFlagsBits } = require('discord.js');
const ticketSystem = require('../../utils/ticket-system');

module.exports = {
    name: 'ticket-panel',
    aliases: ['تكت', 'التكت', 'تكت-اعداد', 'ticket-setup'],
    description: 'ينشئ أو يحدّث قناة لوحة الدعم الفني',
    usage: 'تكت',
    permissions: PermissionFlagsBits.ManageGuild,

    async execute(message) {
        if (!message.guild || !message.channel) return;

        const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
        const canManageGuild = message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
        if (!isAdmin && !canManageGuild) {
            return message.reply('❌ تحتاج صلاحية إدارة السيرفر حتى تجهّز نظام التذاكر.');
        }

        try {
            const result = await ticketSystem.setupTicketPanel(message.guild);
            await message.reply(
                `✅ صار نظام التذاكر جاهز.\nلوحة فتح التذكرة: ${result.panelChannel}\nقنوات التذاكر الخاصة: ${result.category}`
            );
        } catch (error) {
            appLogger.error(`[TicketSystem] Failed to set up tickets in guild ${message.guild.id}:`, error);
            await message.reply(`❌ ما كدرت أجهّز نظام التذاكر: ${error.message}`);
        }
    },
};
