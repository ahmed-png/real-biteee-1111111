(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DuelEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const WIDTH = 960;
    const HEIGHT = 540;
    const GRAVITY = 1250;
    const PLAYER_SPEED = 245;
    const JUMP_SPEED = 540;
    const FLOOR = 502;
    const PLATFORMS = [
        { x: 110, y: 385, w: 190, h: 16 },
        { x: 385, y: 315, w: 190, h: 16 },
        { x: 660, y: 385, w: 190, h: 16 },
        { x: 360, y: 190, w: 240, h: 16 }
    ];
    const WEAPONS = [
        { name: 'بندقية', damage: 16, interval: 0.24, speed: 610, pellets: 1, spread: 0.03 },
        { name: 'شوزن', damage: 10, interval: 0.68, speed: 560, pellets: 3, spread: 0.22 }
    ];
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function fighter(x, isBot = false) {
        return { x, y: FLOOR - 27, vx: 0, vy: 0, hp: 100, facing: isBot ? -1 : 1,
            onGround: true, cooldown: 0, invulnerable: 0, isBot };
    }

    function createGame(random = Math.random) {
        return { random, player: fighter(150), bot: fighter(810, true), bullets: [],
            weapon: 0, time: 0, status: 'playing', winner: null, botJumpTimer: 0,
            events: [], score: 0 };
    }

    function moveFighter(entity, direction, jump, dt) {
        entity.vx = direction * PLAYER_SPEED;
        if (direction) entity.facing = Math.sign(direction);
        if (jump && entity.onGround) {
            entity.vy = -JUMP_SPEED;
            entity.onGround = false;
        }

        const oldBottom = entity.y + 27;
        entity.x = clamp(entity.x + entity.vx * dt, 20, WIDTH - 20);
        entity.vy = Math.min(entity.vy + GRAVITY * dt, 900);
        entity.y += entity.vy * dt;
        entity.onGround = false;

        if (entity.vy >= 0) {
            const newBottom = entity.y + 27;
            for (const platform of PLATFORMS) {
                if (oldBottom <= platform.y && newBottom >= platform.y &&
                    entity.x + 14 > platform.x && entity.x - 14 < platform.x + platform.w) {
                    entity.y = platform.y - 27;
                    entity.vy = 0;
                    entity.onGround = true;
                    break;
                }
            }
        }
        if (entity.y + 27 >= FLOOR) {
            entity.y = FLOOR - 27;
            entity.vy = 0;
            entity.onGround = true;
        }
    }

    function fire(game, entity, targetX, targetY) {
        if (entity.cooldown > 0) return;
        const weapon = WEAPONS[game.weapon];
        entity.cooldown = weapon.interval;
        const dx = targetX - entity.x;
        const dy = targetY - (entity.y - 4);
        const angle = Math.atan2(dy, dx);
        entity.facing = dx < 0 ? -1 : 1;
        for (let i = 0; i < weapon.pellets; i++) {
            const spread = weapon.pellets === 1 ? 0 : (i - (weapon.pellets - 1) / 2) * weapon.spread;
            const shotAngle = angle + spread;
            game.bullets.push({ x: entity.x + Math.cos(shotAngle) * 23,
                y: entity.y - 5 + Math.sin(shotAngle) * 23,
                vx: Math.cos(shotAngle) * weapon.speed, vy: Math.sin(shotAngle) * weapon.speed,
                owner: entity.isBot ? 'bot' : 'player', damage: weapon.damage, life: 1.4 });
        }
        game.events.push('shoot');
    }

    function step(game, input, dt) {
        game.events = [];
        if (game.status !== 'playing') return;
        dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
        game.time += dt;
        for (const entity of [game.player, game.bot]) {
            entity.cooldown = Math.max(0, entity.cooldown - dt);
            entity.invulnerable = Math.max(0, entity.invulnerable - dt);
        }

        const bot = game.bot;
        let botDirection = Math.abs(bot.x - game.player.x) > 250 ? Math.sign(game.player.x - bot.x) : 0;
        game.botJumpTimer -= dt;
        const blocker = PLATFORMS.some(platform => Math.abs(bot.x - platform.x) < 70 &&
            Math.abs(bot.y - platform.y) < 65 && bot.onGround);
        const botJump = bot.onGround && (blocker || (game.player.y < bot.y - 70 && game.botJumpTimer <= 0));
        if (botJump) game.botJumpTimer = 1.1 + game.random() * 0.8;
        moveFighter(bot, botDirection, botJump, dt);
        if (Math.abs(game.player.x - bot.x) < 560) fire(game, bot, game.player.x, game.player.y - 5);

        moveFighter(game.player, (input.right ? 1 : 0) - (input.left ? 1 : 0), input.jump, dt);
        if (input.weapon !== undefined && WEAPONS[input.weapon]) game.weapon = input.weapon;
        if (Number.isFinite(input.aimX)) game.player.facing = input.aimX < game.player.x ? -1 : 1;
        if (input.fire) {
            const targetX = Number.isFinite(input.aimX) ? input.aimX : bot.x;
            const targetY = Number.isFinite(input.aimY) ? input.aimY : bot.y - 5;
            fire(game, game.player, targetX, targetY);
        }

        for (const bullet of game.bullets) {
            const oldX = bullet.x, oldY = bullet.y;
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            bullet.life -= dt;
            const target = bullet.owner === 'bot' ? game.player : game.bot;
            const dx = bullet.x - oldX, dy = bullet.y - oldY;
            const length = dx * dx + dy * dy;
            const t = length ? clamp(((target.x - oldX) * dx + (target.y - 5 - oldY) * dy) / length, 0, 1) : 0;
            if (target.invulnerable <= 0 &&
                Math.hypot(oldX + dx * t - target.x, oldY + dy * t - (target.y - 5)) < 22) {
                target.hp = Math.max(0, target.hp - bullet.damage);
                target.invulnerable = 0.3;
                bullet.life = 0;
                game.events.push(bullet.owner === 'bot' ? 'damage' : 'hit');
            }
        }
        game.bullets = game.bullets.filter(b => b.life > 0 && b.x > 0 && b.x < WIDTH && b.y > 0 && b.y < HEIGHT);
        if (game.bot.hp <= 0 || game.player.hp <= 0) {
            game.status = 'over';
            game.winner = game.bot.hp <= 0 ? 'player' : 'bot';
            if (game.winner === 'player') game.score++;
            game.events.push('over');
        }
    }

    return { WIDTH, HEIGHT, FLOOR, PLATFORMS, WEAPONS, createGame, step };
});
