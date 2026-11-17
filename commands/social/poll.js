'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   🗳️ POLL SYSTEM v1.0 — نظام التصويت التفاعلي             ║
 * ║   أنشئ استطلاعات تفاعلية مع نتائج حية وأزرار              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags
} = require('discord.js');
const db = require('../../utils/database');
const dailyChallenges = require('../../utils/daily-challenges');

// الاستطلاعات النشطة
const activePolls = new Map(); // messageId → pollData

// إنشاء استطلاع
async function createPoll(message, args) {
    const content = args.join(' ');

    // تنسيق: سؤال | خيار1 | خيار2 | خيار3
    const parts = content.split('|').map(p => p.trim());

    if (parts.length < 3) {
        const helpEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🗳️ شلون تسوي استطلاع؟')
            .setDescription([
                '```',
                'بول [السؤال] | [خيار1] | [خيار2] | [خيار3]',
                '```',
                '**مثال:**',
                '```',
                'بول شنو لعبتك المفضلة؟ | PUBG | COD | Fortnite | Valorant',
                '```',
                '> 📌 تگدر تضيف لحد **5 خيارات**',
                '> ⏰ الاستطلاع ينتهي وحده بعد **10 دقايق**',
            ].join('\n'))
            .setTimestamp();
        return message.reply({ embeds: [helpEmbed] });
    }

    if (!parts[0] || parts.slice(1).some(option => !option)) {
        return message.reply('❌ اكتب السؤال وخيارين عالأقل، ولا تخلي خيار فارغ.');
    }

    const question = parts[0];
    const options = parts.slice(1, 6); // أقصى 5 خيارات

    if (options.length < 2) {
        return message.reply('❌ لازم تضيف **خيارين عالأقل**! استخدم `|` حتى تفصل بينهم.');
    }

    const emojis = ['🔵', '🔴', '🟢', '🟡', '🟣'];
    const DURATION = 10 * 60 * 1000; // 10 دقائق
    const endsAt = Date.now() + DURATION;

    const pollData = {
        question,
        options,
        votes: {},    // userId → optionIndex
        optionCounts: options.map(() => 0),
        creatorId: message.author.id,
        createdAt: Date.now(),
        endsAt,
        ended: false,
    };

    const embed = buildPollEmbed(pollData, message.author, emojis, false);

    const rows = [];
    const buttons = options.map((opt, i) =>
        new ButtonBuilder()
            .setCustomId(`poll_vote_${i}`)
            .setLabel(opt.length > 20 ? opt.slice(0, 17) + '...' : opt)
            .setEmoji(emojis[i])
            .setStyle(ButtonStyle.Primary)
    );

    // تقسيم الأزرار (5 في صف)
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    // زر الإنهاء (للمنشئ فقط)
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('poll_end')
            .setLabel('⏹️ خلّص الاستطلاع')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('poll_results')
            .setLabel('📊 شوف النتائج')
            .setStyle(ButtonStyle.Secondary),
    ));

    const pollMsg = await message.reply({ embeds: [embed], components: rows });

    // حفظ بيانات الاستطلاع
    activePolls.set(pollMsg.id, { ...pollData, messageId: pollMsg.id });

    // إنهاء تلقائي بعد 10 دقائق
    setTimeout(async () => {
        const poll = activePolls.get(pollMsg.id);
        if (poll && !poll.ended) {
            poll.ended = true;
            const finalEmbed = buildPollEmbed(poll, null, emojis, true);
            await pollMsg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
            activePolls.delete(pollMsg.id);
        }
    }, DURATION);

    // تحديث التحديات
    await dailyChallenges.updateProgress(message.author.id, 'poll', 1, message);
}

// بناء Embed الاستطلاع
function buildPollEmbed(pollData, author, emojis, ended) {
    const totalVotes = Object.keys(pollData.votes).length;
    const embed = new EmbedBuilder()
        .setColor(ended ? '#2ECC71' : '#3498DB')
        .setTitle(`${ended ? '📊 نتائج الاستطلاع' : '🗳️ استطلاع شغّال'} — ${pollData.question}`)
        .setTimestamp();

    if (author) {
        embed.setAuthor({ name: author.displayName, iconURL: author.displayAvatarURL() });
    }

    const optionLines = pollData.options.map((opt, i) => {
        const count = pollData.optionCounts[i] || 0;
        const pct = totalVotes > 0 ? Math.floor((count / totalVotes) * 100) : 0;
        const barLength = Math.floor(pct / 10);
        const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);

        return [
            `${emojis[i]} **${opt}**`,
            `\`[${bar}]\` ${pct}% (${count} صوت)`,
        ].join('\n');
    });

    embed.setDescription(optionLines.join('\n\n'));
    embed.addFields({
        name: '📊 الإحصائيات',
        value: [
            `👥 **مجموع الأصوات:** ${totalVotes}`,
            ended
                ? '🔴 **الاستطلاع خلص**'
                : `⏰ **ينتهي:** <t:${Math.floor(pollData.endsAt / 1000)}:R>`,
        ].join('\n'),
        inline: false,
    });

    if (ended && totalVotes > 0) {
        const maxCount = Math.max(...pollData.optionCounts);
        const winnerIndex = pollData.optionCounts.indexOf(maxCount);
        embed.addFields({
            name: '🏆 الخيار الفايز',
            value: `${emojis[winnerIndex]} **${pollData.options[winnerIndex]}** بـ ${maxCount} صوت`,
        });
    }

    return embed;
}

// معالج التصويت
async function handlePollInteraction(interaction) {
    const id = interaction.customId;
    const msgId = interaction.message.id;
    const poll = activePolls.get(msgId);

    if (!poll) {
        return interaction.reply({ content: '❌ هالاستطلاع مو شغّال أو خلص!', flags: MessageFlags.Ephemeral });
    }

    const emojis = ['🔵', '🔴', '🟢', '🟡', '🟣'];

    if (id.startsWith('poll_vote_')) {
        if (poll.ended) {
            return interaction.reply({ content: '❌ الاستطلاع خلص!', flags: MessageFlags.Ephemeral });
        }

        const optionIndex = parseInt(id.replace('poll_vote_', ''));
        const userId = interaction.user.id;
        const prevVote = poll.votes[userId];

        // إزالة الصوت السابق
        if (prevVote !== undefined) {
            poll.optionCounts[prevVote]--;
        }

        // تسجيل الصوت الجديد
        if (prevVote === optionIndex) {
            // إلغاء التصويت
            delete poll.votes[userId];
        } else {
            poll.votes[userId] = optionIndex;
            poll.optionCounts[optionIndex]++;
        }

        const updatedEmbed = buildPollEmbed(poll, null, emojis, false);
        await interaction.update({ embeds: [updatedEmbed] }).catch(() => {});

        await interaction.followUp({
            content: prevVote === optionIndex
                ? '✅ لغينا تصويتك!'
                : `✅ صوّتت لـ **${poll.options[optionIndex]}**!`,
            flags: MessageFlags.Ephemeral,
        });
    }
    else if (id === 'poll_end') {
        if (poll.creatorId !== interaction.user.id &&
            !interaction.member?.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ بس اللي سوّى الاستطلاع يگدر ينهيه!', flags: MessageFlags.Ephemeral });
        }

        poll.ended = true;
        const finalEmbed = buildPollEmbed(poll, null, emojis, true);
        await interaction.update({ embeds: [finalEmbed], components: [] });
        activePolls.delete(msgId);
    }
    else if (id === 'poll_results') {
        const resultsEmbed = buildPollEmbed(poll, null, emojis, false);
        await interaction.reply({ embeds: [resultsEmbed], flags: MessageFlags.Ephemeral });
    }
}

module.exports = {
    name: 'poll',
    aliases: ['بول', 'استطلاع', 'تصويت'],
    description: 'سوّي استطلاع رأي تفاعلي',
    category: 'اجتماعي',

    async execute(message, args) {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('🗳️ نظام الاستطلاعات')
                .setDescription([
                    '**طريقة الاستخدام:**',
                    '```',
                    'بول [السؤال] | [خيار1] | [خيار2]',
                    '```',
                    '**مثال:**',
                    '```',
                    'بول شنو لعبتك المفضلة؟ | PUBG | COD | Fortnite',
                    '```',
                ].join('\n'))
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }

        await createPoll(message, args);
    },

    createPoll,
    handlePollInteraction,
    activePolls,
};
