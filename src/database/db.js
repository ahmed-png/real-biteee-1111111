'use strict';
const appLogger = require('../../utils/app-logger');

const mongoose = require('mongoose');
const { User, Guild, Clan, WebSession, BotSetting, WelcomeImage } = require('./models');

// Cache System (In-Memory)
// لتجنب تعديل 50+ ملف يستخدم `getUserData` بشكل متزامن، نُخزن البيانات في الذاكرة.
const cache = {
    users: new Map(),
    guilds: new Map(),
    sessions: new Map()
};
const userWriteQueues = new Map();

const LIMITS = { MAX_WALLET: 5000000, MAX_BANK: 10000000, MAX_INVESTMENT: 1000000 };

/**
 * دالة تحميل البيانات بالكامل من MongoDB عند تشغيل البوت
 */
async function loadDatabase() {
    if (mongoose.connection.readyState !== 1) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('MongoDB is not connected; refusing to start with non-persistent production data.');
        }
        appLogger.warn('[DB] MongoDB غير متصل — استخدام البيانات الافتراضية في الذاكرة المؤقتة (Local In-Memory Mode).');
        return { users: cache.users, guilds: cache.guilds };
    }
    appLogger.info('[DB] Loading data from MongoDB to memory cache...');
    
    try {
        const users = await User.find({}).lean();
        const guilds = await Guild.find({}).lean();
        const sessions = await WebSession.find({}).lean();

        cache.users.clear();
        for (const user of users) {
            delete user._id;
            delete user.__v;
            cache.users.set(user.userId, user);
        }

        cache.guilds.clear();
        for (const guild of guilds) {
            delete guild._id;
            delete guild.__v;
            cache.guilds.set(guild.guildId, guild);
        }

        cache.sessions.clear();
        for (const session of sessions) {
            cache.sessions.set(session.token, session);
        }
        appLogger.info(`[DB] Loaded ${users.length} Users, ${guilds.length} Guilds into memory.`);
    } catch (err) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Failed to load persistent data from MongoDB: ${err.message}`, { cause: err });
        }
        appLogger.warn('[DB] فشل استرداد البيانات من MongoDB:', err.message);
    }
    return { users: cache.users, guilds: cache.guilds };
}

function _defaultUser(userId) {
    return {
        userId, balance: 1000, bank: 0, bankCap: 0, xp: 0, level: 1, dailyStreak: 0, warnings: 0,
        lastDaily: null, lastWeekly: null, lastWork: null, lastRob: null, jailTime: null, muteTime: null,
        marriedTo: null, marriedSince: null, friends: [], color: null, birthday: null, reputation: 0, lastRep: null, vault: 0,
        stats: { gamesPlayed: 0, gamesWon: 0, totalWagered: 0, totalWon: 0, biggestWin: 0 },
        inventory: [], achievements: [], transactions: []
    };
}

function _normalizeInventory(value) {
    if (Array.isArray(value)) {
        return value.map((item) => ({
            itemId: item?.itemId || item?.id,
            quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
            expiresAt: item?.expiresAt || null,
        })).filter((item) => item.itemId);
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).map(([itemId, item]) => ({
            itemId,
            quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
            expiresAt: item?.expiresAt || null,
        }));
    }

    return [];
}

function _persistUser(userId) {
    const previous = userWriteQueues.get(userId) || Promise.resolve();
    const next = previous
        .catch(() => {})
        .then(() => User.updateOne(
            { userId },
            { $set: cache.users.get(userId) },
            { upsert: true }
        ));

    userWriteQueues.set(userId, next);
    next.catch(err => appLogger.error('[MongoDB Error] Update User:', err.message))
        .finally(() => {
            if (userWriteQueues.get(userId) === next) userWriteQueues.delete(userId);
        });
}

// Users
function getUserData(userId) {
    if (!cache.users.has(userId)) {
        const def = _defaultUser(userId);
        cache.users.set(userId, def);
        User.create(def).catch(err => appLogger.error('[MongoDB Error] Create User:', err.message));
    }
    return cache.users.get(userId);
}

function updateUserData(userId, data) {
    const user = getUserData(userId);
    
    for (const [key, val] of Object.entries(data)) {
        if (key === 'stats') {
            user.stats = { ...user.stats, ...val };
        } else if (key === 'inventory') {
            user.inventory = _normalizeInventory(val);
        } else if (key === 'achievements') {
            user.achievements = val;
        } else if (key === 'transactions') {
            continue; // Transactions تضاف بدالة منفصلة
        } else {
            user[key] = val;
        }
    }
    
    // تحديث الكاش
    cache.users.set(userId, user);
    
    // Serialize writes per user so concurrent commands cannot finish out of order.
    _persistUser(userId);
    
    return user;
}

function updateFields(userId, fields) { return updateUserData(userId, fields); }

function addMoney(userId, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const user = getUserData(userId);
    const curr = user.balance || 0;
    const add = Math.max(0, Math.min(Math.abs(amount), LIMITS.MAX_WALLET - curr));
    updateUserData(userId, { balance: curr + add });
    return add;
}

function removeMoney(userId, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const user = getUserData(userId);
    if ((user.balance || 0) < amount) return false;
    updateUserData(userId, { balance: user.balance - amount });
    return true;
}

function addMoneyToBank(userId, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const user = getUserData(userId);
    const maxBank = Math.max(LIMITS.MAX_BANK, user.bankCap || 0);
    const curr = user.bank || 0;
    if (curr >= maxBank) return 0;
    const dep = Math.min(Math.abs(amount), maxBank - curr);
    updateUserData(userId, { bank: curr + dep });
    return dep;
}

function removeMoneyFromBank(userId, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const user = getUserData(userId);
    if ((user.bank || 0) < amount) return false;
    updateUserData(userId, { bank: user.bank - amount });
    return true;
}

function transferMoney(fromId, toId, amount) {
    if (!Number.isFinite(amount) || amount <= 0 || fromId === toId) return false;
    if (!removeMoney(fromId, amount)) return false;
    const added = addMoney(toId, amount);
    if (added < amount) {
        addMoney(fromId, amount - added); // إرجاع الفائض
    }
    return true;
}

function addTransaction(userId, type, amount, description) {
    const user = getUserData(userId);
    const newTx = { type, amount, description, timestamp: Date.now() };
    user.transactions.unshift(newTx);
    if (user.transactions.length > 50) user.transactions = user.transactions.slice(0, 50);
    updateUserData(userId, { transactions: user.transactions }); // Save to Mongo
}

// Guilds
function _defaultGuild(guildId) {
    return {
        guildId,
        // إعدادات الترحيب (per-guild) — المصدر الوحيد للحقيقة
        welcomeEnabled: false,
        welcomeChannel: null,
        welcomeImage: null,
        welcomeAvatarX: 960,
        welcomeAvatarY: 540,
        welcomeAvatarSize: 256,
        welcomeAvatarRadius: 50,
        autoRoleEnabled: false,
        autoRoleId: null,
        autoRoleName: 'عضو جديد',
        autoRolePermissions: [],
        autoRoleBackfill: {
            status: 'not_started',
            processed: 0,
            total: 0,
            assigned: 0,
            skipped: 0,
            failed: 0,
            error: null,
            startedAt: null,
            finishedAt: null,
        },
        ticketPanelChannelId: null,
        ticketPanelMessageId: null,
        ticketPanelManaged: false,
        ticketCategoryId: null,
        ticketOpenTickets: {},
        iraqiResponsesEnabled: true,
        iraqiResponses: [],
        serverAutoResponsesEnabled: true,
        serverAutoResponses: [],
        // إعدادات أخرى
        bankChannel: null, jailRole: null, muteRole: null, logChannel: null, punishmentsChannel: null,
        gamesChannel: null, colorChannelId: null, colorMessageId: null, logChannelId: null,
        protectionSettings: {},
        setupComplete: false, prefix: '!', language: 'ar', economyEnabled: true, gamesEnabled: true, aiEnabled: true,
        autoModEnabled: true, antiSpamEnabled: true, antiLinkEnabled: false, antiCapsEnabled: true, antiRaidEnabled: true
    };
}

function getGuildData(guildId) {
    if (!cache.guilds.has(guildId)) {
        const def = _defaultGuild(guildId);
        cache.guilds.set(guildId, def);
        Guild.create(def).catch(err => appLogger.error('[MongoDB Error] Create Guild:', err.message));
    }
    return cache.guilds.get(guildId);
}

function updateGuildData(guildId, data) {
    const guild = getGuildData(guildId);
    Object.assign(guild, data);
    cache.guilds.set(guildId, guild);
    Guild.updateOne({ guildId }, { $set: guild }, { upsert: true }).catch(err => appLogger.error('[MongoDB Error] Update Guild:', err.message));
    return guild;
}

// Web Sessions
function createWebSession(token, userId, username, avatar, role, guildId, expiresAt) {
    const session = { token, userId, username, avatar, role, guildId, expiresAt: Math.floor(expiresAt / 1000) };
    cache.sessions.set(token, session);
    WebSession.create(session).catch(e => appLogger.error(e));
}

function getWebSession(token) {
    const session = cache.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt * 1000 < Date.now()) {
        deleteWebSession(token);
        return null;
    }
    return session;
}

function deleteWebSession(token) {
    cache.sessions.delete(token);
    WebSession.deleteOne({ token }).catch(e => appLogger.error(e));
}

function cleanExpiredSessions() {
    const now = Math.floor(Date.now() / 1000);
    for (const [token, session] of cache.sessions.entries()) {
        if (session.expiresAt < now) cache.sessions.delete(token);
    }
    WebSession.deleteMany({ expiresAt: { $lt: now } }).catch(e => appLogger.error(e));
}

// Queries
function getAllUsers() {
    const result = {};
    for (const [id, user] of cache.users.entries()) result[id] = user;
    return result;
}

function getAllGuilds() {
    const result = {};
    for (const [id, guild] of cache.guilds.entries()) result[id] = guild;
    return result;
}

function getLeaderboard(field = 'balance', limit = 10) {
    const arr = Array.from(cache.users.values());
    arr.sort((a, b) => (b[field] || 0) - (a[field] || 0));
    return arr.slice(0, limit).map(u => ({ user_id: u.userId, value: u[field] || 0 }));
}

function resetAllBanks() {
    for (const user of cache.users.values()) {
        user.bank = 0;
        user.inventory = [];
    }
    User.updateMany({}, { $set: { bank: 0, inventory: [] } }).catch(e => appLogger.error(e));
}

function saveAll() {}
function saveDatabase() {}

// Welcome Images
async function getWelcomeImageBase64(guildId) {
    const doc = await WelcomeImage.findOne({ guildId }).lean();
    return doc ? doc.imageBase64 : null;
}

async function setWelcomeImageBase64(guildId, imageBase64) {
    await WelcomeImage.updateOne(
        { guildId },
        { $set: { imageBase64 } },
        { upsert: true }
    );
}

async function deleteWelcomeImageBase64(guildId) {
    await WelcomeImage.deleteOne({ guildId });
}

// Exports
module.exports = {
    LIMITS, loadDatabase,
    getUserData, updateUserData, updateFields,
    addMoney, removeMoney, addMoneyToBank, removeMoneyFromBank, transferMoney, addTransaction,
    getGuildData, updateGuildData,
    getAllUsers, getAllGuilds, getLeaderboard, resetAllBanks, saveAll, saveDatabase,
    createWebSession, getWebSession, deleteWebSession, cleanExpiredSessions,
    getWelcomeImageBase64, setWelcomeImageBase64, deleteWelcomeImageBase64
};
