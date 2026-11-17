'use strict';
const appLogger = require('../../utils/app-logger');

/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 متجر السيرفر المطور — Shop Command
 * (الآن الشراء يتم بالكامل و بأمان من داخل لوحة التحكم بالرابط)
 * ═══════════════════════════════════════════════════════════
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const dashboard = require('../../dashboard-server');

// إرسال رابط المتجر بالخاص (DM)
async function sendShopDM(user) {
    const userData = db.getUserData(user.id);
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;

    const token = dashboard.generateWebToken(user);
    const storeUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/store?token=${token}`;

    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🛒 رابط متجرك الخاص')
        .setDescription('جهزتلك المتجر! هسه تگدر تشتري الأغراض والأصول من الموقع بضغطة زر.')
        .addFields(
            {
                name: '💰 رصيدك هسه',
                value: `المحفظة: **${balance.toLocaleString()}** | البنك: **${bank.toLocaleString()}** ${config.currency}`,
                inline: false
            },
            {
                name: '🔒 تنبيه أمان',
                value: 'هذا الرابط إلك وبيه جلسة آمنة للشراء بحسابك. **لا تدزّه لغيرك!** ينتهي بعد ساعة.',
                inline: false
            }
        )
        .setImage('https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=800')
        .setFooter({ text: 'اضغط الزر جوّه حتى تفتح المتجر' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('🌐 افتح المتجر وتسوق').setStyle(ButtonStyle.Link).setURL(storeUrl)
    );

    try {
        await user.send({ embeds: [embed], components: [row] });
        return true;
    } catch {
        return false; // المستخدم أغلق الخاص
    }
}

module.exports = {
    name: 'shop',
    aliases: ['متجر', 'شوب', 'store', 'buy', 'شراء'],
    description: 'يفتح رابط متجرك الخاص حتى تشتري منه مباشرة',
    usage: 'متجر',

    async execute(message) {
        try {
            const user = message.author;
            
            // إرسال الرابط بالخاص (DM)
            const sent = await sendShopDM(user);
            if (sent) {
                await message.reply('📬 دزّيتلك رابط متجرك **بالخاص** للتسوق بأمان! شيّك رسائلك الخاصة.').catch(() => {});
            } else {
                // المستخدم أغلق الـ DMs — نعطيه رابط مباشر هنا ونخبره أنه غير آمن
                const token = dashboard.generateWebToken(user);
                const storeUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/store?token=${token}`;
                
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('⚠️ ما گدرت أدز الرابط بالخاص')
                    .setDescription('افتح رسائلك الخاصة حتى يوصلك رابط المتجر بأمان بالمرة الجاية.\n\nهذا رابطك المؤقت (لا تدزّه لغيرك):')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('🌐 افتح المتجر').setStyle(ButtonStyle.Link).setURL(storeUrl)
                );

                await message.reply({ embeds: [embed], components: [row] });
            }
        } catch (err) {
            appLogger.error('[Shop Command Error]', err);
            message.reply('صار خطأ وإحنا نفتح المتجر.').catch(() => {});
        }
    }
};

