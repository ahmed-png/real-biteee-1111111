'use strict';
/**
 * db-instance.js
 * نقطة وصول واحدة لكائن MongoDB (Mongoose)
 */
const mongoose = require('mongoose');
const { get } = require('../../utils/bot-settings');

let _isConnected = false;

async function connectDb() {
    if (_isConnected) return;
    
    // استخدام MONGODB_URI من البيئة
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[DB] ❌ FATAL: MONGODB_URI is not set in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        _isConnected = true;
        console.log('[DB] ✅ Connected to MongoDB Atlas');
    } catch (err) {
        console.warn('[DB] ⚠️ فشل الاتصال بقاعدة MongoDB Atlas:', err.message);
        console.warn('[DB] ⚡ سيتم تشغيل البوت محلياً (وضع الذاكرة المؤقتة In-Memory Cache) بدون إيقاف البوت.');
        _isConnected = false;
    }
}

// دالة تُرجع mongoose في حال احتاجها مكان آخر (رغم أن النماذج تكفي عادة)
function getDb() {
    if (!_isConnected) {
        console.warn('[DB] ⚠️ getDb() called before connection is established');
    }
    return mongoose.connection;
}

module.exports = { getDb, connectDb };
