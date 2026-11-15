'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
let engine;
test.before(async () => {
    await import('../dashboard-ui/public/games/survival-engine.js');
    engine = globalThis.SurvivalEngine;
});

const idle = { up: false, down: false, left: false, right: false, fire: false, angle: 0 };

test('waves spawn enemies and recover health between waves', () => {
    const game = engine.createGame(() => 0.5);
    game.nextWave = 0;
    engine.step(game, idle, 0.05);
    assert.equal(game.wave, 1);
    assert.equal(game.enemies.length, 1);
    assert.equal(game.pending, 5);
    game.pending = 0;
    game.enemies = [];
    game.nextWave = 0;
    game.player.hp = 90;
    engine.step(game, idle, 0.05);
    assert.equal(game.wave, 2);
    assert.equal(game.player.hp, 100);
});

test('movement is normalized and stays within the arena', () => {
    const game = engine.createGame();
    const x = game.player.x, y = game.player.y;
    engine.step(game, { ...idle, right: true, down: true }, 0.05);
    assert.ok(Math.abs(Math.hypot(game.player.x - x, game.player.y - y) - 11) < 1e-8);
    game.player.x = 18;
    engine.step(game, { ...idle, left: true }, 0.05);
    assert.equal(game.player.x, 18);
});

test('shotgun fires five pellets and obeys cooldown', () => {
    const game = engine.createGame(() => 0.5);
    game.player.weapon = 2;
    engine.step(game, { ...idle, fire: true }, 0.01);
    assert.equal(game.bullets.length, 5);
    engine.step(game, { ...idle, fire: true }, 0.01);
    assert.equal(game.bullets.length, 5);
});

test('fast bullets hit enemies along their path and award score once', () => {
    const game = engine.createGame(() => 0.5);
    game.enemies.push({ x: 130, y: 100, hp: 10, type: 0, hit: 0 });
    game.bullets.push({ x: 100, y: 100, vx: 750, vy: 0, damage: 22, life: 1 });
    engine.step(game, idle, 0.05);
    assert.equal(game.enemies.length, 0);
    assert.equal(game.score, 10);
    assert.equal(game.kills, 1);
    assert.equal(game.bullets.length, 0);
});

test('enemy damage respects invulnerability and ends the game', () => {
    const game = engine.createGame();
    game.player.hp = 12;
    game.enemies.push({ x: game.player.x, y: game.player.y, hp: 45, type: 0, hit: 0 });
    engine.step(game, idle, 0.01);
    assert.equal(game.status, 'over');
    assert.equal(game.player.hp, 0);
    assert.ok(game.events.includes('over'));

    const other = engine.createGame();
    other.enemies.push({ x: other.player.x, y: other.player.y, hp: 45, type: 0, hit: 0 });
    engine.step(other, idle, 0.01);
    engine.step(other, idle, 0.01);
    assert.equal(other.player.hp, 88);
});

test('automatic aim targets the nearest enemy', () => {
    const game = engine.createGame();
    game.enemies = [{ x: 480, y: 370 }, { x: 560, y: 270 }];
    assert.equal(engine.nearestAngle(game), 0);
});
