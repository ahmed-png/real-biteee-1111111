module.exports = {
    name: 'music',
    aliases: ['شغل', 'شغيل', 'play', 'p', 'وقف', 'stop', 'سكيب', 'skip', 'طابور', 'قائمة', 'queue', 'loop', 'تكرار', 'صوت', 'vol', 'الحين', 'np', 'بوز', 'توقف', 'pause', 'كمل', 'resume'],
    description: 'نظام الموسيقى متوقف',
    usage: 'شغل <اسم الأغنية>',

    async execute(message, args) {
        return message.reply('❌ **نظام الموسيقى متوقف ومحذوف من البوت بطلب من الإدارة.**');
    }
};
