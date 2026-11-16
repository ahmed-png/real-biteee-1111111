'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType, Collection, PermissionFlagsBits } = require('discord.js');
const db = require('../src/database/db');
const tickets = require('../utils/ticket-system');

const guildId = '123456789012345678';
const ownerId = '234567890123456789';
const channelId = '345678901234567890';
const savedGetGuildData = db.getGuildData;
const savedUpdateGuildData = db.updateGuildData;
let guildData;

test.beforeEach(() => {
    guildData = {
        ticketPanelChannelId: '456789012345678901',
        ticketPanelMessageId: '567890123456789012',
        ticketCategoryId: '678901234567890123',
        ticketOpenTickets: {
            [ownerId]: { channelId, acceptedBy: null, createdAt: 1 },
        },
    };
    db.getGuildData = () => guildData;
    db.updateGuildData = (id, updates) => {
        assert.equal(id, guildId);
        guildData = { ...guildData, ...updates };
        return guildData;
    };
});

test.after(() => {
    db.getGuildData = savedGetGuildData;
    db.updateGuildData = savedUpdateGuildData;
});

test('ticket panel has an open-ticket button and private-support instructions', () => {
    const panel = tickets.buildTicketPanel({ name: 'Test Guild' });
    assert.match(panel.embeds[0].data.description, /لا يمكن للأعضاء الآخرين رؤية محادثتك/);
    assert.equal(panel.components[0].components[0].data.custom_id, 'ticket_open');
});

test('only administrators and server managers can accept tickets', () => {
    assert.equal(tickets.isTicketStaff({ permissions: { has: bit => bit === PermissionFlagsBits.ManageGuild } }), true);
    assert.equal(tickets.isTicketStaff({ permissions: { has: () => false } }), false);
});

test('opening a ticket creates a private room and prevents duplicate open tickets', async () => {
    guildData.ticketOpenTickets = {};
    const category = { id: guildData.ticketCategoryId, type: ChannelType.GuildCategory };
    const channels = new Collection([[category.id, category]]);
    const roleId = '789012345678901234';
    const staffRole = {
        id: roleId,
        managed: false,
        permissions: { has: bit => bit === PermissionFlagsBits.ManageGuild },
    };
    const createOptions = [];
    let ticketChannel;
    const guild = {
        id: guildId,
        members: {
            me: { id: '890123456789012345', permissions: { has: bit => bit === PermissionFlagsBits.ManageChannels } },
        },
        roles: { cache: new Collection([[roleId, staffRole]]) },
        channels: {
            cache: channels,
            create: async options => {
                createOptions.push(options);
                ticketChannel = {
                    id: '901234567890123456',
                    type: ChannelType.GuildText,
                    send: async () => {},
                    toString: () => `<#901234567890123456>`,
                    delete: async () => {},
                };
                channels.set(ticketChannel.id, ticketChannel);
                return ticketChannel;
            },
        },
    };
    const replies = [];
    const makeInteraction = () => ({
        customId: 'ticket_open',
        guild,
        channelId: guildData.ticketPanelChannelId,
        user: { id: ownerId, username: 'test-member', tag: 'test-member#0001' },
        message: { id: guildData.ticketPanelMessageId },
        deferReply: async () => {},
        editReply: async content => replies.push(content),
        reply: async message => { throw new Error(`Unexpected reply: ${message.content}`); },
    });

    await tickets.handleTicketInteraction(makeInteraction());

    assert.equal(createOptions.length, 1);
    assert.equal(createOptions[0].parent, category.id);
    assert.equal(createOptions[0].type, ChannelType.GuildText);
    assert.equal(createOptions[0].permissionOverwrites[0].deny[0], PermissionFlagsBits.ViewChannel);
    assert.ok(createOptions[0].permissionOverwrites.some(overwrite => overwrite.id === ownerId));
    assert.ok(createOptions[0].permissionOverwrites.some(overwrite => overwrite.id === roleId));
    assert.equal(guildData.ticketOpenTickets[ownerId].channelId, ticketChannel.id);

    await tickets.handleTicketInteraction(makeInteraction());

    assert.equal(createOptions.length, 1);
    assert.match(replies[1], /لديك تكت مفتوح بالفعل/);
});

test('ticket acceptance records the moderator and announces the acceptance in the room', async () => {
    const messages = [];
    let editedMessage;
    let deferred = false;
    const interaction = {
        customId: 'ticket_accept',
        guild: { id: guildId },
        channelId,
        member: { permissions: { has: bit => bit === PermissionFlagsBits.ManageGuild } },
        user: { id: '456789012345678902', tag: 'Moderator#0001' },
        message: { edit: async message => { editedMessage = message; } },
        channel: { send: async message => messages.push(message) },
        deferUpdate: async () => { deferred = true; },
        reply: async message => { throw new Error(`Unexpected reply: ${message.content}`); },
    };

    await tickets.handleTicketInteraction(interaction);

    assert.equal(deferred, true);
    assert.equal(guildData.ticketOpenTickets[ownerId].acceptedBy, interaction.user.id);
    assert.match(messages[0].content, /تم قبول التكت بواسطة/);
    assert.match(messages[0].content, new RegExp(`<@${interaction.user.id}>`));
    assert.equal(editedMessage.components[0].components[0].data.disabled, true);
});

test('ticket close deletes the room and clears the open-ticket record', async () => {
    let deleted = false;
    let reply;
    const interaction = {
        customId: 'ticket_close',
        guild: { id: guildId },
        channelId,
        member: { permissions: { has: () => false } },
        user: { id: ownerId, tag: 'Member#0001' },
        channel: { delete: async () => { deleted = true; } },
        deferReply: async () => {},
        editReply: async content => { reply = content; },
        reply: async message => { throw new Error(`Unexpected reply: ${message.content}`); },
    };

    await tickets.handleTicketInteraction(interaction);

    assert.equal(deleted, true);
    assert.equal(guildData.ticketOpenTickets[ownerId], undefined);
    assert.match(reply, /تم حذف الروم المؤقت/);
});
