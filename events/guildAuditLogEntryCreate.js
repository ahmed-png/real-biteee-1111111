'use strict';

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildAuditLogEntryCreate,
    async execute(entry, guild) {
        await logger.logAuditEntry(entry, guild);
    },
};
