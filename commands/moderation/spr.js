const appLogger = require('../../utils/app-logger');
const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'spr',
    aliases: ['spr+'],
    description: 'يكتم أو يفك الكتم عن كل الأعضاء بالروم الصوتي',
    usage: 'spr | spr+',
    permissions: [PermissionFlagsBits.MuteMembers],

    async execute(context, args) {
        const isInteraction = typeof context.isCommand === 'function' ? (context.isCommand() || context.isButton()) : false;
        const author = getAuthor(context);

        // تخطي فحص الصلاحيات لصاحب البوت، التحقق من البقية
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.MuteMembers)) {
            const msg = '❌ ما عندك صلاحية تكتم الأعضاء (Mute Members).';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const voiceChannel = context.member?.voice?.channel;
        if (!voiceChannel) {
            const msg = '❌ لازم تكون بروم صوتي حتى تستخدم هالأمر.';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        // تحديد نوع العملية (فك كتم إذا كان الأمر spr+)
        let isUnmute = false;
        const contentStr = (context.content || '').toLowerCase();
        
        // التحقق من اسم الأمر في حالة الـ Interaction أو الرسالة النصية
        if (context.commandName === 'spr+' || contentStr.includes('spr+')) {
            isUnmute = true;
        }

        let affected = 0;
        
        if (isInteraction && !context.deferred) {
            await context.deferReply({ ephemeral: false });
        }

        for (const [id, member] of voiceChannel.members) {
            if (member.user.bot) continue; // تخطي البوتات
            if (id === author.id) continue; // تخطي الشخص الذي نفذ الأمر

            try {
                // الكتم (true) أو فك الكتم (false)
                await member.voice.setMute(!isUnmute);
                affected++;
            } catch (err) {
                appLogger.error(`Failed to ${isUnmute ? 'unmute' : 'mute'} member ${member.user.tag}:`, err.message);
            }
        }

        const embed = PremiumEmbedBuilder.info(
            isUnmute ? '🔊 فك الكتم الجماعي' : '🔇 الكتم الجماعي',
            isUnmute
                ? `انفك الكتم عن **${affected}** عضو بروم **${voiceChannel.name}**.`
                : `انكتم **${affected}** عضو بروم **${voiceChannel.name}**.`
        );

        return isInteraction 
            ? context.editReply({ embeds: [embed] }) 
            : context.reply({ embeds: [embed] });
    }
};
