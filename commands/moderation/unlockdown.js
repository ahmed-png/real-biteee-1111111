'use strict';

const { PermissionFlagsBits } = require('discord.js');
const securityMonitor = require('../../utils/security-monitor');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'فك-الإغلاق',
    aliases: ['unlock-server', 'unlockdown', 'فك_الاغلاق'],
    description: 'يرفع الإغلاق الكامل عن السيرفر',
    permissions: PermissionFlagsBits.Administrator,

    async execute(message) {
        if (!message.guild) return;

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!isOwner(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هالأمر يحتاج صلاحية Administrator.');
        }

        const status = securityMonitor.getSystemStatus();
        if (!status.lockdownMode) {
            return message.reply('✅ السيرفر مو بوضع الإغلاق أصلاً!');
        }

        const msg = await message.reply('⏳ دا أرفع الإغلاق عن كل القنوات...');
        await securityMonitor.disableLockdown(message.guild, message.author);
        await msg.edit('✅ **انرفع الإغلاق!** كل القنوات رجعت لوضعها الطبيعي.');
    }
};
