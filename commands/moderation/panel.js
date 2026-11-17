/**
 * ═══════════════════════════════════════════════════════════
 * 🛡️ لوحة الإدارة الكاملة
 * الأوامر الإدارية بالأزرار والنوافذ
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    EmbedBuilder, PermissionFlagsBits, MessageFlags
} = require('discord.js');

// بناء لوحة الإدارة الرئيسية
function buildAdminPanel(guild) {
    const onlineCount = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;

    const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🛡️ لوحة إدارة السيرفر')
        .setDescription([
            `> **${guild.name}** — كل أدوات الإدارة بمكان واحد`,
            '',
            '**📊 أرقام السيرفر:**',
            `> 👥 الأعضاء: **${guild.memberCount}** (🟢 ${onlineCount} متصلين)`,
            `> 🤖 البوتات: **${botCount}**`,
            `> 📋 القنوات: **${guild.channels.cache.size}**`,
            `> ⚙️ الرتب: **${guild.roles.cache.size}**`,
            `> 📅 انعمل: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
        ].join('\n'))
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'اضغط زر حتى تنفّذ الإجراء • كل الإجراءات تنسجّل' });

    // صف 1: إجراءات الإشراف
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adm_warn').setLabel('⚠️ تحذير').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adm_mute').setLabel('🔇 كتم').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('adm_jail').setLabel('🔒 سجن').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('adm_kick').setLabel('👢 طرد').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('adm_ban').setLabel('🔨 حظر').setStyle(ButtonStyle.Danger)
    );

    // صف 2: رفع عقوبات
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adm_unmute').setLabel('🔊 فك الكتم').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adm_unjail').setLabel('🔓 فك السجن').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adm_unban').setLabel('✅ رفع الحظر').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adm_clear').setLabel('🧹 مسح رسائل').setStyle(ButtonStyle.Secondary)
    );

    // صف 3: إدارة القناة
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adm_lock').setLabel('🔒 قفل القناة').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('adm_unlock').setLabel('🔓 فتح القناة').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adm_slowmode').setLabel('🐢 تهدئة الدردشة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adm_announce').setLabel('📢 إعلان').setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

// دالة: فتح Modal لإدخال اسم العضو والسبب
function punishModal(customId, title, extra = []) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    const userInput = new TextInputBuilder()
        .setCustomId('target_id')
        .setLabel('معرّف العضو أو @منشن')
        .setPlaceholder('الصق المعرّف هنا...')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('السبب')
        .setPlaceholder('اكتب السبب إذا تحب...')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const rows = [
        new ActionRowBuilder().addComponents(userInput),
        new ActionRowBuilder().addComponents(reasonInput),
        ...extra
    ];
    modal.addComponents(...rows);
    return modal;
}

// دوال مساعدة
async function resolveMember(interaction, rawId) {
    const id = rawId.replace(/\D/g, '');
    return interaction.guild.members.fetch(id).catch(() => null);
}

async function resolveUser(interaction, rawId) {
    const id = rawId.replace(/\D/g, '');
    return interaction.client.users.fetch(id).catch(() => null);
}

function successEmbed(title, desc) {
    return new EmbedBuilder().setColor('#2ECC71').setTitle(`✅ ${title}`).setDescription(desc).setTimestamp();
}
function errorEmbed(desc) {
    return new EmbedBuilder().setColor('#E74C3C').setTitle('❌ خطأ').setDescription(desc).setTimestamp();
}

// معالج الأزرار
async function handleAdminInteraction(interaction) {
    // تحقق من الصلاحيات
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ما عندك صلاحية للإدارة.', flags: MessageFlags.Ephemeral });
    }

    const id = interaction.customId;

    switch (id) {
        case 'adm_warn':
            return interaction.showModal(punishModal('adm_warn_modal', '⚠️ تحذير عضو'));
        case 'adm_mute':
            return interaction.showModal((() => {
                const m = punishModal('adm_mute_modal', '🔇 كتم عضو');
                const durField = new TextInputBuilder()
                    .setCustomId('duration')
                    .setLabel('المدة بالدقايق (مثال: 60)')
                    .setPlaceholder('60')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                m.addComponents(new ActionRowBuilder().addComponents(durField));
                return m;
            })());
        case 'adm_jail':
            return interaction.showModal(punishModal('adm_jail_modal', '🔒 سجن عضو'));
        case 'adm_kick':
            return interaction.showModal(punishModal('adm_kick_modal', '👢 طرد عضو'));
        case 'adm_ban':
            return interaction.showModal(punishModal('adm_ban_modal', '🔨 حظر عضو'));
        case 'adm_unmute':
            return interaction.showModal(punishModal('adm_unmute_modal', '🔊 رفع كتم'));
        case 'adm_unjail':
            return interaction.showModal(punishModal('adm_unjail_modal', '🔓 رفع سجن'));
        case 'adm_unban':
            return interaction.showModal(punishModal('adm_unban_modal', '✅ رفع حظر'));
        case 'adm_clear': {
            const modal = new ModalBuilder().setCustomId('adm_clear_modal').setTitle('🧹 مسح رسائل');
            const numInput = new TextInputBuilder()
                .setCustomId('amount')
                .setLabel('عدد الرسائل (1 إلى 100)')
                .setPlaceholder('50')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(numInput));
            return interaction.showModal(modal);
        }
        case 'adm_lock': {
            try {
                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: false }
                );
                return interaction.reply({ embeds: [successEmbed('انقفلت القناة', `🔒 قناة **${interaction.channel.name}** انقفلت هسه.`)], flags: MessageFlags.Ephemeral });
            } catch (e) {
                return interaction.reply({ embeds: [errorEmbed('ما كدرت أقفل القناة: ' + e.message)], flags: MessageFlags.Ephemeral });
            }
        }
        case 'adm_unlock': {
            try {
                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: null }  // null = إعادة للافتراضي (مفتوح)
                );
                return interaction.reply({ embeds: [successEmbed('انفتحت القناة', `🔓 قناة **${interaction.channel.name}** انفتحت هسه.`)], flags: MessageFlags.Ephemeral });
            } catch (e) {
                return interaction.reply({ embeds: [errorEmbed('ما كدرت أفتح القناة: ' + e.message)], flags: MessageFlags.Ephemeral });
            }
        }
        case 'adm_slowmode': {
            const modal = new ModalBuilder().setCustomId('adm_slowmode_modal').setTitle('🐢 تهدئة الدردشة');
            const secInput = new TextInputBuilder()
                .setCustomId('seconds')
                .setLabel('المدة بالثواني (0 حتى تلغيها)')
                .setPlaceholder('30')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(secInput));
            return interaction.showModal(modal);
        }
        case 'adm_announce': {
            const modal = new ModalBuilder().setCustomId('adm_announce_modal').setTitle('📢 إعلان');
            const msgInput = new TextInputBuilder()
                .setCustomId('message')
                .setLabel('محتوى الإعلان')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            const titleInput = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('العنوان')
                .setPlaceholder('إعلان مهم')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(msgInput)
            );
            return interaction.showModal(modal);
        }

        // دعم legacy buttons
        case 'admin_clear_show':
        case 'admin_punish_show':
        case 'admin_settings':
        case 'admin_lock':
        case 'admin_unlock': {
            const mapped = {
                'admin_clear_show': 'adm_clear',
                'admin_punish_show': 'adm_warn',
                'admin_settings': 'adm_announce',
                'admin_lock': 'adm_lock',
                'admin_unlock': 'adm_unlock',
            };
            interaction.customId = mapped[id];
            return handleAdminInteraction(interaction);
        }
    }
}

// معالج المودالز
async function handleAdminModal(interaction) {
    const id = interaction.customId;
    const guild = interaction.guild;
    const member = interaction.member;

    if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ما عندك صلاحية.', flags: MessageFlags.Ephemeral });
    }

    // تنظيف رسائل
    if (id === 'adm_clear_modal' || id === 'admin_clear_modal') {
        const amount = parseInt(interaction.fields.getTextInputValue('amount') || interaction.fields.getTextInputValue('clear_amount'));
        if (isNaN(amount) || amount < 1 || amount > 100)
            return interaction.reply({ content: '❌ دخل رقم من 1 إلى 100.', flags: MessageFlags.Ephemeral });
        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({ embeds: [successEmbed('انمسحت الرسائل', `🧹 انمسحت **${deleted.size}** رسالة.`)], flags: MessageFlags.Ephemeral });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('ما كدرت أمسحها؛ يمكن الرسائل أقدم من 14 يوم.')], flags: MessageFlags.Ephemeral });
        }
    }

    // Slowmode
    if (id === 'adm_slowmode_modal') {
        const secs = parseInt(interaction.fields.getTextInputValue('seconds'));
        if (isNaN(secs) || secs < 0 || secs > 21600)
            return interaction.reply({ content: '❌ دخل مدة من 0 إلى 21600 ثانية.', flags: MessageFlags.Ephemeral });
        await interaction.channel.setRateLimitPerUser(secs);
        return interaction.reply({ embeds: [successEmbed('تهدئة الدردشة', secs === 0 ? '🐢 انلغت تهدئة الدردشة.' : `🐢 لازم تنتظر **${secs}** ثانية بين كل رسالة.`)], flags: MessageFlags.Ephemeral });
    }

    // إعلان
    if (id === 'adm_announce_modal') {
        const title = interaction.fields.getTextInputValue('title') || '📢 إعلان';
        const msg = interaction.fields.getTextInputValue('message');
        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle(title)
            .setDescription(msg)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();
        await interaction.channel.send({ embeds: [embed] });
        return interaction.reply({ content: '✅ انرسل الإعلان.', flags: MessageFlags.Ephemeral });
    }

    // تحذير
    if (id === 'adm_warn_modal') {
        const rawId = interaction.fields.getTextInputValue('target_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'ماكو سبب';
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('⚠️ إشعار تحذير')
            .setDescription(`**${target.user.tag}** وصله تحذير.\nالسبب: ${reason}`)
            .setTimestamp();
        try { await target.send({ embeds: [embed] }); } catch (_) { }
        return interaction.reply({ embeds: [successEmbed('تحذير', `⚠️ وصل تحذير لـ **${target.user.tag}**.\nالسبب: ${reason}`)], flags: MessageFlags.Ephemeral });
    }

    // كتم
    if (id === 'adm_mute_modal') {
        const rawId = interaction.fields.getTextInputValue('target_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'ماكو سبب';
        const duration = parseInt(interaction.fields.getTextInputValue('duration') || '60');
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        if (!member.permissions.has(PermissionFlagsBits.ModerateMembers))
            return interaction.reply({ embeds: [errorEmbed('ما عندك صلاحية الإشراف على الأعضاء.')], flags: MessageFlags.Ephemeral });
        try {
            await target.timeout(duration * 60 * 1000, reason);
            return interaction.reply({ embeds: [successEmbed('كتم', `🔇 انكتم **${target.user.tag}** لمدة **${duration}** دقيقة.\nالسبب: ${reason}`)], flags: MessageFlags.Ephemeral });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('ما كدرت أكتمه: ' + e.message)], flags: MessageFlags.Ephemeral });
        }
    }

    // رفع كتم
    if (id === 'adm_unmute_modal') {
        const rawId = interaction.fields.getTextInputValue('target_id');
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        try {
            await target.timeout(null);
            return interaction.reply({ embeds: [successEmbed('فك الكتم', `🔊 انفك الكتم عن **${target.user.tag}**.`)], flags: MessageFlags.Ephemeral });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('ما كدرت أنفّذ الطلب: ' + e.message)], flags: MessageFlags.Ephemeral });
        }
    }

    // سجن
    if (id === 'adm_jail_modal') {
        const rawId = interaction.fields.getTextInputValue('target_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'ماكو سبب';
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        const jailCmd = interaction.client.commands.get('jail');
        if (jailCmd) {
            return jailCmd.execute({ ...interaction, author: interaction.user, mentions: { users: new Map([[target.id, target.user]]) } }, [target.id, reason]);
        }
        return interaction.reply({ embeds: [errorEmbed('أمر السجن مو متوفر.')], flags: MessageFlags.Ephemeral });
    }

    // رفع سجن
    if (id === 'adm_unjail_modal') {
        const rawId = interaction.fields.getTextInputValue('target_id');
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        const unjailCmd = interaction.client.commands.get('unjail');
        if (unjailCmd) {
            return unjailCmd.execute({ ...interaction, author: interaction.user, mentions: { users: new Map([[target.id, target.user]]) } }, [target.id]);
        }
        return interaction.reply({ embeds: [errorEmbed('أمر فك السجن مو متوفر.')], flags: MessageFlags.Ephemeral });
    }

    // طرد
    if (id === 'adm_kick_modal') {
        if (!member.permissions.has(PermissionFlagsBits.KickMembers))
            return interaction.reply({ embeds: [errorEmbed('ما عندك صلاحية تطرد أعضاء.')], flags: MessageFlags.Ephemeral });
        const rawId = interaction.fields.getTextInputValue('target_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'ماكو سبب';
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        try {
            await target.kick(reason);
            return interaction.reply({ embeds: [successEmbed('طرد', `👢 انطرد **${target.user.tag}**.\nالسبب: ${reason}`)], flags: MessageFlags.Ephemeral });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('ما كدرت أطرده: ' + e.message)], flags: MessageFlags.Ephemeral });
        }
    }

    // حظر
    if (id === 'adm_ban_modal') {
        if (!member.permissions.has(PermissionFlagsBits.BanMembers))
            return interaction.reply({ embeds: [errorEmbed('ما عندك صلاحية تحظر أعضاء.')], flags: MessageFlags.Ephemeral });
        const rawId = interaction.fields.getTextInputValue('target_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'ماكو سبب';
        const target = await resolveMember(interaction, rawId);
        if (!target) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالعضو.')], flags: MessageFlags.Ephemeral });
        try {
            await target.ban({ reason, deleteMessageSeconds: 86400 });
            return interaction.reply({ embeds: [successEmbed('حظر', `🔨 انحظر **${target.user.tag}**.\nالسبب: ${reason}`)], flags: MessageFlags.Ephemeral });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('ما كدرت أحظره: ' + e.message)], flags: MessageFlags.Ephemeral });
        }
    }

    // رفع حظر
    if (id === 'adm_unban_modal') {
        if (!member.permissions.has(PermissionFlagsBits.BanMembers))
            return interaction.reply({ embeds: [errorEmbed('ما عندك صلاحية.')], flags: MessageFlags.Ephemeral });
        const rawId = interaction.fields.getTextInputValue('target_id');
        const user = await resolveUser(interaction, rawId);
        if (!user) return interaction.reply({ embeds: [errorEmbed('ما لگيت هالمستخدم.')], flags: MessageFlags.Ephemeral });
        try {
            await guild.bans.remove(user.id);
            return interaction.reply({ embeds: [successEmbed('رفع الحظر', `✅ انرفع الحظر عن **${user.tag}**.`)], flags: MessageFlags.Ephemeral });
        } catch (e) {
            return interaction.reply({ embeds: [errorEmbed('ما كدرت أرفع الحظر: ' + e.message)], flags: MessageFlags.Ephemeral });
        }
    }
}

// الأمر الرئيسي
module.exports = {
    name: 'panel',
    aliases: ['ادمن', 'لوحة', 'الادارة', 'الأدارة', 'admin'],
    description: 'لوحة التحكم الكاملة للإدارة',

    async execute(context) {
        const member = context.member || context.guild?.members.cache.get(context.user?.id ?? context.author?.id);
        if (!member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return context.reply({ content: '❌ ما عندك صلاحية تستخدم لوحة الإدارة.', flags: MessageFlags.Ephemeral });
        }
        const guild = context.guild;
        const panel = buildAdminPanel(guild);
        return context.reply({ ...panel });
    },

    handleAdminInteraction,
    handleAdminModal,
    buildAdminPanel,
};
