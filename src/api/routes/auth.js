'use strict';
const appLogger = require('../../../utils/app-logger');

/**
 * ════════════════════════════════════════════════════════
 *  auth.js — نظام المصادقة الجديد
 *  ─ Bot Owner: يسجّل بمفتاح سري
 *  ─ Server Owner: يسجّل عبر Discord OAuth2
 * ════════════════════════════════════════════════════════
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, timingSafeEqual } = require('crypto');
const router = express.Router();
const { resolveRuntimeSecret } = require('../../../utils/runtime-secrets');

const JWT_SECRET = resolveRuntimeSecret('JWT_SECRET', process.env.JWT_SECRET, 32);
const DASHBOARD_KEY = resolveRuntimeSecret('DASHBOARD_KEY', process.env.DASHBOARD_KEY, 16);
if (process.env.NODE_ENV !== 'production') {
    if (JWT_SECRET !== process.env.JWT_SECRET) appLogger.warn('[Auth] Generated a temporary development JWT_SECRET.');
    if (DASHBOARD_KEY !== process.env.DASHBOARD_KEY) appLogger.warn('[Auth] Generated a temporary development DASHBOARD_KEY.');
}
const BOT_OWNER_ID = process.env.OWNER_ID;
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_LOGIN_BUCKETS = 4096;
const OAUTH_STATE_COOKIE = 'discord_oauth_state';

// Discord OAuth2
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

// استخدم رابط رندر التلقائي إذا كان البوت مرفوعاً على منصة Render
let RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL && RENDER_URL.endsWith('/')) {
    RENDER_URL = RENDER_URL.slice(0, -1);
}
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (RENDER_URL ? `${RENDER_URL}/auth/discord/callback` : 'http://localhost:3000/auth/discord/callback');

const DISCORD_API = 'https://discord.com/api/v10';

function getDashboardKey() {
    return DASHBOARD_KEY;
}

function allowLogin(req) {
    const now = Date.now();
    const address = req.ip || req.socket.remoteAddress || 'unknown';
    const current = loginAttempts.get(address);
    if (!current || now - current.startedAt > LOGIN_WINDOW_MS) {
        if (loginAttempts.size >= MAX_LOGIN_BUCKETS) {
            for (const [ip, attempt] of loginAttempts) {
                if (now - attempt.startedAt > LOGIN_WINDOW_MS) loginAttempts.delete(ip);
            }
            while (loginAttempts.size >= MAX_LOGIN_BUCKETS) {
                loginAttempts.delete(loginAttempts.keys().next().value);
            }
        }
        loginAttempts.set(address, { startedAt: now, count: 1 });
        return true;
    }
    if (current.count >= MAX_LOGIN_ATTEMPTS) return false;
    current.count += 1;
    return true;
}

function safeEqualStrings(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getCookie(req, name) {
    const cookies = req.headers.cookie || '';
    const entry = cookies.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
    return entry ? entry.slice(name.length + 1) : '';
}

function setOAuthStateCookie(res, state, maxAge = 600) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${OAUTH_STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

function loginWithKey(req, res, includeAdmin = false) {
    if (!allowLogin(req)) {
        return res.status(429).json({ success: false, error: 'Too many login attempts. Try again later.' });
    }

    const key = typeof req.body?.key === 'string' && req.body.key.length <= 256 ? req.body.key : '';
    const dashboardKey = getDashboardKey();
    if (!dashboardKey || !key || !safeEqualStrings(key, dashboardKey)) {
        return res.status(401).json({ success: false, error: 'Invalid key' });
    }

    const payload = { role: 'bot_owner', userId: BOT_OWNER_ID };
    if (includeAdmin) payload.admin = true;
    return res.json({ success: true, token: signToken(payload), role: 'bot_owner' });
}

// Sign JWT
function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Verify Middleware
const verifyToken = (req, res, next) => {
    const auth = req.headers['authorization'];
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(403).json({ success: false, error: 'No token' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// Bot Owner Middleware
const requireBotOwner = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user?.role !== 'bot_owner') {
            return res.status(403).json({ success: false, error: 'Bot Owner only' });
        }
        next();
    });
};

// Server Owner Middleware
const requireServerOwner = (req, res, next) => {
    verifyToken(req, res, async () => {
        const guildId = req.params.guildId;
        if (!guildId) return res.status(400).json({ success: false, error: 'Guild ID required' });

        // Bot Owner يستطيع أن يكون Server Owner أيضاً
        if (req.user?.role === 'bot_owner') {
            return next();
        }

        if (req.user?.role !== 'server_owner') {
            return res.status(403).json({ success: false, error: 'Server Owner only' });
        }

        // تحقق من أن المستخدم هو فعلاً مالك هذا السيرفر بالذات
        const client = req.app.get('client');
        if (!client) return res.status(503).json({ success: false, error: 'Bot offline' });

        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) return res.status(404).json({ success: false, error: 'Guild not found' });

            if (guild.ownerId !== req.user.userId) {
                return res.status(403).json({ success: false, error: 'You are not the owner of this guild' });
            }
            req.guild = guild;
            next();
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
};

// 1. Bot Owner Login (مفتاح سري)
router.post('/bot-owner/login', (req, res) => {
    return loginWithKey(req, res);
});

// Legacy login — للتوافق مع الداشبورد القديم
router.post('/login', (req, res) => {
    return loginWithKey(req, res, true);
});

// 2. Discord OAuth2 — Server Owner Login
router.get('/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        return res.status(500).json({ success: false, error: 'Discord OAuth is not fully configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.' });
    }
    const state = randomBytes(32).toString('hex');
    setOAuthStateCookie(res, state);
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds',
        state,
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

router.get('/discord/callback', async (req, res) => {
    const { code, error } = req.query;
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const expectedState = getCookie(req, OAUTH_STATE_COOKIE);
    setOAuthStateCookie(res, '', 0);

    if (!/^[a-f0-9]{64}$/i.test(state) || !safeEqualStrings(state, expectedState)) {
        return res.redirect('/?error=discord_state_invalid');
    }

    if (error) {
        return res.redirect('/?error=discord_denied');
    }
    if (typeof code !== 'string' || !code || code.length > 2048) {
        return res.redirect('/?error=discord_callback_invalid');
    }

    try {
        // Exchange code for access token
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) throw new Error('Discord token exchange failed');

        // Get user info
        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const discordUser = await userRes.json();
        if (!userRes.ok || !discordUser.id) throw new Error('Discord user lookup failed');

        // We don't need to fetch the user's guilds from Discord API anymore.
        // We will just check the bot's cache in the /me endpoint to see which guilds they own.

        // Check if Bot Owner is logging in via OAuth (still gets bot_owner role)
        const isBotOwner = discordUser.id === BOT_OWNER_ID;
        const role = isBotOwner ? 'bot_owner' : 'server_owner';

        const avatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${discordUser.discriminator % 5}.png`;

        const jwtPayload = {
            role,
            userId: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            avatar,
        };

        const jwtToken = signToken(jwtPayload);

        // Redirect to frontend with token
        res.redirect(`/#token=${encodeURIComponent(jwtToken)}&role=${encodeURIComponent(role)}`);
    } catch (err) {
        appLogger.error('[Auth] Discord OAuth sign-in failed:', err.message);
        res.redirect('/?error=discord_login_failed');
    }
});

// 3. Verify Token endpoint
router.get('/me', verifyToken, async (req, res) => {
    const user = req.user;
    const client = req.app.get('client');
    let ownedGuilds = [];

    if (user.role === 'bot_owner' && client) {
        // Bot Owner يرى كل السيرفرات التي البوت فيها
        ownedGuilds = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ dynamic: true }) || null,
            memberCount: g.memberCount,
            isOwner: g.ownerId === user.userId,
        }));
    } else if (user.role === 'server_owner' && client) {
        // Server Owner يرى فقط السيرفرات التي يملكها والبوت موجود فيها
        for (const g of client.guilds.cache.values()) {
            if (g.ownerId === user.userId) {
                ownedGuilds.push({
                    id: g.id,
                    name: g.name,
                    icon: g.iconURL({ dynamic: true }) || null,
                    memberCount: g.memberCount,
                    isOwner: true,
                });
            }
        }
    }

    res.json({
        success: true,
        user: {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar,
            role: user.role,
        },
        guilds: ownedGuilds,
    });
});

// 4. Logout
router.post('/logout', (req, res) => {
    res.json({ success: true });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.requireBotOwner = requireBotOwner;
module.exports.requireServerOwner = requireServerOwner;
module.exports.JWT_SECRET = JWT_SECRET;
