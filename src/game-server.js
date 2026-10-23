'use strict';

/**
 * ════════════════════════════════════════════════════════════════
 * 🎮 Game Server — Real-time Multiplayer Engine
 * Manages game rooms for all 6 2D arcade games via Socket.io:
 *  1. ⚔️ Battle Arena   (60 FPS physics, weapons, up to 4 players)
 *  2. 🛡️ Tank Clash     (Tactical neon tank battles, up to 4 players)
 *  3. 🐍 Snake 2.0      (Multiplayer neon snake, grid arena)
 *  4. 🚀 Space Defender (Co-op space wave defense, 2 players)
 *  5. 🃏 Memory Match   (Multiplayer card-matching turn-based duel)
 *  6. 🌩️ Cyber Jump     (Multiplayer cyberpunk platform race)
 *
 * STATELESS: No persistent DB writes — in-memory only, wiped on close.
 * ════════════════════════════════════════════════════════════════
 */

const { Server } = require('socket.io');

// ── Constants ────────────────────────────────────────────────────
const MAX_PLAYERS_PER_ROOM = 4;
const ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 min idle wipe
const COLORS = ['#00ffaa','#ff3366','#ffdd00','#00aaff','#ff8844','#aa55ff','#ff55aa','#55ffaa'];

// ── In-Memory Room Store ─────────────────────────────────────────
const rooms = new Map(); // roomId → RoomState

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

// ════════════════════════════════════════════════════════════════
// 1. ⚔️ BATTLE ARENA ENGINE
// ════════════════════════════════════════════════════════════════
const ARENA = {
    W: 1280, H: 720,
    GRAVITY: 0.55,
    PLATFORMS: [
        { x: 0,   y: 680, w: 1280, h: 40 },  // Ground
        { x: 100, y: 510, w: 200,  h: 18 },
        { x: 450, y: 460, w: 220,  h: 18 },
        { x: 980, y: 510, w: 200,  h: 18 },
        { x: 250, y: 360, w: 160,  h: 18 },
        { x: 620, y: 300, w: 200,  h: 18 },
        { x: 870, y: 360, w: 160,  h: 18 },
        { x: 50,  y: 210, w: 140,  h: 18 },
        { x: 1090,y: 210, w: 140,  h: 18 },
        { x: 500, y: 160, w: 280,  h: 18 },
    ],
};

const WEAPONS = ['sword','shotgun','rocket','laser','shield','speed','bomb','dual'];
const WEAPON_STATS = {
    sword:   { dmg: 35, range: 80,  cooldown: 25, color: '#c0c0c0', emoji: '⚔️',  type: 'melee',   ammo: -1 },
    shotgun: { dmg: 60, range: 400, cooldown: 40, color: '#ff8844', emoji: '🔫',  type: 'ranged',  ammo: 6  },
    rocket:  { dmg: 90, range: 600, cooldown: 70, color: '#ff3355', emoji: '🚀',  type: 'ranged',  ammo: 3  },
    laser:   { dmg: 20, range: 700, cooldown: 8,  color: '#00ffff', emoji: '🔦',  type: 'ranged',  ammo: 20 },
    shield:  { dmg: 10, range: 60,  cooldown: 20, color: '#4488ff', emoji: '🛡️', type: 'melee',   ammo: 15 },
    speed:   { dmg: 15, range: 70,  cooldown: 15, color: '#ffdd00', emoji: '⚡',  type: 'melee',   ammo: -1 },
    bomb:    { dmg: 80, range: 150, cooldown: 90, color: '#ff6600', emoji: '💣',  type: 'throw',   ammo: 2  },
    dual:    { dmg: 25, range: 350, cooldown: 18, color: '#aa55ff', emoji: '🔫',  type: 'ranged',  ammo: 16 },
};

function createBattlePlayer(socketId, username, avatar, color, isBot = false) {
    const spawnX = 100 + Math.random() * 1080;
    return {
        id: socketId, username, avatar, color, isBot,
        x: spawnX, y: 200, vx: 0, vy: 0,
        hp: 100, maxHp: 100,
        weapon: null, ammo: 0,
        dir: 1, onGround: false, jumping: false,
        dead: false, respawnTimer: 0,
        kills: 0, deaths: 0,
        invincible: 0,
        keys: { left: false, right: false, jump: false, attack: false },
        attackCooldown: 0,
        speedBoost: 0,
        shielded: false,
        shieldHp: 0,
    };
}

function createBattleRoom(mode, hostId, hostName, hostAvatar) {
    const id = generateRoomId();
    const room = {
        id, gameType: 'battle', mode,
        hostId,
        players: new Map(),
        bullets: [],
        pickups: [],
        state: 'waiting',
        timeLeft: 300,
        tickCount: 0,
        tickInterval: null,
        maxPlayers: mode === 'solo' ? 1 : MAX_PLAYERS_PER_ROOM,
        killLimit: 10,
        winner: null,
    };

    room.players.set(hostId, createBattlePlayer(hostId, hostName, hostAvatar, COLORS[0]));

    if (mode === 'bot') {
        const botNames = ['CyberBot α', 'NeonBot β', 'RoboBot γ'];
        for (let i = 0; i < 3; i++) {
            const botId = `bot_${id}_${i}`;
            const bot = createBattlePlayer(botId, botNames[i], null, COLORS[i + 1], true);
            room.players.set(botId, bot);
        }
    }

    spawnBattlePickups(room, 5);
    rooms.set(id, room);
    return room;
}

function spawnBattlePickups(room, count = 2) {
    for (let i = 0; i < count; i++) {
        const plat = ARENA.PLATFORMS[Math.floor(Math.random() * ARENA.PLATFORMS.length)];
        const wType = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
        room.pickups.push({
            id: Date.now() + Math.random(),
            x: plat.x + 20 + Math.random() * (plat.w - 40),
            y: plat.y - 28,
            weapon: wType,
            bobPhase: Math.random() * Math.PI * 2,
        });
    }
}

function onArenaPlatform(p) {
    for (const plat of ARENA.PLATFORMS) {
        if (p.x + 15 > plat.x && p.x - 15 < plat.x + plat.w) {
            if (p.y + 30 >= plat.y && p.y + 30 <= plat.y + plat.h + 10 && p.vy >= 0) {
                return plat;
            }
        }
    }
    return null;
}

function applyBattlePhysics(p) {
    if (p.dead) return;
    const speed = 5.5 + (p.speedBoost > 0 ? 3 : 0);
    if (p.keys.left)       { p.vx = -speed; p.dir = -1; }
    else if (p.keys.right) { p.vx = speed;  p.dir = 1;  }
    else p.vx *= 0.75;

    if (p.keys.jump && p.onGround) {
        p.vy = -13.5;
        p.onGround = false;
    }

    p.vy += ARENA.GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    const plat = onArenaPlatform(p);
    if (plat) {
        p.y = plat.y - 30;
        p.vy = 0;
        p.onGround = true;
    } else {
        p.onGround = false;
    }

    p.x = Math.max(20, Math.min(ARENA.W - 20, p.x));
    if (p.y > ARENA.H + 100) {
        p.dead = true;
        p.deaths++;
        p.hp = 0;
        p.respawnTimer = 180;
    }
    if (p.speedBoost > 0) p.speedBoost--;
    if (p.attackCooldown > 0) p.attackCooldown--;
    if (p.invincible > 0) p.invincible--;
}

function updateBattleBot(bot, room) {
    if (bot.dead) return;
    const enemies = [...room.players.values()].filter(p => !p.isBot && !p.dead);
    if (!enemies.length) return;
    const target = enemies.reduce((a, b) =>
        Math.hypot(a.x - bot.x, a.y - bot.y) < Math.hypot(b.x - bot.x, b.y - bot.y) ? a : b
    );

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const dist = Math.hypot(dx, dy);

    bot.keys.left  = dx < -30;
    bot.keys.right = dx > 30;
    bot.keys.jump  = (dy < -80 || (bot.vy === 0 && !bot.onGround)) && bot.onGround;

    if (!bot.weapon) {
        const nearPickup = room.pickups.reduce((a, b) => {
            const da = Math.hypot(a.x - bot.x, a.y - bot.y);
            const db = Math.hypot(b.x - bot.x, b.y - bot.y);
            return da < db ? a : b;
        }, { x: Infinity, y: Infinity });
        if (nearPickup.x !== Infinity) {
            const nearDx = nearPickup.x - bot.x;
            bot.keys.left  = nearDx < -10;
            bot.keys.right = nearDx > 10;
        }
    }

    const ws = bot.weapon ? WEAPON_STATS[bot.weapon] : WEAPON_STATS.sword;
    bot.keys.attack = (dist < ws.range * 0.85 && bot.attackCooldown === 0);
}

function processBattleAttack(attacker, room) {
    if (!attacker.keys.attack || attacker.attackCooldown > 0 || attacker.dead) return;
    const ws = attacker.weapon ? WEAPON_STATS[attacker.weapon] : WEAPON_STATS.sword;
    attacker.attackCooldown = ws.cooldown;

    if (ws.type === 'melee') {
        room.players.forEach(target => {
            if (target.id === attacker.id || target.dead) return;
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const dist = Math.hypot(dx, dy);
            if (dist < ws.range && Math.sign(dx) === attacker.dir) {
                applyBattleDamage(target, attacker, ws.dmg * (0.8 + Math.random() * 0.4), room);
                target.vx += attacker.dir * 8;
                target.vy = -5;
            }
        });
        if (attacker.weapon && ws.ammo > 0) {
            if (attacker.ammo !== -1) attacker.ammo--;
            if (attacker.ammo === 0) attacker.weapon = null;
        }
    } else if (ws.type === 'ranged') {
        room.bullets.push({
            id: Date.now() + Math.random(),
            ownerId: attacker.id,
            x: attacker.x + attacker.dir * 20,
            y: attacker.y - 10,
            vx: attacker.dir * (attacker.weapon === 'laser' ? 22 : attacker.weapon === 'rocket' ? 8 : 14),
            vy: 0,
            dmg: ws.dmg,
            weapon: attacker.weapon,
            life: attacker.weapon === 'laser' ? 80 : 60,
            explode: attacker.weapon === 'rocket' || attacker.weapon === 'bomb',
            color: ws.color,
        });
        if (attacker.ammo !== -1) { attacker.ammo--; if (attacker.ammo === 0) attacker.weapon = null; }
    } else if (ws.type === 'throw') {
        room.bullets.push({
            id: Date.now() + Math.random(),
            ownerId: attacker.id,
            x: attacker.x, y: attacker.y - 20,
            vx: attacker.dir * 6, vy: -8,
            dmg: ws.dmg, weapon: attacker.weapon,
            life: 90, explode: true, color: ws.color,
            gravity: true,
        });
        if (attacker.ammo !== -1) { attacker.ammo--; if (attacker.ammo === 0) attacker.weapon = null; }
    }
}

function applyBattleDamage(target, attacker, dmg, room) {
    if (target.invincible > 0) return;
    if (target.shielded && target.shieldHp > 0) {
        target.shieldHp = Math.max(0, target.shieldHp - dmg * 0.3);
        if (target.shieldHp === 0) target.shielded = false;
        return;
    }
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp === 0 && !target.dead) {
        target.dead = true;
        target.deaths++;
        if (attacker) attacker.kills++;
        target.respawnTimer = 200;
    }
}

function updateBattleBullets(room) {
    room.bullets = room.bullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.gravity) b.vy += ARENA.GRAVITY * 0.5;
        b.life--;
        if (b.life <= 0) return false;
        if (b.x < 0 || b.x > ARENA.W) return false;

        if (b.explode && (b.y > ARENA.H || b.x < 0 || b.x > ARENA.W)) {
            explodeBattleAt(b, room);
            return false;
        }

        for (const [, target] of room.players) {
            if (target.id === b.ownerId || target.dead) continue;
            if (Math.abs(target.x - b.x) < 24 && Math.abs(target.y - b.y) < 28) {
                const attacker = room.players.get(b.ownerId);
                if (b.explode) { explodeBattleAt(b, room); return false; }
                applyBattleDamage(target, attacker, b.dmg * (0.85 + Math.random() * 0.3), room);
                target.vx += b.vx * 0.3; target.vy -= 2;
                return false;
            }
        }
        return true;
    });
}

function explodeBattleAt(b, room) {
    room.players.forEach(target => {
        if (target.id === b.ownerId || target.dead) return;
        const dist = Math.hypot(target.x - b.x, target.y - b.y);
        if (dist < 150) {
            const attacker = room.players.get(b.ownerId);
            const falloff = 1 - dist / 150;
            applyBattleDamage(target, attacker, b.dmg * falloff * (0.8 + Math.random() * 0.4), room);
            target.vx += (target.x - b.x) / dist * 10;
            target.vy -= 6;
        }
    });
}

function updateBattlePickups(room) {
    room.players.forEach(p => {
        if (p.dead) return;
        room.pickups = room.pickups.filter(pickup => {
            const dist = Math.hypot(pickup.x - p.x, pickup.y - p.y);
            if (dist < 35) {
                const ws = WEAPON_STATS[pickup.weapon];
                p.weapon = pickup.weapon;
                p.ammo = ws.ammo;
                p.attackCooldown = 0;
                if (pickup.weapon === 'speed') { p.speedBoost = 300; p.weapon = null; }
                if (pickup.weapon === 'shield') { p.shielded = true; p.shieldHp = 80; p.weapon = null; }
                return false;
            }
            return true;
        });
    });

    if (room.tickCount % 360 === 0 && room.pickups.length < 6) {
        spawnBattlePickups(room, 2);
    }
}

function updateBattleRespawns(room) {
    room.players.forEach(p => {
        if (!p.dead) return;
        p.respawnTimer--;
        if (p.respawnTimer <= 0) {
            p.dead = false;
            p.hp = 100;
            p.x = 150 + Math.random() * 980;
            p.y = 100;
            p.vx = 0; p.vy = 0;
            p.weapon = null; p.ammo = 0;
            p.invincible = 150;
        }
    });
}

function checkBattleWin(room, io) {
    if (room.state !== 'playing') return;
    const alive = [...room.players.values()];
    const leader = alive.reduce((a, b) => (a.kills > b.kills ? a : b), alive[0]);
    if (leader && (leader.kills >= room.killLimit || room.timeLeft <= 0)) {
        room.state = 'gameover';
        room.winner = { name: leader.username, kills: leader.kills, color: leader.color };
        io.to(room.id).emit('gameOver', room.winner);
        stopRoomTick(room);
    }
}

function startBattleTick(room, io) {
    if (room.tickInterval) return;
    room.state = 'playing';

    room.tickInterval = setInterval(() => {
        room.tickCount++;
        if (room.tickCount % 60 === 0) room.timeLeft--;

        room.players.forEach(p => { if (p.isBot) updateBattleBot(p, room); });
        room.players.forEach(p => applyBattlePhysics(p));
        room.players.forEach(p => processBattleAttack(p, room));
        updateBattleBullets(room);
        updateBattlePickups(room);
        updateBattleRespawns(room);
        checkBattleWin(room, io);

        if (room.tickCount % 3 === 0 && room.state === 'playing') {
            io.to(room.id).emit('gameState', buildBattleSnapshot(room));
        }
    }, 1000 / 60);
}

function buildBattleSnapshot(room) {
    return {
        t: room.tickCount,
        tl: room.timeLeft,
        players: [...room.players.values()].map(p => ({
            id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy,
            hp: p.hp, maxHp: p.maxHp, dir: p.dir, dead: p.dead,
            weapon: p.weapon, ammo: p.ammo, kills: p.kills, deaths: p.deaths,
            invincible: p.invincible > 0, shielded: p.shielded,
            username: p.username, color: p.color, avatar: p.avatar, isBot: p.isBot,
            respawnTimer: p.respawnTimer, attackCooldown: p.attackCooldown,
        })),
        bullets: room.bullets.map(b => ({
            id: b.id, x: b.x, y: b.y, weapon: b.weapon, color: b.color,
        })),
        pickups: room.pickups.map(pk => ({
            id: pk.id, x: pk.x, y: pk.y, weapon: pk.weapon, bobPhase: pk.bobPhase,
        })),
    };
}


// ════════════════════════════════════════════════════════════════
// 2. 🛡️ TANK CLASH ENGINE
// ════════════════════════════════════════════════════════════════
const TANK_ARENA = {
    W: 800, H: 520,
    WALLS: [
        { x: 140, y: 100, w: 20, h: 120 },
        { x: 640, y: 100, w: 20, h: 120 },
        { x: 140, y: 300, w: 20, h: 120 },
        { x: 640, y: 300, w: 20, h: 120 },
        { x: 300, y: 160, w: 200, h: 20 },
        { x: 300, y: 340, w: 200, h: 20 },
        { x: 380, y: 220, w: 40, h: 80 },
    ],
    SPAWNS: [
        { x: 100, y: 100, angle: 0 },
        { x: 700, y: 100, angle: Math.PI },
        { x: 100, y: 420, angle: 0 },
        { x: 700, y: 420, angle: Math.PI }
    ]
};

function createTankPlayer(socketId, name, color, isBot = false, spawnIndex = 0) {
    const sp = TANK_ARENA.SPAWNS[spawnIndex % TANK_ARENA.SPAWNS.length];
    return {
        id: socketId, name, color, isBot,
        x: sp.x, y: sp.y, angle: sp.angle, turretAngle: sp.angle,
        hp: 100, maxHp: 100,
        speed: 3.2, turnSpeed: 0.055,
        weapon: 'cannon', ammo: -1, shield: 0,
        alive: true, kills: 0,
        shootCooldown: 0,
        keys: { up: false, down: false, left: false, right: false, fire: false }
    };
}

function createTankRoom(mode, hostId, hostName, hostColor) {
    const id = generateRoomId();
    const room = {
        id, gameType: 'tank', mode,
        hostId, state: 'waiting',
        tanks: new Map(),
        bullets: [],
        crates: [],
        timeLeft: 180,
        tickCount: 0,
        tickInterval: null,
        maxPlayers: mode === 'solo' ? 1 : MAX_PLAYERS_PER_ROOM,
    };

    room.tanks.set(hostId, createTankPlayer(hostId, hostName, hostColor || COLORS[0], false, 0));

    if (mode === 'bot') {
        const botNames = ['روبوت الصاعقة', 'دبابة الشبح', 'مدرعة الفولاذ'];
        for (let i = 0; i < 3; i++) {
            const bId = `bot_tank_${id}_${i}`;
            room.tanks.set(bId, createTankPlayer(bId, botNames[i], COLORS[i + 1], true, i + 1));
        }
    }

    spawnTankCrates(room, 3);
    rooms.set(id, room);
    return room;
}

function spawnTankCrates(room, count = 2) {
    const weapons = ['missile', 'plasma', 'shield', 'mines'];
    for (let i = 0; i < count; i++) {
        const wKey = weapons[Math.floor(Math.random() * weapons.length)];
        let x, y, safe = false, tries = 0;
        while (!safe && tries < 20) {
            tries++;
            x = 80 + Math.random() * (TANK_ARENA.W - 160);
            y = 80 + Math.random() * (TANK_ARENA.H - 160);
            safe = !TANK_ARENA.WALLS.some(w => x > w.x - 20 && x < w.x + w.w + 20 && y > w.y - 20 && y < w.y + w.h + 20);
        }
        room.crates.push({ id: Date.now() + Math.random(), x, y, weapon: wKey });
    }
}

function startTankTick(room, io) {
    if (room.tickInterval) return;
    room.state = 'playing';

    room.tickInterval = setInterval(() => {
        room.tickCount++;
        if (room.tickCount % 60 === 0) room.timeLeft--;

        // Update each tank
        room.tanks.forEach((tank) => {
            if (!tank.alive) return;
            if (tank.shootCooldown > 0) tank.shootCooldown--;

            // Bot AI
            if (tank.isBot) {
                const targets = [...room.tanks.values()].filter(t => !t.isBot && t.alive);
                if (targets.length) {
                    const target = targets[0];
                    const dx = target.x - tank.x;
                    const dy = target.y - tank.y;
                    const targetAngle = Math.atan2(dy, dx);
                    let diff = targetAngle - tank.angle;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;

                    if (diff > 0.08) tank.angle += tank.turnSpeed;
                    else if (diff < -0.08) tank.angle -= tank.turnSpeed;
                    tank.turretAngle = tank.angle;

                    if (Math.hypot(dx, dy) > 120) {
                        const nx = tank.x + Math.cos(tank.angle) * tank.speed * 0.7;
                        const ny = tank.y + Math.sin(tank.angle) * tank.speed * 0.7;
                        if (canTankMove(nx, ny, tank.id, room)) { tank.x = nx; tank.y = ny; }
                    }
                    if (Math.abs(diff) < 0.3 && tank.shootCooldown <= 0) {
                        fireTankBullet(tank, room);
                        tank.shootCooldown = 45;
                    }
                }
            } else {
                // Player movement
                if (tank.keys.left) tank.angle -= tank.turnSpeed;
                if (tank.keys.right) tank.angle += tank.turnSpeed;
                tank.turretAngle = tank.angle;

                let move = 0;
                if (tank.keys.up) move = tank.speed;
                if (tank.keys.down) move = -tank.speed * 0.6;

                if (move !== 0) {
                    const nx = tank.x + Math.cos(tank.angle) * move;
                    const ny = tank.y + Math.sin(tank.angle) * move;
                    if (canTankMove(nx, ny, tank.id, room)) {
                        tank.x = nx;
                        tank.y = ny;
                    }
                }

                if (tank.keys.fire && tank.shootCooldown <= 0) {
                    fireTankBullet(tank, room);
                    tank.shootCooldown = 20;
                }
            }

            // Pick up crates
            room.crates = room.crates.filter(c => {
                if (Math.hypot(c.x - tank.x, c.y - tank.y) < 32) {
                    if (c.weapon === 'shield') {
                        tank.shield = 60;
                    } else {
                        tank.weapon = c.weapon;
                        tank.ammo = c.weapon === 'missile' ? 4 : c.weapon === 'plasma' ? 8 : 3;
                    }
                    return false;
                }
                return true;
            });
        });

        // Spawn occasional crates
        if (room.tickCount % 360 === 0 && room.crates.length < 5) {
            spawnTankCrates(room, 2);
        }

        // Bullets update
        room.bullets = room.bullets.filter(b => {
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            if (b.life <= 0) return false;
            if (b.x < 10 || b.x > TANK_ARENA.W - 10 || b.y < 10 || b.y > TANK_ARENA.H - 10) return false;

            // Wall collision
            for (const w of TANK_ARENA.WALLS) {
                if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                    if (b.bounces > 0) {
                        b.bounces--;
                        b.vx = -b.vx;
                    } else {
                        return false;
                    }
                }
            }

            // Tank collision
            for (const [, target] of room.tanks) {
                if (!target.alive || target.id === b.ownerId) continue;
                if (Math.hypot(target.x - b.x, target.y - b.y) < 22) {
                    let dmg = b.dmg;
                    if (target.shield > 0) {
                        target.shield = Math.max(0, target.shield - dmg);
                        dmg = 0;
                    }
                    target.hp = Math.max(0, target.hp - dmg);
                    if (target.hp === 0) {
                        target.alive = false;
                        const owner = room.tanks.get(b.ownerId);
                        if (owner) owner.kills++;
                    }
                    return false;
                }
            }
            return true;
        });

        // Check Win Condition
        const aliveTanks = [...room.tanks.values()].filter(t => t.alive);
        if (aliveTanks.length <= 1 || room.timeLeft <= 0) {
            const winner = aliveTanks[0] || [...room.tanks.values()].reduce((a, b) => (a.kills > b.kills ? a : b));
            room.state = 'gameover';
            io.to(room.id).emit('gameOver', { name: winner.name, color: winner.color, kills: winner.kills });
            stopRoomTick(room);
        }

        // Emit snapshot at ~30 FPS
        if (room.tickCount % 2 === 0 && room.state === 'playing') {
            io.to(room.id).emit('tankState', {
                tanks: [...room.tanks.values()].map(t => ({
                    id: t.id, name: t.name, color: t.color, isBot: t.isBot,
                    x: t.x, y: t.y, angle: t.angle, turretAngle: t.turretAngle,
                    hp: t.hp, maxHp: t.maxHp, shield: t.shield, alive: t.alive,
                    weapon: t.weapon, ammo: t.ammo, kills: t.kills,
                })),
                bullets: room.bullets.map(b => ({ x: b.x, y: b.y, color: b.color })),
                crates: room.crates,
                timeLeft: room.timeLeft,
            });
        }
    }, 1000 / 60);
}

function canTankMove(x, y, id, room) {
    if (x < 30 || x > TANK_ARENA.W - 30 || y < 30 || y > TANK_ARENA.H - 30) return false;
    for (const w of TANK_ARENA.WALLS) {
        if (x > w.x - 20 && x < w.x + w.w + 20 && y > w.y - 20 && y < w.y + w.h + 20) return false;
    }
    for (const [tid, other] of room.tanks) {
        if (tid === id || !other.alive) continue;
        if (Math.hypot(other.x - x, other.y - y) < 36) return false;
    }
    return true;
}

function fireTankBullet(tank, room) {
    const spd = tank.weapon === 'plasma' ? 10 : tank.weapon === 'missile' ? 8 : 7;
    const dmg = tank.weapon === 'missile' ? 55 : tank.weapon === 'plasma' ? 35 : 28;
    const color = tank.weapon === 'plasma' ? '#00aaff' : tank.weapon === 'missile' ? '#ff3366' : tank.color;
    const bounces = tank.weapon === 'plasma' ? 2 : tank.weapon === 'cannon' ? 1 : 0;

    room.bullets.push({
        id: Date.now() + Math.random(),
        ownerId: tank.id,
        x: tank.x + Math.cos(tank.turretAngle) * 24,
        y: tank.y + Math.sin(tank.turretAngle) * 24,
        vx: Math.cos(tank.turretAngle) * spd,
        vy: Math.sin(tank.turretAngle) * spd,
        dmg, bounces, color, life: 100
    });

    if (tank.ammo > 0) {
        tank.ammo--;
        if (tank.ammo === 0) tank.weapon = 'cannon';
    }
}


// ════════════════════════════════════════════════════════════════
// 3. 🐍 SNAKE 2.0 ENGINE
// ════════════════════════════════════════════════════════════════
const SNAKE_GRID = { COLS: 25, ROWS: 25 };
const SNAKE_SPAWNS = [
    { head: { x: 5, y: 12 },  dir: { x: 1, y: 0 } },
    { head: { x: 20, y: 12 }, dir: { x: -1, y: 0 } },
    { head: { x: 12, y: 5 },  dir: { x: 0, y: 1 } },
    { head: { x: 12, y: 20 }, dir: { x: 0, y: -1 } },
];

function createSnakeRoom(mode, hostId, hostName, hostColor) {
    const id = generateRoomId();
    const room = {
        id, gameType: 'snake', mode,
        hostId, state: 'waiting',
        snakes: new Map(),
        food: { x: 12, y: 12 },
        tickInterval: null,
        tickCount: 0,
        timeLeft: 180,
        maxPlayers: mode === 'solo' ? 1 : MAX_PLAYERS_PER_ROOM,
    };

    const sp = SNAKE_SPAWNS[0];
    room.snakes.set(hostId, {
        id: hostId, name: hostName,
        body: [sp.head, { x: sp.head.x - sp.dir.x, y: sp.head.y - sp.dir.y }, { x: sp.head.x - sp.dir.x * 2, y: sp.head.y - sp.dir.y * 2 }],
        dir: sp.dir, nextDir: sp.dir,
        color: hostColor || COLORS[0],
        alive: true, score: 0, isBot: false,
    });

    if (mode === 'bot') {
        const botId = `bot_snake_${id}`;
        const bsp = SNAKE_SPAWNS[1];
        room.snakes.set(botId, {
            id: botId, name: 'SnakeBot 🤖',
            body: [bsp.head, { x: bsp.head.x - bsp.dir.x, y: bsp.head.y - bsp.dir.y }, { x: bsp.head.x - bsp.dir.x * 2, y: bsp.head.y - bsp.dir.y * 2 }],
            dir: bsp.dir, nextDir: bsp.dir,
            color: COLORS[1],
            alive: true, score: 0, isBot: true,
        });
    }

    rooms.set(id, room);
    return room;
}

function startSnakeTick(room, io) {
    if (room.tickInterval) return;
    room.state = 'playing';

    room.tickInterval = setInterval(() => {
        room.tickCount++;
        if (room.tickCount % 10 === 0) room.timeLeft--;

        room.snakes.forEach(sn => {
            if (!sn.alive) return;

            // Bot AI
            if (sn.isBot) {
                const head = sn.body[0];
                const food = room.food;
                const dx = food.x - head.x;
                const dy = food.y - head.y;
                let targetDir = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
                if (!(targetDir.x === -sn.dir.x && targetDir.y === -sn.dir.y)) {
                    sn.nextDir = targetDir;
                }
            }

            sn.dir = sn.nextDir;
            const newHead = { x: sn.body[0].x + sn.dir.x, y: sn.body[0].y + sn.dir.y };

            // Wall collision
            if (newHead.x < 0 || newHead.x >= SNAKE_GRID.COLS || newHead.y < 0 || newHead.y >= SNAKE_GRID.ROWS) {
                sn.alive = false; return;
            }

            // Self collision
            if (sn.body.some(s => s.x === newHead.x && s.y === newHead.y)) {
                sn.alive = false; return;
            }

            // Other snake collision
            room.snakes.forEach(other => {
                if (other.id === sn.id) return;
                if (other.body.some(s => s.x === newHead.x && s.y === newHead.y)) {
                    sn.alive = false;
                }
            });

            if (!sn.alive) return;

            sn.body.unshift(newHead);

            // Eat food
            if (newHead.x === room.food.x && newHead.y === room.food.y) {
                sn.score += 10;
                room.food = {
                    x: Math.floor(Math.random() * SNAKE_GRID.COLS),
                    y: Math.floor(Math.random() * SNAKE_GRID.ROWS)
                };
            } else {
                sn.body.pop();
            }
        });

        // Check game over
        const alive = [...room.snakes.values()].filter(s => s.alive);
        if (alive.length <= 1 || room.timeLeft <= 0) {
            const winner = [...room.snakes.values()].reduce((a, b) => (a.score > b.score ? a : b));
            io.to(room.id).emit('gameOver', { name: winner.name, score: winner.score });
            stopRoomTick(room);
            return;
        }

        // Emit state every tick (10 FPS for snake)
        io.to(room.id).emit('snakeState', {
            snakes: [...room.snakes.values()].map(s => ({
                id: s.id, body: s.body, color: s.color, name: s.name,
                alive: s.alive, score: s.score, isBot: s.isBot,
            })),
            food: room.food,
            timeLeft: room.timeLeft,
        });
    }, 1000 / 10);
}


// ════════════════════════════════════════════════════════════════
// 4. 🚀 SPACE DEFENDER (CO-OP) ENGINE
// ════════════════════════════════════════════════════════════════
function createSpaceRoom(mode, hostId, hostName) {
    const id = generateRoomId();
    const room = {
        id, gameType: 'space', mode,
        hostId, state: 'waiting',
        players: new Map(),
        wave: 1, score: 0, lives: 3,
        enemies: [], bullets: [],
        tickInterval: null, tickCount: 0,
        maxPlayers: mode === 'solo' ? 1 : 2,
    };

    room.players.set(hostId, {
        id: hostId, name: hostName, color: '#00c8ff',
        x: 240, y: 480, hp: 3, score: 0, keys: { left: false, right: false, fire: false }
    });

    if (mode === 'bot') {
        room.players.set(`bot_drone_${id}`, {
            id: `bot_drone_${id}`, name: 'AI Companion 🤖', color: '#a855f7',
            x: 180, y: 480, hp: 3, score: 0, isBot: true
        });
    }

    rooms.set(id, room);
    return room;
}

function startSpaceTick(room, io) {
    if (room.tickInterval) return;
    room.state = 'playing';

    room.tickInterval = setInterval(() => {
        room.tickCount++;

        // Broadcast co-op state snapshot
        if (room.tickCount % 2 === 0) {
            io.to(room.id).emit('spaceState', {
                players: [...room.players.values()],
                wave: room.wave,
                score: room.score,
                lives: room.lives,
            });
        }
    }, 1000 / 60);
}


// ════════════════════════════════════════════════════════════════
// 5. 🃏 MEMORY MATCH ENGINE
// ════════════════════════════════════════════════════════════════
const MEMORY_ICONS = ['🎮', '⚡', '🛡️', '🚀', '💎', '👑', '👾', '🔮'];

function createMemoryRoom(mode, hostId, hostName) {
    const id = generateRoomId();
    const deck = [...MEMORY_ICONS, ...MEMORY_ICONS]
        .sort(() => Math.random() - 0.5)
        .map((emoji, idx) => ({ id: idx, emoji, flipped: false, matched: false }));

    const room = {
        id, gameType: 'memory', mode,
        hostId, state: 'waiting',
        players: new Map(),
        deck,
        flippedCards: [],
        turnIndex: 0,
        playerIds: [hostId],
        maxPlayers: mode === 'solo' ? 1 : 2,
    };

    room.players.set(hostId, { id: hostId, username: hostName, color: COLORS[0], score: 0 });
    rooms.set(id, room);
    return room;
}


// ════════════════════════════════════════════════════════════════
// 6. 🌩️ CYBER JUMP ENGINE
// ════════════════════════════════════════════════════════════════
function createCyberRoom(mode, hostId, hostName) {
    const id = generateRoomId();
    const room = {
        id, gameType: 'cyber', mode,
        hostId, state: 'waiting',
        players: new Map(),
        maxPlayers: mode === 'solo' ? 1 : MAX_PLAYERS_PER_ROOM,
    };

    room.players.set(hostId, { id: hostId, username: hostName, color: COLORS[0], score: 0, y: 0, alive: true });
    rooms.set(id, room);
    return room;
}


// ════════════════════════════════════════════════════════════════
// GENERAL HELPERS
// ════════════════════════════════════════════════════════════════
function stopRoomTick(room) {
    if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
    }
}

function getPlayerList(room) {
    if (room.tanks) return [...room.tanks.values()].map(t => ({
        id: t.id, username: t.name, color: t.color, isBot: t.isBot, kills: t.kills,
    }));
    if (room.snakes) return [...room.snakes.values()].map(s => ({
        id: s.id, username: s.name, color: s.color, isBot: s.isBot, score: s.score,
    }));
    if (room.players) return [...room.players.values()].map(p => ({
        id: p.id, username: p.username || p.name, color: p.color, isBot: p.isBot, score: p.score || 0, kills: p.kills || 0,
    }));
    return [];
}


// ════════════════════════════════════════════════════════════════
// SOCKET.IO SERVER MOUNT
// ════════════════════════════════════════════════════════════════
function mountGameServer(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        path: '/game-ws',
    });

    io.on('connection', socket => {
        let currentRoomId = null;

        // ── Create Room ───────────────────────────────────────────
        socket.on('createRoom', ({ gameType, mode, username, avatar }) => {
            let room;
            const name = (username || 'Player').substring(0, 20);
            const av = avatar || null;

            if (gameType === 'battle') {
                room = createBattleRoom(mode, socket.id, name, av);
            } else if (gameType === 'tank') {
                room = createTankRoom(mode, socket.id, name, COLORS[0]);
            } else if (gameType === 'snake') {
                room = createSnakeRoom(mode, socket.id, name, COLORS[0]);
            } else if (gameType === 'space') {
                room = createSpaceRoom(mode, socket.id, name);
            } else if (gameType === 'memory') {
                room = createMemoryRoom(mode, socket.id, name);
            } else if (gameType === 'cyber') {
                room = createCyberRoom(mode, socket.id, name);
            } else {
                return socket.emit('error', { msg: 'نوع اللعبة غير مدعوم' });
            }

            currentRoomId = room.id;
            socket.join(room.id);

            socket.emit('roomCreated', {
                roomId: room.id,
                playerId: socket.id,
                players: getPlayerList(room),
                platforms: ARENA.PLATFORMS,
                arenaSize: { w: ARENA.W, h: ARENA.H },
                killLimit: room.killLimit || 10,
                timeLeft: room.timeLeft,
                weaponStats: WEAPON_STATS,
                deck: room.deck || null,
            });

            // Auto-start solo/bot modes
            if (mode === 'solo' || mode === 'bot') {
                setTimeout(() => {
                    room.state = 'playing';
                    io.to(room.id).emit('gameStarted', { roomId: room.id });
                    if (gameType === 'battle') startBattleTick(room, io);
                    else if (gameType === 'tank') startTankTick(room, io);
                    else if (gameType === 'snake') startSnakeTick(room, io);
                    else if (gameType === 'space') startSpaceTick(room, io);
                }, 400);
            }
        });

        // ── Join Room ─────────────────────────────────────────────
        socket.on('joinRoom', ({ roomId, username, avatar }) => {
            const room = rooms.get(roomId?.toUpperCase());
            if (!room) return socket.emit('error', { msg: '❌ الغرفة غير موجودة!' });
            if (room.state !== 'waiting') return socket.emit('error', { msg: '⏳ اللعبة بدأت بالفعل' });

            const currentCount = room.players?.size || room.tanks?.size || room.snakes?.size || 0;
            if (currentCount >= room.maxPlayers) {
                return socket.emit('error', { msg: '👥 الغرفة ممتلئة!' });
            }

            const name = (username || 'Player').substring(0, 20);
            const color = COLORS[currentCount % COLORS.length];

            if (room.gameType === 'battle') {
                room.players.set(socket.id, createBattlePlayer(socket.id, name, avatar || null, color));
            } else if (room.gameType === 'tank') {
                room.tanks.set(socket.id, createTankPlayer(socket.id, name, color, false, currentCount));
            } else if (room.gameType === 'snake') {
                const sp = SNAKE_SPAWNS[currentCount % SNAKE_SPAWNS.length];
                room.snakes.set(socket.id, {
                    id: socket.id, name,
                    body: [sp.head, { x: sp.head.x - sp.dir.x, y: sp.head.y - sp.dir.y }, { x: sp.head.x - sp.dir.x * 2, y: sp.head.y - sp.dir.y * 2 }],
                    dir: sp.dir, nextDir: sp.dir,
                    color, alive: true, score: 0, isBot: false,
                });
            } else if (room.gameType === 'space') {
                room.players.set(socket.id, {
                    id: socket.id, name, color: '#facc15',
                    x: 320, y: 480, hp: 3, score: 0, keys: { left: false, right: false, fire: false }
                });
            } else if (room.gameType === 'memory') {
                room.players.set(socket.id, { id: socket.id, username: name, color, score: 0 });
                room.playerIds.push(socket.id);
            } else if (room.gameType === 'cyber') {
                room.players.set(socket.id, { id: socket.id, username: name, color, score: 0, y: 0, alive: true });
            }

            currentRoomId = roomId.toUpperCase();
            socket.join(currentRoomId);

            socket.emit('roomJoined', {
                roomId: currentRoomId,
                playerId: socket.id,
                players: getPlayerList(room),
                platforms: ARENA.PLATFORMS,
                arenaSize: { w: ARENA.W, h: ARENA.H },
                killLimit: room.killLimit,
                timeLeft: room.timeLeft,
                weaponStats: WEAPON_STATS,
                deck: room.deck || null,
            });

            io.to(currentRoomId).emit('playerJoined', {
                players: getPlayerList(room),
                name,
            });
        });

        // ── Start Game (host only) ────────────────────────────────
        socket.on('startGame', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room || room.hostId !== socket.id) return;
            if (room.state !== 'waiting') return;
            room.state = 'playing';

            io.to(room.id).emit('gameStarted', { roomId: room.id, deck: room.deck || null });

            if (room.gameType === 'battle') startBattleTick(room, io);
            else if (room.gameType === 'tank') startTankTick(room, io);
            else if (room.gameType === 'snake') startSnakeTick(room, io);
            else if (room.gameType === 'space') startSpaceTick(room, io);
        });

        // ── Player Input ──────────────────────────────────────────
        socket.on('input', ({ roomId, keys }) => {
            const room = rooms.get(roomId);
            if (!room || room.state !== 'playing' || !keys) return;

            if (room.gameType === 'battle') {
                const player = room.players?.get(socket.id);
                if (player && !player.isBot) player.keys = keys;
            } else if (room.gameType === 'tank') {
                const tank = room.tanks?.get(socket.id);
                if (tank && !tank.isBot) tank.keys = keys;
            } else if (room.gameType === 'snake') {
                const sn = room.snakes?.get(socket.id);
                if (sn && keys.dir && !(keys.dir.x === -sn.dir.x && keys.dir.y === -sn.dir.y)) {
                    sn.nextDir = keys.dir;
                }
            } else if (room.gameType === 'space') {
                const sp = room.players?.get(socket.id);
                if (sp) {
                    if (keys.left) sp.x = Math.max(30, sp.x - 5);
                    if (keys.right) sp.x = Math.min(450, sp.x + 5);
                }
            } else if (room.gameType === 'cyber') {
                const p = room.players?.get(socket.id);
                if (p) {
                    if (typeof keys.score === 'number') p.score = keys.score;
                    if (typeof keys.alive === 'boolean') p.alive = keys.alive;
                    io.to(roomId).emit('cyberState', { players: [...room.players.values()] });
                }
            }
        });

        // ── Memory Match Card Flip ────────────────────────────────
        socket.on('flipCard', ({ roomId, cardId }) => {
            const room = rooms.get(roomId);
            if (!room || room.gameType !== 'memory' || room.state !== 'playing') return;

            const card = room.deck?.[cardId];
            if (!card || card.matched || card.flipped || room.flippedCards.length >= 2) return;

            card.flipped = true;
            room.flippedCards.push(cardId);
            io.to(roomId).emit('cardFlipped', { cardId, emoji: card.emoji, by: socket.id });

            if (room.flippedCards.length === 2) {
                const [id1, id2] = room.flippedCards;
                const c1 = room.deck[id1], c2 = room.deck[id2];

                if (c1.emoji === c2.emoji) {
                    c1.matched = true; c2.matched = true;
                    const p = room.players.get(socket.id);
                    if (p) p.score += 10;
                    room.flippedCards = [];

                    io.to(roomId).emit('cardsMatched', {
                        cards: [id1, id2],
                        by: socket.id,
                        scores: [...room.players.values()].map(pl => ({ id: pl.id, score: pl.score }))
                    });

                    // Check win
                    if (room.deck.every(c => c.matched)) {
                        const winner = [...room.players.values()].reduce((a, b) => (a.score > b.score ? a : b));
                        io.to(roomId).emit('gameOver', { name: winner.username, score: winner.score });
                    }
                } else {
                    setTimeout(() => {
                        c1.flipped = false; c2.flipped = false;
                        room.flippedCards = [];
                        io.to(roomId).emit('cardsUnflipped', { cards: [id1, id2] });
                    }, 1000);
                }
            }
        });

        // ── Chat ──────────────────────────────────────────────────
        socket.on('chat', ({ roomId, message }) => {
            const room = rooms.get(roomId);
            if (!room) return;
            const pList = getPlayerList(room);
            const player = pList.find(p => p.id === socket.id);
            if (!player) return;
            const msg = (message || '').substring(0, 80);
            io.to(roomId).emit('chat', { name: player.username, color: player.color, msg, ts: Date.now() });
        });

        // ── Disconnect ────────────────────────────────────────────
        socket.on('disconnect', () => {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            if (room.players) room.players.delete(socket.id);
            if (room.tanks) room.tanks.delete(socket.id);
            if (room.snakes) room.snakes.delete(socket.id);

            io.to(currentRoomId).emit('playerLeft', { id: socket.id });

            const remaining = [
                ...(room.players?.values() || []),
                ...(room.tanks?.values() || []),
                ...(room.snakes?.values() || []),
            ].filter(p => !p.isBot);

            if (remaining.length === 0) {
                stopRoomTick(room);
                rooms.delete(currentRoomId);
            }
        });
    });

    console.log('[GameServer] 🎮 Socket.io game server active on /game-ws');
    return io;
}

module.exports = { mountGameServer, ARENA, WEAPON_STATS, TANK_ARENA };
