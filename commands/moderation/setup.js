'use strict';

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const colorRoles = require('./color-roles');

async function applyRoleOverwrites(guild, role, permissions, shouldSkip = () => false) {
    const result = { applied: 0, failed: [] };

    for (const channel of guild.channels.cache.values()) {
        if (!channel.permissionOverwrites || shouldSkip(channel)) continue;

        try {
            await channel.permissionOverwrites.edit(role.id, permissions);
            result.applied++;
        } catch (error) {
            result.failed.push({ channel: channel.name, reason: error.message });
        }
    }

    return result;
}

function reportOverwriteFailures(results, roleName, failures) {
    if (failures.length === 0) return;

    const examples = failures.slice(0, 3)
        .map(({ channel, reason }) => `${channel}: ${reason.slice(0, 120)}`)
        .join(' | ');
    const remaining = failures.length > 3 ? ` | وقنوات ثانية (${failures.length - 3})` : '';
    results.failed.push(`❌ صلاحيات ${roleName}: ما كدرت أحدّث ${failures.length} قناة — ${examples}${remaining}`);
}

module.exports = {
    name: 'setup',
    aliases: ['تفعيل', 'تفعيل رتب', 'تفعيل-رتب', 'اعداد', 'اعداد الرتب', 'اعداد-الرتب'],
    description: 'يجهّز وينشئ الرتب الأساسية (الألوان، السجن، الكتم)',
    usage: 'تفعيل [رتب]',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message) {
        // فقط الأدمن أو مالك البوت
        const isOwner = message.author.id === config.ownerId;
        const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !isAdmin) {
            return message.reply('❌ هالأمر يحتاج صلاحية **الأدمن**.');
        }

        const guild = message.guild;
        const results = { success: [], skipped: [], failed: [] };

        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚙️ دا أنشئ الرتب الأساسية...')
            .setDescription('```\n⏳ انتظر شوي...\n```')
            .setTimestamp();
        const msg = await message.reply({ embeds: [loadingEmbed] });

        // 1. رتبة السجن
        try {
            const jailRoleName = config.jailRoleName || '🔒┃سجين';
            let jailRole = guild.roles.cache.find(r =>
                r.name === jailRoleName ||
                r.name === config.jailRoleName ||
                r.name.toLowerCase().includes('سجين') ||
                r.name.toLowerCase().includes('jail')
            );
            if (!jailRole) {
                jailRole = await guild.roles.create({
                    name: jailRoleName,
                    color: '#000000',
                    permissions: [],
                    reason: 'إعداد الرتب تلقائياً'
                });
                results.success.push(`✅ انعملت رتبة السجن (**${jailRole.name}**)`);
            } else {
                results.skipped.push(`🔄 رتبة السجن موجودة — دا أحدّث صلاحياتها`);
            }

            const jailPermissions = await applyRoleOverwrites(guild, jailRole, {
                SendMessages: false,
                Speak: false,
                ViewChannel: false
            }, channel => channel.name.toLowerCase().includes('سجن') || channel.name.toLowerCase().includes('jail'));
            results.success.push(`✅ تضبطت صلاحيات السجن على ${jailPermissions.applied} قناة`);
            reportOverwriteFailures(results, 'السجن', jailPermissions.failed);

            db.updateGuildData(guild.id, { jailRole: jailRole.id });

            // قناة السجن
            let jailChannel = guild.channels.cache.find(c =>
                c.name.includes('سجن') || c.name.toLowerCase().includes('jail')
            );
            if (!jailChannel) {
                jailChannel = await guild.channels.create({
                    name: '🔒┃السجن',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
                        { id: jailRole.id, allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] }
                    ]
                });
                results.success.push(`✅ انعملت قناة **${jailChannel.name}**`);
            } else {
                await jailChannel.permissionOverwrites.edit(jailRole.id, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    SendMessages: false
                });
            }

        } catch (e) {
            results.failed.push(`❌ رتبة السجن: ${e.message}`);
        }

        // 2. رتبة الكتم
        try {
            const muteRoleName = config.muteRoleName || '🔇┃مكتوم';
            let muteRole = guild.roles.cache.find(r =>
                r.name === muteRoleName ||
                r.name === config.muteRoleName ||
                r.name.toLowerCase().includes('مكتوم') ||
                r.name.toLowerCase().includes('muted')
            );
            if (!muteRole) {
                muteRole = await guild.roles.create({
                    name: muteRoleName,
                    color: '#808080',
                    permissions: [],
                    reason: 'إعداد الرتب تلقائياً'
                });
                results.success.push(`✅ انعملت رتبة الكتم (**${muteRole.name}**)`);
            } else {
                results.skipped.push(`🔄 رتبة الكتم موجودة — دا أحدّث صلاحياتها`);
            }

            const mutePermissions = await applyRoleOverwrites(guild, muteRole, {
                SendMessages: false,
                Speak: false,
                AddReactions: false
            });
            results.success.push(`✅ تضبطت صلاحيات الكتم على ${mutePermissions.applied} قناة`);
            reportOverwriteFailures(results, 'الكتم', mutePermissions.failed);

            db.updateGuildData(guild.id, { muteRole: muteRole.id });
        } catch (e) {
            results.failed.push(`❌ رتبة الكتم: ${e.message}`);
        }

        // 3. رتب الألوان
        try {
            await msg.edit({ embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('🎨 دا أنشئ رتب الألوان (20 لون)...')] });
            const createdColorsCount = await colorRoles.createGuildColorRoles(guild);
            if (createdColorsCount > 0) {
                results.success.push(`✅ انضافت **${createdColorsCount}** رتبة لون جديدة`);
            } else {
                results.skipped.push(`🔄 كل رتب الألوان موجودة من قبل`);
            }
        } catch (e) {
            results.failed.push(`❌ رتب الألوان: ${e.message}`);
        }

        // النتيجة النهائية
        const totalDone = results.success.length;
        const totalFailed = results.failed.length;
        let color = '#00C853';
        if (totalFailed > 0 && totalDone === 0) color = '#FF1744';
        else if (totalFailed > 0) color = '#FFA500';

        const finalEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('📊 تقرير تجهيز الرتب')
            .setDescription('خلصت مراجعة وتجهيز الرتب والقنوات المطلوبة.')
            .setTimestamp();

        if (results.success.length > 0) finalEmbed.addFields({ name: '✅ اللي انعمل', value: results.success.join('\n') });
        if (results.skipped.length > 0) finalEmbed.addFields({ name: '🔄 موجودة من قبل', value: results.skipped.join('\n') });
        if (results.failed.length > 0) finalEmbed.addFields({ name: '❌ اللي ما انعمل', value: results.failed.join('\n') });

        await msg.edit({ embeds: [finalEmbed] });
    }
};
