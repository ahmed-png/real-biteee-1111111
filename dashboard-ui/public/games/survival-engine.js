(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SurvivalEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const WIDTH = 960;
    const HEIGHT = 540;
    const WEAPONS = [
        { name: 'بندقية', damage: 22, interval: 0.19, speed: 750, spread: 0.035, pellets: 1 },
        { name: 'رشاش', damage: 12, interval: 0.095, speed: 700, spread: 0.12, pellets: 1 },
        { name: 'شوزن', damage: 15, interval: 0.65, speed: 620, spread: 0.22, pellets: 5 }
    ];
    const ENEMIES = [
        { hp: 45, speed: 76, damage: 12, radius: 16, color: '#fb7185', score: 10 },
        { hp: 28, speed: 125, damage: 9, radius: 12, color: '#fbbf24', score: 15 },
        { hp: 130, speed: 48, damage: 24, radius: 23, color: '#a78bfa', score: 30 }
    ];
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function createGame(random = Math.random) {
        return {
            random, player: { x: WIDTH / 2, y: HEIGHT / 2, hp: 100, angle: 0, weapon: 0, cooldown: 0, invulnerable: 0 },
            enemies: [], bullets: [], wave: 0, pending: 0, spawnTimer: 0,
            nextWave: 2, score: 0, kills: 0, elapsed: 0, status: 'playing', events: []
        };
    }

    function spawnEnemy(game) {
        const side = Math.floor(game.random() * 4);
        const type = game.wave >= 4 && game.random() < 0.15 ? 2 : game.wave >= 2 && game.random() < 0.3 ? 1 : 0;
        const spec = ENEMIES[type];
        const x = side === 0 ? 0 : side === 1 ? WIDTH : game.random() * WIDTH;
        const y = side === 2 ? 0 : side === 3 ? HEIGHT : game.random() * HEIGHT;
        game.enemies.push({ x, y, hp: spec.hp + Math.min(game.wave - 1, 10) * 3, type, hit: 0 });
    }

    function step(game, input, dt) {
        game.events = [];
        if (game.status !== 'playing') return;
        dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
        const p = game.player;
        game.elapsed += dt;
        p.cooldown = Math.max(0, p.cooldown - dt);
        p.invulnerable = Math.max(0, p.invulnerable - dt);
        let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
        const magnitude = Math.hypot(dx, dy) || 1;
        p.x = clamp(p.x + dx / magnitude * 220 * dt, 18, WIDTH - 18);
        p.y = clamp(p.y + dy / magnitude * 220 * dt, 18, HEIGHT - 18);
        if (Number.isFinite(input.angle)) p.angle = input.angle;

        if (input.fire && p.cooldown <= 0) {
            const weapon = WEAPONS[p.weapon];
            p.cooldown = weapon.interval;
            for (let i = 0; i < weapon.pellets; i++) {
                const angle = p.angle + (game.random() - 0.5) * weapon.spread * 2;
                game.bullets.push({ x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22,
                    vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed, damage: weapon.damage, life: 0.9 });
            }
            game.events.push('shoot');
        }

        if (!game.pending && !game.enemies.length) {
            game.nextWave -= dt;
            if (game.nextWave <= 0) {
                game.wave++;
                game.pending = 4 + game.wave * 2;
                game.spawnTimer = 0;
                if (game.wave > 1) p.hp = Math.min(100, p.hp + 15);
                game.events.push('wave');
            }
        }
        if (game.pending > 0) {
            game.spawnTimer -= dt;
            if (game.spawnTimer <= 0) {
                spawnEnemy(game);
                game.pending--;
                game.spawnTimer = Math.max(0.18, 0.65 - game.wave * 0.025);
            }
            if (!game.pending) game.nextWave = 3;
        }

        for (const bullet of game.bullets) {
            const oldX = bullet.x;
            const oldY = bullet.y;
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            bullet.life -= dt;
            for (const enemy of game.enemies) {
                const dx = bullet.x - oldX;
                const dy = bullet.y - oldY;
                const lengthSquared = dx * dx + dy * dy;
                const t = lengthSquared ? clamp(((enemy.x - oldX) * dx + (enemy.y - oldY) * dy) / lengthSquared, 0, 1) : 0;
                if (enemy.hp > 0 && Math.hypot(oldX + dx * t - enemy.x, oldY + dy * t - enemy.y) < ENEMIES[enemy.type].radius + 4) {
                    enemy.hp -= bullet.damage;
                    enemy.hit = 0.1;
                    bullet.life = 0;
                    game.events.push('hit');
                    if (enemy.hp <= 0) {
                        game.score += ENEMIES[enemy.type].score;
                        game.kills++;
                        game.events.push('kill');
                    }
                    break;
                }
            }
        }
        game.bullets = game.bullets.filter(b => b.life > 0 && b.x >= 0 && b.x <= WIDTH && b.y >= 0 && b.y <= HEIGHT);
        game.enemies = game.enemies.filter(e => e.hp > 0);
        for (const enemy of game.enemies) {
            const spec = ENEMIES[enemy.type];
            const distance = Math.hypot(p.x - enemy.x, p.y - enemy.y) || 1;
            enemy.x += (p.x - enemy.x) / distance * spec.speed * dt;
            enemy.y += (p.y - enemy.y) / distance * spec.speed * dt;
            enemy.hit = Math.max(0, enemy.hit - dt);
            if (distance < spec.radius + 15 && p.invulnerable <= 0) {
                p.hp = Math.max(0, p.hp - spec.damage);
                p.invulnerable = 0.8;
                game.events.push('damage');
                if (p.hp === 0) {
                    game.status = 'over';
                    game.events.push('over');
                    break;
                }
            }
        }
    }

    function nearestAngle(game) {
        const p = game.player;
        let nearest = null;
        let distance = Infinity;
        for (const enemy of game.enemies) {
            const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (d < distance) { nearest = enemy; distance = d; }
        }
        return nearest ? Math.atan2(nearest.y - p.y, nearest.x - p.x) : p.angle;
    }

    return { WIDTH, HEIGHT, WEAPONS, ENEMIES, createGame, step, nearestAngle };
});
