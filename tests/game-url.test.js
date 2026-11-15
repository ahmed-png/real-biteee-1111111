'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGameUrl } = require('../utils/game-url');

test('game URL parameters round-trip unicode and reserved username characters', () => {
    const username = 'لاعب 100% #1';
    const url = new URL(buildGameUrl('https://example.onrender.com/', 'snake.html', {
        name: username,
        mode: 'multi',
    }));

    assert.equal(url.origin, 'https://example.onrender.com');
    assert.equal(url.pathname, '/games/snake.html');
    assert.equal(url.searchParams.get('name'), username);
    assert.equal(url.searchParams.get('mode'), 'multi');
});

test('game URLs reject non-game filenames', () => {
    assert.throws(() => buildGameUrl('https://example.com', '../index.html'), /valid HTML filename/);
});
