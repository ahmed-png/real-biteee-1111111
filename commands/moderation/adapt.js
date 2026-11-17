'use strict';
const appLogger = require('../../utils/app-logger');

const { PermissionFlagsBits } = require('discord.js');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'adapt',
    aliases: ['تكيف', 'تكيّف', 'تكييف'],
    description: 'يغيّر اسم البوت وصورته حتى يصيرن نفس السيرفر',
    usage: 'تكيف',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message) {
        const guild = message.guild;
        if (!guild) {
            return message.reply('❌ استخدم هالأمر داخل السيرفر.');
        }
        if (!isOwner(message.author.id) &&
            !message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هالأمر يحتاج صلاحية **الأدمن**.');
        }

        const results = [];

        if (guild.name.length > 32) {
            results.push('❌ الاسم ما تغيّر: اسم السيرفر أطول من 32 حرف، وهذا الحد الأقصى للقب بـ Discord.');
        } else {
            try {
                await guild.members.editMe({ nick: guild.name, reason: 'تغيير الاسم حتى يطابق اسم السيرفر' });
                results.push('✅ تغيّر اسم البوت بهالسيرفر.');
            } catch (error) {
                appLogger.error('[Adapt] Failed to update guild nickname:', error);
                results.push('❌ ما كدرت أغيّر الاسم. تأكد إن البوت عنده صلاحية **Change Nickname** وراجع سجلاته.');
            }
        }

        const iconURL = guild.iconURL({ extension: 'png', size: 512 });
        if (!iconURL) {
            results.push('⚠️ السيرفر ما عنده صورة، فصورة البوت بقت مثل ما هي.');
        } else {
            try {
                await guild.members.editMe({ avatar: iconURL, reason: 'تغيير الصورة حتى تطابق صورة السيرفر' });
                results.push('✅ تغيّرت صورة البوت بهالسيرفر.');
            } catch (error) {
                appLogger.error('[Adapt] Failed to update guild avatar:', error);
                results.push('❌ ما كدرت أغيّر الصورة بهالسيرفر. راجع قيود Discord وسجلات البوت.');
            }
        }

        return message.reply(results.join('\n'));
    }
};
