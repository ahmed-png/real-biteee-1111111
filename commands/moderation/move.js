const appLogger = require('../../utils/app-logger');
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'move',
    aliases: ['pull', 'اسحب', 'نقل', 'mv', 'bring'],
    description: 'ينقل الأعضاء للروم الصوتي مالك (استخدم: !اسحب)',
    usage: '!move <all/half/@user>',
    permissions: [PermissionFlagsBits.MoveMembers],

    async execute(message, args) {
        // 1. فحص الصلاحيات (صاحب البوت يتخطى)
        if (!isOwner(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return message.reply({
                content: '❌ **ما عندك صلاحية تنقل الأعضاء (Move Members).**',
                ephemeral: true
            });
        }

        // 2. Check if user is in a voice channel (Robust Detection)
        let targetChannel = message.member.voice?.channel;

        if (!targetChannel) {
            try {
                const member = await message.guild.members.fetch({ user: message.author.id, force: true });
                targetChannel = member.voice?.channel;
            } catch (e) {
                appLogger.error("Failed to fetch fresh member state:", e);
            }
        }

        if (!targetChannel) {
            return message.reply('❌ **لازم تكون بروم صوتي بالبداية! تأكد من تفعيل الـ Intents وإعادة تشغيل البوت.**');
        }

        const type = args[0]?.toLowerCase();

        // Helper to delay moving (avoid rate limits)
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // --- OPTION 1: MOVE SPECIFIC USER ---
        const targetMember = message.mentions.members.first();
        if (targetMember) {
            if (!targetMember.voice.channel) {
                return message.reply('❌ **هالعضو مو بروم صوتي.**');
            }
            if (targetMember.voice.channelId === targetChannel.id) {
                return message.reply('❌ **هالعضو وياك بنفس الروم أصلاً.**');
            }

            try {
                await targetMember.voice.setChannel(targetChannel);
                return message.reply(`✅ **نقلت ${targetMember} إلى ${targetChannel}!**`);
            } catch (error) {
                appLogger.error(error);
                return message.reply('❌ **صار خطأ وأنا أنقل العضو. تأكد من صلاحياتي.**');
            }
        }

        // --- OPTION 2: MOVE ALL (سحب كامل) ---
        if (type === 'all' || type === 'كامل' || type === 'الكل') {
            // Fetch all channels to ensure cache is populated
            await message.guild.channels.fetch();

            // Find all members in ANY voice channel (except the target channel)
            let moveableMembers = [];
            message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== targetChannel.id).forEach(channel => {
                channel.members.forEach(member => {
                    if (!member.user.bot) moveableMembers.push(member); // Exclude bots
                });
            });

            if (moveableMembers.length === 0) {
                return message.reply('❌ **ماكو أعضاء برومات صوتية ثانية حتى أنقلهم.**');
            }

            const msg = await message.reply(`🔄 **دا أنقل ${moveableMembers.length} عضو إلى ${targetChannel}...**`);

            let count = 0;
            for (const member of moveableMembers) {
                try {
                    await member.voice.setChannel(targetChannel);
                    count++;
                    await sleep(500); // 0.5s delay to be safe
                } catch (err) {
                    appLogger.error(`Failed to move ${member.user.tag}:`, err);
                }
            }

            return msg.edit(`✅ **اننقلوا الأعضاء! (${count}/${moveableMembers.length})**`);
        }

        // --- OPTION 3: MOVE HALF (سحب نصف) ---
        if (type === 'half' || type === 'نصف' || type === 'النصف') {
            // Fetch all channels
            await message.guild.channels.fetch();

            // Find all members in ANY voice channel
            let moveableMembers = [];
            message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== targetChannel.id).forEach(channel => {
                channel.members.forEach(member => {
                    if (!member.user.bot) moveableMembers.push(member);
                });
            });

            if (moveableMembers.length === 0) {
                return message.reply('❌ **ماكو أعضاء حتى أنقلهم.**');
            }

            // Shuffle array
            moveableMembers = moveableMembers.sort(() => Math.random() - 0.5);

            // Take half
            const halfCount = Math.ceil(moveableMembers.length / 2);
            const selectedMembers = moveableMembers.slice(0, halfCount);

            const msg = await message.reply(`🔄 **دا أنقل نص الأعضاء (${selectedMembers.length}) إلى ${targetChannel}...**`);

            let count = 0;
            for (const member of selectedMembers) {
                try {
                    await member.voice.setChannel(targetChannel);
                    count++;
                    await sleep(500);
                } catch (err) {
                    appLogger.error(`Failed to move ${member.user.tag}:`, err);
                }
            }

            return msg.edit(`✅ **اننقل نص الأعضاء! (${count}/${selectedMembers.length})**`);
        }

        // --- DEFAULT: HELP MSG ---
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🎮 أوامر نقل الأعضاء')
            .setDescription('استخدم هالأوامر حتى تنقل الأعضاء:')
            .addFields(
                { name: 'نقل عضو معيّن', value: `\`!سحب @user\``, inline: false },
                { name: 'نقل الكل', value: `\`!سحب كامل\``, inline: false },
                { name: 'نقل النص عشوائياً', value: `\`!سحب نصف\``, inline: false }
            )
            .setFooter({ text: 'بوتكم حاضر للخدمة 🤖' });

        message.reply({ embeds: [embed] });
    }
};
