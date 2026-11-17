'use strict';
const appLogger = require('../utils/app-logger');

const fs = require('fs');
const path = require('path');

/**
 * يسجّل ويشغّل جميع ملفات الأحداث من مجلد events/.
 * كل ملف يجب أن يُصدِّر { name, execute, once? }.
 * يلتف كل event بـ try/catch لمنع crash السيرفر.
 *
 * @param {import('discord.js').Client} client
 */
module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');
    if (!fs.existsSync(eventsPath)) return;

    const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    let loaded = 0;

    for (const file of files) {
        const filePath = path.join(eventsPath, file);

        try {
            const event = require(filePath);

            if (typeof event.name !== 'string' || typeof event.execute !== 'function') {
                appLogger.warn(`[EventHandler] تم تجاهل ${file} — يجب أن يُصدّر { name, execute }`);
                continue;
            }

            // نلتف كل handler بـ try/catch لمنع crash من حدث واحد فاشل
            const safeExecute = async (...args) => {
                try {
                    await event.execute(...args);
                } catch (err) {
                    appLogger.error(`[Event:${event.name}] خطأ غير معالج:`, err);
                }
            };

            event.once
                ? client.once(event.name, safeExecute)
                : client.on(event.name, safeExecute);

            loaded++;
        } catch (err) {
            appLogger.error(`[EventHandler] فشل تحميل ${file}:`, err.message);
        }
    }

    appLogger.info(`[EventHandler] تم تسجيل ${loaded} حدث`);
};
