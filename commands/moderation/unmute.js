const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'unmute',
    aliases: ['الغاء_الكتم', 'ان_ميوت', 'untimeout'],
    description: 'يفك الكتم عن عضو',
    usage: 'unmute @user',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ModerateMembers)) {
            const msg = '❌ ما عندك صلاحية تفك الكتم.';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);

        if (!target) {
            return isInteraction ? context.reply({ content: '❌ منشن العضو اللي تريد تفك كتمه.', ephemeral: true }) : context.reply('❌ منشن العضو اللي تريد تفك كتمه.');
        }
        if (!target.isCommunicationDisabled()) {
            return isInteraction ? context.reply({ content: '❌ هالعضو مو مكتوم أصلاً.', ephemeral: true }) : context.reply('❌ هالعضو مو مكتوم أصلاً.');
        }

        await target.timeout(null, `انفك الكتم بواسطة ${author.username}`);

        const embed = PremiumEmbedBuilder.success(
            '🔊 فك الكتم',
            `انفك الكتم عن **${target.user.username}**.`,
            []
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
