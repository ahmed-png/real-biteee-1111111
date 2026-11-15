'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let engine;
test.before(async () => {
    await import('../dashboard-ui/public/games/duel-engine.js');
    engine = globalThis.DuelEngine;
});

test('fighter jumps and lands on the upper platform', () => {
    const game = engine.createGame();
    for (let i = 0; i < 16; i++) {
        engine.step(game, { jump: i === 0 }, 0.05);
    }
    assert.equal(game.player.onGround, true);
    assert.equal(game.player.y, 385 - 27);
});

test('weapon changes and shotgun fires three projectiles on cooldown', () => {
    const game = engine.createGame(() => 0.5);
    engine.step(game, { weapon: 1, fire: true, aimX: 810, aimY: 470 }, 0.01);
    assert.equal(game.weapon, 1);
    assert.equal(game.bullets.length, 3);
    engine.step(game, { fire: true, aimX: 810, aimY: 470 }, 0.01);
    assert.equal(game.bullets.length, 3);
});

test('projectiles damage the opponent and declare a winner', () => {
    const game = engine.createGame(() => 0.5);
    game.bot.x = 190;
    game.bot.y = game.player.y;
    game.bot.cooldown = 10;
    for (let i = 0; i < 7; i++) {
        engine.step(game, { fire: true, aimX: 810, aimY: game.player.y }, 0.05);
    }
    assert.equal(game.status, 'over');
    assert.equal(game.winner, 'player');
    assert.equal(game.score, 1);
});

test('game ends when the player is hit, and no further state advances', () => {
    const game = engine.createGame();
    game.player.hp = 5;
    game.bot.cooldown = 0;
    game.bot.x = game.player.x + 40;
    game.bot.y = game.player.y;
    game.bot.facing = -1;
    engine.step(game, {}, 0.05);
    assert.equal(game.status, 'over');
    assert.equal(game.winner, 'bot');
    const time = game.time;
    engine.step(game, { right: true }, 0.05);
    assert.equal(game.time, time);
});
