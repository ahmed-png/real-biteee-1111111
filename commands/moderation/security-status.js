'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');
const securityMonitor = require('../../utils/security-monitor');

module.exports = {
    name: 'security-status',
    aliases: ['أمان', 'حماية-حالة', 'security', 'security-log'],
    description: 'يعرض وضع أنظمة الحماية وآخر الحوادث الأمنية',
    permissions: PermissionFlagsBits.ManageGuild,

    async execute(message, args) {
        if (!message.guild) return;

        // التحكم: تفعيل/تعطيل نظام معين
        if (args[0] === 'toggle' && args[1]) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ هالأمر يحتاج صلاحية Administrator.');
            }
            const systemName = args[1].toLowerCase();
            const setTo = args[2] !== 'off';
            const done = securityMonitor.toggleSystem(systemName, setTo);
            if (done) {
                return message.reply(`✅ نظام \`${systemName}\` ${setTo ? 'اشتغل ✅' : 'انطفى ❌'}`);
            }
            return message.reply(`❌ ماكو نظام باسم \`${systemName}\`. الأنظمة المتوفرة: antiNuke, antiPhishing, antiTokenSniff, antiAdminAbuse, antiMassDM, antiBotAbuse`);
        }

        // عرض الحالة العامة
        const status = securityMonitor.getSystemStatus();
        const incidents = securityMonitor.getIncidentLog(message.guild.id, 5);

        const systemsField = [
            `${PremiumEmbedBuilder.statusEmoji(status.antiNuke)} — **Anti-Nuke** (منع تخريب السيرفر)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiPhishing)} — **Anti-Phishing** (منع روابط الاحتيال)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiTokenSniff)} — **Token Guard** (حماية الرموز)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiAdminAbuse)} — **Admin Guard** (منع إساءة الصلاحيات)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiMassDM)} — **Mass DM** (منع الرسائل الخاصة المزعجة)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiBotAbuse)} — **Bot Verifier** (فحص البوتات المشبوهة)`,
            `🛡️ — **خصوصية القنوات** (خصوصية القنوات والسجلات: **شغّالة 🔒**)`,
            `${status.lockdownMode ? '🔒 **الإغلاق شغّال!**' : '🟢 **ماكو إغلاق**'}`,
        ].join('\n');

        const incidentsField = incidents.length > 0
            ? incidents.map(i => {
                const timeAgo = Math.floor((Date.now() - i.time) / 60000);
                return `\`${i.type}\` — <@${i.userId}> — منذ ${timeAgo} دقيقة`;
            }).join('\n')
            : '✅ ماكو حوادث جديدة';

        const totalNuke = incidents.filter(i => i.type === 'Anti-Nuke').length;
        const totalPhish = incidents.filter(i => i.type === 'Phishing').length;
        const totalToken = incidents.filter(i => i.type === 'TokenSniff').length;

        const embed = new EmbedBuilder()
            .setColor(status.lockdownMode ? '#FF0000' : '#00FF7F')
            .setTitle('🛡️ مراقبة أمان السيرفر — Security Monitor v2.0')
            .setDescription('مراقبة مستمرة 24/7 — نكشف التهديدات ونتعامل وياها فوراً.')
            .addFields(
                {
                    name: '⚙️ وضع الأنظمة',
                    value: systemsField,
                    inline: false
                },
                {
                    name: '📊 الأرقام (آخر 50 حادثة)',
                    value: [
                        `🚨 Anti-Nuke: **${totalNuke}** حادثة`,
                        `🎣 Phishing: **${totalPhish}** حادثة`,
                        `🔑 Token Sniff: **${totalToken}** حادثة`,
                        `📌 المجموع: **${incidents.length}** حادثة مسجّلة`,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📋 آخر الحوادث',
                    value: incidentsField,
                    inline: false
                }
            )
            .addFields({
                name: '🔧 التحكم',
                value: [
                    '`!أمان toggle <system> off/on` — تشغيل/إطفاء نظام',
                    '`!أمان toggle antiNuke off` — مثال لإطفاء Anti-Nuke',
                    '`!فك-الإغلاق` — رفع الإغلاق فوراً',
                ].join('\n'),
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: `🛡️ Security Monitor | أمان ${message.guild.name}` });

        await message.reply({ embeds: [embed] });
    }
};
