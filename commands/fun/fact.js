const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'fact',
    aliases: ['حقيقة', 'هل_تعلم'],
    description: 'معلومة عشوائية ممتعة',
    usage: 'fact',

    async execute(message, args) {
        const facts = [
            '🐙 الأخطبوط عنده 3 قلوب!', '🍯 العسل ما يخرب أبد', '🦒 صوت الزرافة تقريباً ما ينسمع',
            '🌙 القمر يبتعد عن الأرض 3.8 سم كل سنة', '🐌 الحلزون ينام 3 سنين', '⚡ البرق أحرّ من الشمس'
        ];

        const fact = facts[Math.floor(Math.random() * facts.length)];
        const embed = PremiumEmbedBuilder.info('💡 تدري؟', fact);
        return message.reply({ embeds: [embed] });
    }
};
