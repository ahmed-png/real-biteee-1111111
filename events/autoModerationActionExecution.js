'use strict';

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.AutoModerationActionExecution,
    async execute(execution) {
        await logger.logAutoModerationExecution(execution);
    },
};
