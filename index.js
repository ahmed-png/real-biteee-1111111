'use strict';
const appLogger = require('./utils/app-logger');

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config         = require('./config');
const eventHandler   = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');

// A process with an uncaught error may be left in an unsafe state; let Render restart it.
function exitOnFatalError(type, error) {
    appLogger.error(`[${type}]`, error?.stack || error?.message || error);
    process.exit(1);
}
process.on('uncaughtException', error => exitOnFatalError('CRASH', error));
process.on('unhandledRejection', reason => exitOnFatalError('UNHANDLED', reason));

// إنشاء Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message],
    rest: { timeout: 15_000 },
});

// تحميل قاعدة البيانات
const dbInstance = require('./src/database/db-instance');
const db = require('./src/database/db');
const botSettingsDb = require('./src/database/bot-settings-db');

async function startBot() {
    try {
        // 1. الاتصال بـ MongoDB
        await dbInstance.connectDb();
        
        // 2. تحميل البيانات من MongoDB إلى الذاكرة المؤقتة
        await db.loadDatabase();
        await botSettingsDb.loadBotSettings();
        
        appLogger.info('[Startup] Database and caches loaded successfully.');

        // تنظيف ملفات JSON القديمة (مرّة واحدة)
        try {
            const cleanup = require('./utils/startup-cleanup');
            cleanup.cleanupLegacyFiles();
            cleanup.auditLegacyUsage();
        } catch (err) {
            appLogger.warn('[Startup] Cleanup skipped:', err.message);
        }
    } catch (err) {
        appLogger.error('[Startup] Database initialization failed:', err.message);
        process.exit(1);
    }

    // تشغيل لوحة التحكم الاحترافية (تدعم Render تلقائياً)
    try {
        const dashboard = require('./dashboard-server');
        dashboard.setClient(client);
        dashboard.start(); 
        appLogger.info('[Dashboard] لوحة التحكم مُشغَّلة');
    } catch (err) {
        appLogger.error('[Dashboard] فشل تشغيل لوحة التحكم:', err.message);
    }

    // تحميل الـ Handlers
    try {
        eventHandler(client);
        commandHandler(client);
        appLogger.info('[Handlers] الأحداث والأوامر محمّلة بنجاح');
    } catch (err) {
        appLogger.error('[Handlers] فشل التحميل:', err.message);
        process.exit(1);
    }

    // تسجيل الدخول
    client.login(config.token).catch((err) => {
        appLogger.error('[Login] فشل تسجيل الدخول — تحقق من DISCORD_TOKEN في .env:', err.message);
        process.exit(1);
    });
}

// تشغيل البوت
startBot();