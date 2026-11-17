'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const randomInteractions = require('../utils/random-interactions');

test('automatic bot messages avoid common non-Iraqi dialect markers', () => {
    const messages = [
        ...Object.values(randomInteractions.moodMessages).flat(),
        ...randomInteractions.jokes,
        ...randomInteractions.facts,
        ...randomInteractions.challenges.map(challenge => challenge.msg),
    ];
    const nonIraqiPhrases = /(?:^|[\s،.!؟])(?:شو|الحين|إيش|وايد|وش|مين|كيف)(?=$|[\s،.!؟])/u;

    assert.ok(messages.length > 40);
    assert.ok(messages.every(message => !nonIraqiPhrases.test(message)));
});
