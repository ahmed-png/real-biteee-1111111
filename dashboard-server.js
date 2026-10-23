'use strict';

require('dotenv').config();

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║     🎛️  لوحة تحكم البوت الاحترافية — Dashboard + Game Server   ║
 * ║  React (Vite) + Express API + Socket.io Real-time Game Engine   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const http = require('http');
const app = require('./src/api/server');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./src/api/routes/auth');

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || null;
const BASE_URL = RENDER_URL || `http://localhost:${PORT}`;

function getDashboardUrl() {
    return BASE_URL;
}
module.exports.getDashboardUrl = getDashboardUrl;

/**
 * Generate a short-lived JWT for dashboard access
 */
function generateWebToken(user) {
    let avatar;
    try {
        avatar = typeof user.displayAvatarURL === 'function'
            ? user.displayAvatarURL({ dynamic: true, size: 128 })
            : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`;
    } catch {
        avatar = `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
    const token = jwt.sign({
        userId: user.id,
        username: user.username || user.globalName || 'مستخدم',
        avatar,
        role: 'user'
    }, JWT_SECRET, { expiresIn: '1h' });
    return token;
}
module.exports.generateWebToken = generateWebToken;

// Set bot client instance on express app
module.exports.setClient = (c) => {
    app.set('client', c);
};

// ─── HTTP Server ────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Socket.io Game Engine ──────────────────────────────────────
let gameServerMounted = false;
try {
    const { mountGameServer } = require('./src/game-server');
    mountGameServer(server);
    gameServerMounted = true;
} catch (err) {
    console.warn('[GameServer] ⚠️ Socket.io game server not mounted:', err.message);
    console.warn('[GameServer] Run: npm install socket.io');
}

module.exports.start = () => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Dashboard] 🌐 Server running on port ${PORT}`);
        console.log(`[Dashboard] 🔗 Internal URL: http://localhost:${PORT}`);
        if (RENDER_URL) console.log(`[Dashboard] ☁️ Public URL: ${RENDER_URL}`);
        if (gameServerMounted) {
            console.log(`[GameServer] 🎮 Real-time multiplayer active on /game-ws`);
        }
    });
};
