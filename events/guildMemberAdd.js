const { Events } = require('discord.js');
const welcome = require('../utils/welcome');
const protection = require('../utils/protection');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');
const autoRole = require('../utils/auto-role');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // 1. فحص البوتات الجديدة
        if (member.user.bot) {
            await securityMonitor.checkSuspiciousBot(member);
            await autoRole.assignAutoRole(member);
            return; // البوتات لا تحتاج ترحيب
        }

        // 2. فحص عمر الحساب (anti-raid)
        const kicked = await protection.checkAccountAge(member);
        if (kicked) return;

        // 3. فحص الـ Anti-Raid العام
        const kickedByRaid = await protection.checkRaid(member);
        if (kickedByRaid) return;

        // 4. منح الرتبة التلقائية بعد اجتياز فحوصات الحماية
        await autoRole.assignAutoRole(member);

        // 5. ترحيب
        await welcome.sendWelcome(member);

        // 6. تسجيل
        await logger.logMemberJoin(member);
    },
};
