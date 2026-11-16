'use strict';

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const db = require('../src/database/db');

const openingTickets = new Set();
const acceptingTickets = new Set();

function buildTicketPanel(guild) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎫 الدعم الفني')
        .setDescription([
            `مرحباً بك في دعم **${guild.name}**.`,
            'اضغط الزر أدناه لفتح تكت خاص، وسيتمكن فريق الإدارة من مساعدتك.',
            '',
            '🔒 لا يمكن للأعضاء الآخرين رؤية محادثتك.',
        ].join('\n'))
        .setFooter({ text: 'يرجى فتح تكت واحد فقط للمشكلة نفسها.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_open')
            .setLabel('فتح تكت')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
}

function buildTicketMessage(ownerId, acceptedBy = null) {
    const embed = new EmbedBuilder()
        .setColor(acceptedBy ? '#2ECC71' : '#F1C40F')
        .setTitle('🎫 تذكرة دعم جديدة')
        .setDescription([
            `صاحب التذكرة: <@${ownerId}>`,
            acceptedBy
                ? `الإداري المسؤول: <@${acceptedBy}>`
                : 'اكتب تفاصيل المشكلة هنا، وسيقوم أحد الإداريين بقبول التذكرة.',
        ].join('\n'))
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_accept')
            .setLabel(acceptedBy ? 'تم قبول التكت' : 'قبول التكت')
            .setEmoji(acceptedBy ? '✅' : '👋')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(acceptedBy)),
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('انتهى')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row] };
}

function isTicketStaff(member) {
    return Boolean(
        member?.permissions?.has(PermissionFlagsBits.Administrator)
        || member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    );
}

function ticketRecordForChannel(openTickets, channelId) {
    for (const [ownerId, record] of Object.entries(openTickets || {})) {
        if (record?.channelId === channelId) return { ownerId, ...record };
    }
    return null;
}

function updateOpenTickets(guildId, openTickets) {
    db.updateGuildData(guildId, { ticketOpenTickets: openTickets });
}

function cleanTicketName(username, userId) {
    const safeName = username
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
    return `ticket-${safeName || 'member'}-${userId.slice(-4)}`;
}

async function setupTicketPanel(guild, panelChannel) {
    if (panelChannel.type !== ChannelType.GuildText) {
        throw new Error('شغّل الأمر داخل قناة نصية عادية.');
    }

    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        throw new Error('يحتاج البوت إلى صلاحية إدارة القنوات لإنشاء قنوات التكت.');
    }

    const channelPermissions = panelChannel.permissionsFor(botMember);
    if (
        !channelPermissions?.has(PermissionFlagsBits.ViewChannel)
        || !channelPermissions.has(PermissionFlagsBits.SendMessages)
        || !channelPermissions.has(PermissionFlagsBits.EmbedLinks)
    ) {
        throw new Error('يحتاج البوت إلى عرض القناة وإرسال الرسائل والروابط المضمنة فيها.');
    }

    const guildData = db.getGuildData(guild.id);
    let category = guildData.ticketCategoryId
        ? guild.channels.cache.get(guildData.ticketCategoryId)
        : null;

    if (!category || category.type !== ChannelType.GuildCategory) {
        category = await guild.channels.create({
            name: '🎫 تذاكر الدعم',
            type: ChannelType.GuildCategory,
            reason: 'إعداد فئة نظام التكت',
        });
        db.updateGuildData(guild.id, { ticketCategoryId: category.id });
    }

    const panelMessage = await panelChannel.send(buildTicketPanel(guild));
    db.updateGuildData(guild.id, {
        ticketPanelChannelId: panelChannel.id,
        ticketPanelMessageId: panelMessage.id,
        ticketCategoryId: category.id,
    });

    return { category, panelMessage };
}

async function findExistingTicket(guild, ownerId, openTickets) {
    const record = openTickets[ownerId];
    if (!record?.channelId) return null;

    let channel = guild.channels.cache.get(record.channelId);
    if (!channel) {
        try {
            channel = await guild.channels.fetch(record.channelId);
        } catch (error) {
            if (error.code !== 10003) throw error;
        }
    }

    if (channel) return channel;

    delete openTickets[ownerId];
    updateOpenTickets(guild.id, openTickets);
    return null;
}

async function openTicket(interaction) {
    const guildData = db.getGuildData(interaction.guild.id);
    if (
        guildData.ticketPanelChannelId !== interaction.channelId
        || guildData.ticketPanelMessageId !== interaction.message.id
    ) {
        return interaction.reply({
            content: '❌ لوحة التكت هذه لم تعد مفعّلة. اطلب من إدارة السيرفر تحديث لوحة الدعم.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const lockKey = `${interaction.guild.id}:${interaction.user.id}`;
    if (openingTickets.has(lockKey)) {
        return interaction.reply({
            content: '⏳ جارٍ إنشاء تكتك، انتظر لحظة من فضلك.',
            flags: MessageFlags.Ephemeral,
        });
    }

    openingTickets.add(lockKey);
    let ticketChannel;
    let responseDeferred = false;
    let ticketReady = false;
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        responseDeferred = true;

        const openTickets = { ...(guildData.ticketOpenTickets || {}) };
        const existing = await findExistingTicket(interaction.guild, interaction.user.id, openTickets);
        if (existing) {
            await interaction.editReply(`لديك تكت مفتوح بالفعل: ${existing}`);
            return;
        }

        const botMember = interaction.guild.members.me || await interaction.guild.members.fetchMe();
        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
            await interaction.editReply('❌ لا يستطيع البوت إنشاء قناة التكت. أبلغ إدارة السيرفر.');
            return;
        }

        const data = db.getGuildData(interaction.guild.id);
        const category = data.ticketCategoryId
            ? interaction.guild.channels.cache.get(data.ticketCategoryId)
            : null;
        const staffRoles = interaction.guild.roles.cache.filter(role =>
            role.id !== interaction.guild.id
            && !role.managed
            && (
                role.permissions.has(PermissionFlagsBits.Administrator)
                || role.permissions.has(PermissionFlagsBits.ManageGuild)
            )
        );

        if (staffRoles.size + 3 > 100) {
            await interaction.editReply('❌ لدى السيرفر عدد كبير من رتب الإدارة؛ قلّل رتب إدارة السيرفر قبل فتح التكت.');
            return;
        }

        const staffPermissions = [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
        ];
        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks,
                ],
            },
            {
                id: botMember.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.EmbedLinks,
                ],
            },
            ...staffRoles.map(role => ({ id: role.id, allow: staffPermissions })),
        ];

        ticketChannel = await interaction.guild.channels.create({
            name: cleanTicketName(interaction.user.username, interaction.user.id),
            type: ChannelType.GuildText,
            parent: category?.type === ChannelType.GuildCategory ? category.id : undefined,
            topic: `تذكرة دعم | العضو: ${interaction.user.id}`,
            permissionOverwrites,
            reason: `فتح تكت دعم بواسطة ${interaction.user.tag || interaction.user.id}`,
        });

        openTickets[interaction.user.id] = {
            channelId: ticketChannel.id,
            acceptedBy: null,
            createdAt: Date.now(),
        };
        updateOpenTickets(interaction.guild.id, openTickets);

        await ticketChannel.send({
            ...buildTicketMessage(interaction.user.id),
            content: `<@${interaction.user.id}>`,
            allowedMentions: { users: [interaction.user.id], parse: [] },
        });
        ticketReady = true;
        await interaction.editReply(`✅ تم فتح تكتك الخاص: ${ticketChannel}`);
    } catch (error) {
        console.error(`[TicketSystem] Failed to open ticket in guild ${interaction.guild.id}:`, error);
        if (ticketChannel && !ticketReady) {
            try {
                await ticketChannel.delete('تعذّر إكمال إعداد التكت');
                const currentData = db.getGuildData(interaction.guild.id);
                const openTickets = { ...(currentData.ticketOpenTickets || {}) };
                if (openTickets[interaction.user.id]?.channelId === ticketChannel.id) {
                    delete openTickets[interaction.user.id];
                    updateOpenTickets(interaction.guild.id, openTickets);
                }
            } catch (deleteError) {
                console.error(`[TicketSystem] Failed to clean up ticket channel ${ticketChannel.id}:`, deleteError);
            }
        }
        if (responseDeferred && !ticketReady) {
            await interaction.editReply('❌ تعذّر إنشاء التكت. تحقق من صلاحيات البوت ثم حاول مجدداً.')
                .catch(replyError => console.error('[TicketSystem] Failed to report ticket creation error:', replyError));
        }
    } finally {
        openingTickets.delete(lockKey);
    }
}

async function acceptTicket(interaction) {
    if (!isTicketStaff(interaction.member)) {
        return interaction.reply({
            content: '❌ قبول التكت متاح للإداريين فقط.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const guildData = db.getGuildData(interaction.guild.id);
    const ticket = ticketRecordForChannel(guildData.ticketOpenTickets, interaction.channelId);
    if (!ticket) {
        return interaction.reply({
            content: '❌ هذه القناة ليست تكتاً مفتوحاً.',
            flags: MessageFlags.Ephemeral,
        });
    }
    if (ticket.acceptedBy) {
        return interaction.reply({
            content: `تم قبول هذه التذكرة بالفعل بواسطة <@${ticket.acceptedBy}>.`,
            flags: MessageFlags.Ephemeral,
        });
    }

    if (acceptingTickets.has(interaction.channelId)) {
        return interaction.reply({
            content: '⏳ جارٍ قبول التكت بواسطة إداري آخر.',
            flags: MessageFlags.Ephemeral,
        });
    }

    acceptingTickets.add(interaction.channelId);
    try {
        await interaction.deferUpdate();
        const openTickets = { ...(guildData.ticketOpenTickets || {}) };
        openTickets[ticket.ownerId] = {
            ...openTickets[ticket.ownerId],
            acceptedBy: interaction.user.id,
        };
        await interaction.channel.send({
            content: `✅ تم قبول التكت بواسطة <@${interaction.user.id}>.`,
            allowedMentions: { users: [interaction.user.id], parse: [] },
        });
        updateOpenTickets(interaction.guild.id, openTickets);
        await interaction.message.edit(buildTicketMessage(ticket.ownerId, interaction.user.id));
    } finally {
        acceptingTickets.delete(interaction.channelId);
    }
}

async function closeTicket(interaction) {
    const guildData = db.getGuildData(interaction.guild.id);
    const ticket = ticketRecordForChannel(guildData.ticketOpenTickets, interaction.channelId);
    if (!ticket) {
        return interaction.reply({
            content: '❌ هذه القناة ليست تكتاً مفتوحاً.',
            flags: MessageFlags.Ephemeral,
        });
    }

    if (interaction.user.id !== ticket.ownerId && !isTicketStaff(interaction.member)) {
        return interaction.reply({
            content: '❌ يمكنك إنهاء تكتك فقط، أو اطلب من أحد الإداريين إغلاقه.',
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        await interaction.channel.delete(`انتهت التذكرة بواسطة ${interaction.user.tag || interaction.user.id}`);
    } catch (error) {
        console.error(`[TicketSystem] Failed to close ticket ${interaction.channelId}:`, error);
        await interaction.editReply('❌ تعذّر حذف روم التكت. تحقق من صلاحية إدارة القنوات وحاول مجدداً.')
            .catch(replyError => console.error('[TicketSystem] Failed to report ticket close error:', replyError));
        return;
    }

    const openTickets = { ...(guildData.ticketOpenTickets || {}) };
    delete openTickets[ticket.ownerId];
    updateOpenTickets(interaction.guild.id, openTickets);
    await interaction.editReply('✅ انتهى التكت وتم حذف الروم المؤقت.')
        .catch(error => console.error('[TicketSystem] Ticket was deleted but close confirmation failed:', error));
}

async function handleTicketInteraction(interaction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: '❌ هذا الزر يعمل داخل السيرفر فقط.',
            flags: MessageFlags.Ephemeral,
        });
    }

    switch (interaction.customId) {
        case 'ticket_open':
            return openTicket(interaction);
        case 'ticket_accept':
            return acceptTicket(interaction);
        case 'ticket_close':
            return closeTicket(interaction);
        default:
            return interaction.reply({
                content: '❌ هذا الزر غير معروف.',
                flags: MessageFlags.Ephemeral,
            });
    }
}

module.exports = {
    buildTicketPanel,
    buildTicketMessage,
    isTicketStaff,
    setupTicketPanel,
    handleTicketInteraction,
};
