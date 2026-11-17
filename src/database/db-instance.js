'use strict';
const appLogger = require('../../utils/app-logger');
/**
 * db-instance.js
 * نقطة وصول واحدة لكائن MongoDB (Mongoose)
 */
const mongoose = require('mongoose');

let _isConnected = false;

async function connectDb() {
    if (_isConnected && mongoose.connection.readyState === 1) return true;
    _isConnected = false;
    
    // استخدام MONGODB_URI من البيئة
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        const error = new Error('MONGODB_URI is not configured.');
        if (process.env.NODE_ENV === 'production') throw error;
        appLogger.warn('[DB] MONGODB_URI غير مضبوط — سيتم استخدام تخزين الذاكرة في بيئة التطوير.');
        return false;
    }

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        _isConnected = true;
        appLogger.info('[DB] Connected to MongoDB Atlas');
        return true;
    } catch (err) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`MongoDB connection failed: ${err.message}`, { cause: err });
        }
        appLogger.warn('[DB] فشل الاتصال بقاعدة MongoDB Atlas:', err.message);
        appLogger.warn('[DB] سيتم استخدام تخزين الذاكرة في بيئة التطوير.');
        _isConnected = false;
        return false;
    }
}

// دالة تُرجع mongoose في حال احتاجها مكان آخر (رغم أن النماذج تكفي عادة)
function getDb() {
    if (!_isConnected) {
        appLogger.warn('[DB] getDb() called before connection is established');
    }
    return mongoose.connection;
}

module.exports = { getDb, connectDb };
