const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'lock',
    aliases: ['قفل', 'اغلاق', 'سكر'],
    description: 'يقفل القناة الحالية',
    usage: 'lock',
    permissions: [PermissionFlagsBits.ManageChannels],

    async execute(context) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ManageChannels)) {
            const msg = '❌ ما عندك صلاحية تقفل القنوات.';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        await context.channel.permissionOverwrites.edit(context.guild.id, {
            SendMessages: false
        });

        const embed = PremiumEmbedBuilder.moderation(
            '🔒 قفل القناة',
            'انقفلت القناة، والأعضاء ما يگدرون يكتبون بيها.',
            [],
            author
        );

        if (isInteraction) {
            if (context.replied || context.deferred) await context.followUp({ embeds: [embed] });
            else await context.reply({ embeds: [embed] });
        } else {
            context.reply({ embeds: [embed] });
        }
    }
};
