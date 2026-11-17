'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔮 FORTUNE v3.0 | 🤔 WYR v3.0 | 🎲 ROLL v3.0 | 💘 SHIP v3.0         ║
 * ║  جميع أوامر الترفيه بالأزرار الاحترافية                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');

// FORTUNE — حظك اليوم

const FORTUNES = [
    { text: '⭐ يوم حلو ينتظرك! الطاقة الإيجابية حواليك.', type: 'great', color: '#FFD700' },
    { text: '💎 فرصة ذهبية تجيك اليوم — انتبه لا تفوتها!', type: 'great', color: '#FFD700' },
    { text: '🌟 الحظ وياك — جرّب شي جديد!', type: 'good', color: '#57F287' },
    { text: '🎯 توصل لأهدافك إذا تواصل، لا تتكاسل 😄', type: 'good', color: '#57F287' },
    { text: '🌈 توقع مفاجأة حلوة قريب!', type: 'good', color: '#57F287' },
    { text: '⚡ طاقتك عالية — استغل يومك!', type: 'good', color: '#57F287' },
    { text: '🎲 الحظ وياك بالألعاب — يلا جرّب!', type: 'neutral', color: '#FEE75C' },
    { text: '💰 فرصة ربح قريبة منك.', type: 'neutral', color: '#FEE75C' },
    { text: '🎊 يوم حلو للّمة والعلاقات.', type: 'neutral', color: '#FEE75C' },
    { text: '📚 يوم مناسب تتعلم بيه شي جديد.', type: 'neutral', color: '#FEE75C' },
    { text: '😐 يوم عادي — لا تسوي بيه قرارات مصيرية، خله بسيط.', type: 'meh', color: '#95A5A6' },
    { text: '⚠️ لا تستعجل بقرارات كبيرة اليوم.', type: 'bad', color: '#ED4245' },
];

const LUCKY_COLORS = ['🔴 أحمر', '🔵 أزرق', '🟢 أخضر', '🟡 أصفر', '🟣 بنفسجي', '⚫ أسود', '⚪ أبيض', '🟠 برتقالي'];
const LUCKY_ELEMENTS = ['🔥 نار', '💧 ماء', '🌍 أرض', '💨 هواء', '⚡ برق', '🌙 قمر', '☀️ شمس'];

function buildFortuneEmbed(user) {
    const seed = user.id + new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }

    const fortune = FORTUNES[Math.abs(hash) % FORTUNES.length];
    const luckyNum = (Math.abs(hash * 7) % 99) + 1;
    const luckyColor = LUCKY_COLORS[Math.abs(hash * 3) % LUCKY_COLORS.length];
    const luckyElement = LUCKY_ELEMENTS[Math.abs(hash * 11) % LUCKY_ELEMENTS.length];

    return new EmbedBuilder()
        .setColor(fortune.color)
        .setTitle(`🔮 حظ ${user.username} اليوم`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: '✨ توقعات اليوم', value: `> ${fortune.text}`, inline: false },
            { name: '🎲 رقمك المحظوظ', value: `**${luckyNum}**`, inline: true },
            { name: '🎨 لونك المحظوظ', value: luckyColor, inline: true },
            { name: '🌀 عنصرك اليوم', value: luckyElement, inline: true },
        )
        .setFooter({ text: '🔄 حظك يتحدّث كل يوم' })
        .setTimestamp();
}

module.exports.fortune = {
    name: 'fortune',
    aliases: ['حظك', 'حظي', 'توقعات'],
    description: 'شوف شنو حظك اليوم',
    usage: 'حظي',

    async execute(message) {
        const embed = buildFortuneEmbed(message.author);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`fortune_refresh_${message.author.id}`)
                .setLabel('🔄 جرّب حظ ثاني')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`fortune_share_${message.author.id}`)
                .setLabel('📤 شارك حظك')
                .setStyle(ButtonStyle.Primary),
        );
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleFortuneInteraction(interaction) {
        if (interaction.customId.startsWith('fortune_refresh_')) {
            await interaction.update({ embeds: [buildFortuneEmbed(interaction.user)] });
        } else if (interaction.customId.startsWith('fortune_share_')) {
            await interaction.reply({
                content: `🔮 **حظ ${interaction.user.username} اليوم:**\n> ${buildFortuneEmbed(interaction.user).data.fields[0].value}`,
            });
        }
    }
};

// WYR — هل تفضل؟

const WYR_QUESTIONS = [
    { a: '💰 تصير غني بس محد يعرفك', b: '🌟 تصير مشهور بس ما عندك فلوس' },
    { a: '⏰ تسافر للماضي', b: '🚀 تسافر للمستقبل' },
    { a: '☕ تشرب قهوة طول عمرك', b: '🍵 تشرب چاي طول عمرك' },
    { a: '🌞 صيف طول السنة', b: '❄️ شتا طول السنة' },
    { a: '🦸 قوة خارقة (تطير)', b: '🧠 ذكاء خارق (عبقري)' },
    { a: '🌊 تعيش بالبحر', b: '🏔️ تعيش بالجبال' },
    { a: '🎮 تلعب وتكسب فلوس', b: '📚 تقرأ كتب وتصير حكيم' },
    { a: '😴 تنام 10 ساعات كل يوم', b: '⚡ تنام 4 ساعات وتبقى نشيط' },
    { a: '🐱 تعيش ويا 10 قطط', b: '🐕 تعيش ويا 10 كلاب' },
    { a: '🔇 ما تسمع شي', b: '🙈 ما تشوف شي' },
    { a: '🌍 تسافر وحدك بكل العالم', b: '🏠 تبقى بالبيت ويا أحبابك' },
    { a: '🍕 تاكل بيتزا كل يوم', b: '🍔 تاكل برگر كل يوم' },
];

const wyrVotes = new Map(); // msgId → { a: Set, b: Set }

module.exports.wyr = {
    name: 'wyr',
    aliases: ['هل_تفضل', 'تفضل', 'ماذا_تفضل'],
    description: 'لعبة تصويت: شتفضّل؟',
    usage: 'تفضل',

    async execute(message) {
        const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🤔 شتفضّل؟')
            .setDescription(`> صوّت على واحد من الخيارين!\n\n**1️⃣ ${q.a}**\n\nلو\n\n**2️⃣ ${q.b}**`)
            .addFields(
                { name: '1️⃣ الخيار الأول', value: '`0` أصوات (0%)', inline: true },
                { name: '2️⃣ الخيار الثاني', value: '`0` أصوات (0%)', inline: true },
            )
            .setFooter({ text: '⏰ التصويت يخلص بعد دقيقتين' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('wyr_vote_a').setLabel(`1️⃣ ${q.a.slice(0, 30)}`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('wyr_vote_b').setLabel(`2️⃣ ${q.b.slice(0, 30)}`).setStyle(ButtonStyle.Secondary),
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });
        wyrVotes.set(msg.id, { a: new Set(), b: new Set(), q });

        // إغلاق التصويت بعد دقيقتين
        setTimeout(async () => {
            const votes = wyrVotes.get(msg.id);
            if (!votes) return;
            wyrVotes.delete(msg.id);

            const totalA = votes.a.size;
            const totalB = votes.b.size;
            const total = totalA + totalB || 1;
            const pctA = Math.round(totalA / total * 100);
            const pctB = 100 - pctA;

            const winner = totalA > totalB ? `1️⃣ **${q.a}**` : totalA < totalB ? `2️⃣ **${q.b}**` : '🤝 **تعادل!**';

            const finalEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🤔 شتفضّل؟ — النتائج!')
                .setDescription(`> ${winner}`)
                .addFields(
                    { name: `1️⃣ ${q.a}`, value: `${'█'.repeat(Math.round(pctA/10))}${'░'.repeat(10-Math.round(pctA/10))} **${pctA}%** (${totalA} صوت)`, inline: false },
                    { name: `2️⃣ ${q.b}`, value: `${'█'.repeat(Math.round(pctB/10))}${'░'.repeat(10-Math.round(pctB/10))} **${pctB}%** (${totalB} صوت)`, inline: false },
                )
                .setTimestamp();

            await msg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
        }, 2 * 60 * 1000);
    },

    async handleWYRInteraction(interaction) {
        const msgId = interaction.message.id;
        const votes = wyrVotes.get(msgId);
        if (!votes) return interaction.reply({ content: '❌ التصويت خلص!', flags: MessageFlags.Ephemeral });

        const userId = interaction.user.id;
        const isA = interaction.customId === 'wyr_vote_a';

        // إلغاء التصويت السابق
        votes.a.delete(userId);
        votes.b.delete(userId);

        if (isA) votes.a.add(userId);
        else votes.b.add(userId);

        const totalA = votes.a.size;
        const totalB = votes.b.size;
        const total = totalA + totalB || 1;
        const pctA = Math.round(totalA / total * 100);
        const pctB = 100 - pctA;

        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setFields(
                { name: '1️⃣ الخيار الأول', value: `\`${totalA}\` أصوات (${pctA}%)`, inline: true },
                { name: '2️⃣ الخيار الثاني', value: `\`${totalB}\` أصوات (${pctB}%)`, inline: true },
            );

        await interaction.update({ embeds: [embed] });
    }
};

// SHIP — نسبة التوافق

module.exports.ship = {
    name: 'ship',
    aliases: ['توافق', 'سفينة', 'حب'],
    description: 'شوف نسبة التوافق بين شخصين',
    usage: 'سفينة @user1 [@user2]',

    async execute(message, args) {
        const user1 = message.mentions.users.first() || message.author;
        const user2 = message.mentions.users.size > 1
            ? [...message.mentions.users.values()][1]
            : (user1.id !== message.author.id ? message.author : user1);

        if (user1.id === user2.id) {
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('💘 نسبة التوافق')
                .setDescription('> 😂 دا تختبر توافقك ويا نفسك؟ **100%** أكيد! 🤪');
            return message.reply({ embeds: [embed] });
        }

        const combined = [user1.id, user2.id].sort().join('');
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash |= 0;
        }
        const pct = Math.abs(hash % 101);

        const bar = '❤️'.repeat(Math.floor(pct / 10)) + '🤍'.repeat(10 - Math.floor(pct / 10));
        const desc = pct >= 90 ? '💕 توأم روح! توافقكم خرافي!' :
                     pct >= 75 ? '💖 توافق كلش حلو! علاقتكم قوية!' :
                     pct >= 50 ? '💚 توافق زين! الأمور ماشية.' :
                     pct >= 25 ? '💛 توافقكم مو ذاك الزود، بس بعد أكو أمل!' :
                                 '💔 ماكو توافق... يمكن بحياة ثانية!';

        const shipName = user1.username.slice(0, Math.ceil(user1.username.length/2)) +
                         user2.username.slice(Math.floor(user2.username.length/2));

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('💘 نسبة التوافق')
            .setDescription(`**${user1.username}** 💕 **${user2.username}**\n\n> 🚢 اسم الثنائي: **${shipName}**`)
            .addFields(
                { name: '❤️ نسبة التوافق', value: `**${pct}%**`, inline: true },
                { name: '📊 النسبة', value: bar, inline: false },
                { name: '💬 شنو رأينا؟', value: desc, inline: false },
            )
            .setFooter({ text: 'النتيجة نفسها لنفس الثنائي كل مرة!' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ship_again_${message.author.id}`)
                .setLabel('🔄 جرّب ويا ناس غير')
                .setStyle(ButtonStyle.Secondary),
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleShipInteraction(interaction) {
        if (interaction.customId.startsWith('ship_again_')) {
            if (interaction.user.id !== interaction.customId.split('_')[2]) {
                return interaction.reply({ content: '❌ مو إلك!', flags: MessageFlags.Ephemeral });
            }
            await interaction.reply({ content: '> اكتب `سفينة @شخص1 @شخص2` حتى تختبر توافق ثاني!', flags: MessageFlags.Ephemeral });
        }
    }
};

// ROLL — رمي النرد

module.exports.roll = {
    name: 'roll',
    aliases: ['نرد', 'رمي', 'dice'],
    description: 'ارمِ النرد وشوف شنو يطلعلك',
    usage: 'نرد [وجوه]',

    async execute(message, args) {
        const faces = Math.min(Math.max(parseInt(args[0]) || 6, 2), 1000);
        const result = Math.floor(Math.random() * faces) + 1;

        const percent = result / faces;
        const quality = percent >= 0.9 ? '🔥 يا سلام، نتيجة ممتازة!' : percent >= 0.7 ? '✅ نتيجة زينة' : percent <= 0.1 ? '😬 حظك مو بصفك!' : '😐 نتيجة عادية';

        const embed = new EmbedBuilder()
            .setColor(percent >= 0.7 ? '#57F287' : percent <= 0.1 ? '#ED4245' : '#FEE75C')
            .setTitle('🎲 رمية النرد')
            .setDescription(`> ${message.author} رمى نرد بيه **${faces}** وجه\n\n# ${result}\n\n> ${quality}`)
            .addFields({ name: '📊 النسبة', value: `**${Math.round(percent * 100)}%** من أعلى نتيجة`, inline: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`roll_again_${faces}_${message.author.id}`)
                .setLabel('🎲 ارمه مرة ثانية')
                .setStyle(ButtonStyle.Primary),
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleRollInteraction(interaction) {
        if (!interaction.customId.startsWith('roll_again_')) return;
        const parts = interaction.customId.split('_');
        const faces = parseInt(parts[2]);
        const ownerId = parts[3];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: '❌ مو إلك!', flags: MessageFlags.Ephemeral });
        }

        const result = Math.floor(Math.random() * faces) + 1;
        const percent = result / faces;
        const quality = percent >= 0.9 ? '🔥 ممتاز!' : percent >= 0.7 ? '✅ زين' : percent <= 0.1 ? '😬 مو زين!' : '😐 عادي';

        const embed = new EmbedBuilder()
            .setColor(percent >= 0.7 ? '#57F287' : percent <= 0.1 ? '#ED4245' : '#FEE75C')
            .setTitle('🎲 رمية النرد')
            .setDescription(`> ${interaction.user} رمى نرد بيه **${faces}** وجه\n\n# ${result}\n\n> ${quality}`)
            .addFields({ name: '📊 النسبة', value: `**${Math.round(percent * 100)}%**`, inline: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`roll_again_${faces}_${ownerId}`)
                .setLabel('🎲 ارمه مرة ثانية')
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.update({ embeds: [embed], components: [row] });
    }
};

// 8BALL — الكرة السحرية

const BALL_ANSWERS = [
    { text: '✅ إي، أكيد!', color: '#57F287', type: 'pos' },
    { text: '✅ الأمور تبشّر بالخير.', color: '#57F287', type: 'pos' },
    { text: '✅ بلا شك.', color: '#57F287', type: 'pos' },
    { text: '✅ تگدر تعتمد عليه.', color: '#57F287', type: 'pos' },
    { text: '✅ إي، أكيد إي.', color: '#57F287', type: 'pos' },
    { text: '🤔 هسه ما أگدر أتوقع.', color: '#FEE75C', type: 'neu' },
    { text: '🤔 اسألني بعدين.', color: '#FEE75C', type: 'neu' },
    { text: '🤔 خلّيها على الله هالمرة.', color: '#FEE75C', type: 'neu' },
    { text: '❌ لا تعتمد عليه.', color: '#ED4245', type: 'neg' },
    { text: '❌ توقعي يقول لا.', color: '#ED4245', type: 'neg' },
    { text: '❌ حتى مصادري تكول لا.', color: '#ED4245', type: 'neg' },
    { text: '❌ احتمالها ضعيف كلش.', color: '#ED4245', type: 'neg' },
];

module.exports.ball = {
    name: 'fun', aliases: ['تنبؤ', 'كرة_الحظ', ],
    description: 'اسأل الكرة السحرية وخليها تجاوبك',
    usage: '8ball [سؤال]',

    async execute(message, args) {
        if (!args || args.length === 0) {
            return message.reply('اكتبلي سؤال أول.\nمثال: `8ball راح أفوز اليوم؟`');
        }

        const question = args.join(' ');
        const answer = BALL_ANSWERS[Math.floor(Math.random() * BALL_ANSWERS.length)];

        const embed = new EmbedBuilder()
            .setColor(answer.color)
            .setTitle('🔮 الكرة السحرية')
            .addFields(
                { name: '❓ سؤالك', value: `> ${question}`, inline: false },
                { name: '💬 الجواب', value: `> **${answer.text}**`, inline: false },
            )
            .setFooter({ text: `سألك: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ball_again_${message.author.id}_${Buffer.from(question).toString('base64').slice(0, 50)}`)
                .setLabel('🔮 اسأل سؤال ثاني')
                .setStyle(ButtonStyle.Secondary),
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleBallInteraction(interaction) {
        if (!interaction.customId.startsWith('ball_again_')) return;
        const parts = interaction.customId.split('_');
        const ownerId = parts[2];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: '❌ مو إلك!', flags: MessageFlags.Ephemeral });
        }

        const answer = BALL_ANSWERS[Math.floor(Math.random() * BALL_ANSWERS.length)];
        const oldQuestion = interaction.message.embeds[0]?.fields?.[0]?.value?.replace('> ', '') || '...';

        const embed = new EmbedBuilder()
            .setColor(answer.color)
            .setTitle('🔮 الكرة السحرية')
            .addFields(
                { name: '❓ سؤالك', value: `> ${oldQuestion}`, inline: false },
                { name: '💬 الجواب', value: `> **${answer.text}**`, inline: false },
            )
            .setFooter({ text: `سألك: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    }
};

module.exports.name = 'fun-buttons';
module.exports.execute = async () => {};
