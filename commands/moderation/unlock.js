const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'unlock',
    aliases: ['فتح', 'تشغيل', 'افتح'],
    description: 'يفتح القناة المقفولة',
    usage: 'unlock',
    permissions: [PermissionFlagsBits.ManageChannels],

    async execute(context) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ManageChannels)) {
            const msg = '❌ ما عندك صلاحية تفتح القنوات.';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        await context.channel.permissionOverwrites.edit(context.guild.id, {
            SendMessages: true
        });

        const embed = PremiumEmbedBuilder.success(
            '🔓 فتح القناة',
            'انفتحت القناة، والأعضاء يگدرون يكتبون بيها من جديد.',
            []
        );

        if (isInteraction) {
            if (context.replied || context.deferred) await context.followUp({ embeds: [embed] });
            else await context.reply({ embeds: [embed] });
        } else {
            context.reply({ embeds: [embed] });
        }
    }
};
