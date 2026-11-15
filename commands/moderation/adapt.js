'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    name: 'adapt',
    aliases: ['تكيف', 'تكيّف', 'تكييف'],
    description: 'تغيير اسم البوت وصورته في هذا السيرفر ليطابقا السيرفر',
    usage: 'تكيف',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message) {
        const guild = message.guild;
        if (!guild) {
            return message.reply('❌ استخدم هذا الأمر داخل السيرفر.');
        }
        if (!isOwner(message.author.id) &&
            !message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر يتطلب صلاحية **الأدمن**.');
        }

        const results = [];

        if (guild.name.length > 32) {
            results.push('❌ لم يتغير الاسم: اسم السيرفر أطول من 32 حرفاً، وهو الحد الأقصى للقب في Discord.');
        } else {
            try {
                await guild.members.editMe({ nick: guild.name, reason: 'تكيف مع اسم السيرفر' });
                results.push('✅ تم تغيير اسم البوت داخل هذا السيرفر.');
            } catch (error) {
                console.error('[Adapt] Failed to update guild nickname:', error);
                results.push('❌ تعذر تغيير الاسم. تأكد من منح البوت صلاحية **Change Nickname** وتحقق من سجل البوت.');
            }
        }

        const iconURL = guild.iconURL({ extension: 'png', size: 512 });
        if (!iconURL) {
            results.push('⚠️ السيرفر لا يملك صورة؛ لم تتغير صورة البوت.');
        } else {
            try {
                await guild.members.editMe({ avatar: iconURL, reason: 'تكيف مع صورة السيرفر' });
                results.push('✅ تم تغيير صورة البوت داخل هذا السيرفر.');
            } catch (error) {
                console.error('[Adapt] Failed to update guild avatar:', error);
                results.push('❌ تعذر تغيير الصورة داخل السيرفر. تحقق من قيود Discord وسجل البوت.');
            }
        }

        return message.reply(results.join('\n'));
    }
};
