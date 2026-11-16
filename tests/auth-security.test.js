'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-auth-security';
process.env.DASHBOARD_KEY = 'test-dashboard-key';
process.env.DISCORD_CLIENT_ID = '123456789';
process.env.DISCORD_CLIENT_SECRET = 'test-discord-client-secret';
process.env.DISCORD_REDIRECT_URI = 'https://example.test/auth/discord/callback';

const express = require('express');
const authRouter = require('../src/api/routes/auth');
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/auth', authRouter);

let server;
let baseUrl;
test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('bot-owner login issues a token only for the configured key', async () => {
    const response = await fetch(`${baseUrl}/api/auth/bot-owner/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.10' },
        body: JSON.stringify({ key: process.env.DASHBOARD_KEY }),
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.role, 'bot_owner');
    assert.ok(data.token);
});

test('Discord authorization sets a one-time state cookie and sends state to Discord', async () => {
    const response = await fetch(`${baseUrl}/api/auth/discord`, { redirect: 'manual' });
    const location = new URL(response.headers.get('location'));
    const state = location.searchParams.get('state');
    const cookie = response.headers.get('set-cookie');

    assert.equal(response.status, 302);
    assert.match(state, /^[a-f0-9]{64}$/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.equal(location.origin, 'https://discord.com');
});

test('Discord callback rejects a missing state before exchanging credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/discord/callback?code=not-a-real-code`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/?error=discord_state_invalid');
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('Discord callback exchanges credentials only when state matches its cookie', async () => {
    const realFetch = global.fetch;
    global.fetch = (input, options) => {
        const url = String(input);
        if (url === 'https://discord.com/api/v10/oauth2/token') {
            return Promise.resolve(new Response(JSON.stringify({ access_token: 'oauth-test-token' }), { status: 200 }));
        }
        if (url === 'https://discord.com/api/v10/users/@me') {
            return Promise.resolve(new Response(JSON.stringify({
                id: '987654321',
                username: 'test-user',
                global_name: 'Test User',
                avatar: 'test-avatar',
            }), { status: 200 }));
        }
        return realFetch(input, options);
    };

    try {
        const authorization = await realFetch(`${baseUrl}/api/auth/discord`, { redirect: 'manual' });
        const state = new URL(authorization.headers.get('location')).searchParams.get('state');
        const cookie = authorization.headers.get('set-cookie').split(';', 1)[0];
        const callback = await realFetch(
            `${baseUrl}/api/auth/discord/callback?code=one-time-code&state=${state}`,
            { headers: { cookie }, redirect: 'manual' }
        );

        assert.equal(callback.status, 302);
        assert.match(callback.headers.get('location'), /^\/#token=.+&role=server_owner$/);
        assert.match(callback.headers.get('set-cookie'), /Max-Age=0/);
    } finally {
        global.fetch = realFetch;
    }
});

test('bot-owner login rate-limits repeated bad keys by client address', async () => {
    const request = () => fetch(`${baseUrl}/api/auth/bot-owner/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.20' },
        body: JSON.stringify({ key: 'wrong' }),
    });

    for (let attempt = 0; attempt < 5; attempt++) {
        assert.equal((await request()).status, 401);
    }
    assert.equal((await request()).status, 429);
});
