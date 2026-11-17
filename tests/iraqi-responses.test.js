'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const db = require('../src/database/db');
const protection = require('../utils/protection');
const aiMiddleware = require('../src/middleware/ai');
const {
    DEFAULT_IRAQI_RESPONSES,
    findMatchingResponse,
    normalizeIraqiText,
} = require('../utils/iraqi-responses');

test('default Iraqi reply catalog contains about 150 unique triggers', () => {
    const triggers = DEFAULT_IRAQI_RESPONSES.map(item => normalizeIraqiText(item.trigger));

    assert.ok(DEFAULT_IRAQI_RESPONSES.length >= 150 && DEFAULT_IRAQI_RESPONSES.length <= 160);
    assert.equal(new Set(triggers).size, triggers.length);
    assert.ok(DEFAULT_IRAQI_RESPONSES.every(item => item.id && item.trigger && item.response && item.enabled));
});

test('reply matching normalizes Arabic and prefers the most specific phrase', () => {
    const match = findMatchingResponse('هلا، شلونك؟');
    assert.equal(match.trigger, 'شلونك');
    assert.equal(findMatchingResponse('أَلْسَّلَامُ عَلَيْكُمْ').trigger, 'السلام عليكم');
    assert.equal(findMatchingResponse('هلاوه'), null);
});

test('disabled replies are skipped while other enabled replies remain available', () => {
    const responses = [
        { id: 'disabled', trigger: 'هلا', response: 'disabled reply', enabled: false },
        { id: 'enabled', trigger: 'شلونك', response: 'enabled reply', enabled: true },
    ];

    assert.equal(findMatchingResponse('هلا', responses), null);
    assert.equal(findMatchingResponse('شلونك', responses).response, 'enabled reply');
});

test('AI middleware uses the server-specific Iraqi reply before other chat responses', async () => {
    const originalGetGuildData = db.getGuildData;
    const originalRestrictionCheck = protection.isPersonalChatRestricted;
    const replies = [];
    db.getGuildData = () => ({ iraqiResponsesEnabled: true, iraqiResponses: [] });
    protection.isPersonalChatRestricted = () => false;

    try {
        const message = {
            content: 'شلونك؟',
            guild: { id: 'iraqi-response-test', roles: { everyone: {} } },
            channel: { permissionsFor: () => ({ has: () => true }) },
            author: { id: 'member-test', username: 'member', bot: false },
            reply: async payload => replies.push(payload),
        };

        const proceed = await aiMiddleware(message);
        assert.equal(proceed, false);
        assert.equal(replies.length, 1);
        assert.equal(replies[0].content, findMatchingResponse(message.content).response);
        assert.deepEqual(replies[0].allowedMentions, { parse: [] });
    } finally {
        db.getGuildData = originalGetGuildData;
        protection.isPersonalChatRestricted = originalRestrictionCheck;
    }
});
