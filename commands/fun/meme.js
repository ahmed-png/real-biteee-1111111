const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'meme',
    aliases: ['ميم', 'ميمي'],
    description: 'سوّي ميم نصّي بسيط',
    usage: 'meme <نص علوي> | <نص سفلي>',

    async execute(message, args) {
        if (args.length < 2) return message.reply('❌ طريقة الاستخدام: `meme <نص علوي> | <نص سفلي>`');
        const text = args.join(' ');
        const [topText, bottomText] = text.split('|').map(t => t?.trim() || '');
        if (!topText || !bottomText) return message.reply('❌ استخدم | حتى تفصل بين النصين!');

        const embed = PremiumEmbedBuilder.custom({
            color: '#FF6B35',
            title: '😂 ميم',
            description: `**${topText.toUpperCase()}**\n\n━━━━━━━━━━━━━━\n\n**${bottomText.toUpperCase()}**`
        });
        return message.reply({ embeds: [embed] });
    }
};
