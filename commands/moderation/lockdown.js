'use strict';

const { PermissionFlagsBits } = require('discord.js');
const securityMonitor = require('../../utils/security-monitor');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'إغلاق-السيرفر',
    aliases: ['lockdown', 'lockserver', 'اغلاق_السيرفر'],
    description: 'يفعّل الإغلاق الكامل ويقفل كل القنوات فوراً',
    permissions: PermissionFlagsBits.Administrator,

    async execute(message, args) {
        if (!message.guild) return;

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!isOwner(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هالأمر يحتاج صلاحية Administrator.');
        }

        const status = securityMonitor.getSystemStatus();
        if (status.lockdownMode) {
            return message.reply('⚠️ السيرفر أصلاً بوضع الإغلاق. استخدم `!فك-الإغلاق` حتى ترفعه.');
        }

        const reason = args.join(' ') || 'إغلاق يدوي من الإدارة';
        const msg = await message.reply(`🔒 **دا أقفل السيرفر...** | السبب: ${reason}`);
        const count = await securityMonitor.enableLockdown(message.guild, reason);
        await msg.edit(`🔒 **السيرفر انقفل!** انقفلت ${count} قناة. استخدم \`!فك-الإغلاق\` حتى ترجعها.`);
    }
};
