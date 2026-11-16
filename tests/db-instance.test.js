'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connectDb } = require('../src/database/db-instance');
const db = require('../src/database/db');
const botSettingsDb = require('../src/database/bot-settings-db');

const originalConnect = mongoose.connect;
const originalMongoUri = process.env.MONGODB_URI;
const originalNodeEnv = process.env.NODE_ENV;

test.after(() => {
    mongoose.connect = originalConnect;
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalMongoUri;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
});

test('production startup fails clearly when MongoDB is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MONGODB_URI;

    await assert.rejects(connectDb, /MONGODB_URI is not configured/);
});

test('development can explicitly continue in in-memory mode without MongoDB', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MONGODB_URI;

    assert.equal(await connectDb(), false);
});

test('production refuses to load users, guilds, or settings from memory only', async () => {
    process.env.NODE_ENV = 'production';

    await assert.rejects(db.loadDatabase, /refusing to start with non-persistent production data/);
    await assert.rejects(botSettingsDb.loadBotSettings, /refusing to load non-persistent production settings/);
});

test('production startup fails when MongoDB connection is unavailable', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGODB_URI = 'mongodb://unavailable';
    mongoose.connect = async () => {
        throw new Error('connection refused');
    };

    await assert.rejects(connectDb, error => {
        assert.match(error.message, /MongoDB connection failed/);
        assert.match(error.cause.message, /connection refused/);
        return true;
    });
});
