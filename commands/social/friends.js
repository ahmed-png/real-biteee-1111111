const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const db = require('../../utils/database');

module.exports = {
    name: 'friends',
    aliases: ['اصدقاء', 'صديق', 'ضيف_صديق'],
    description: 'نظام الأصدقاء الأساسي',
    usage: 'friends [add @user | list]',

    async execute(message, args) {
        if (!args[0] || args[0] === 'list' || message.content.includes('قائمة')) {
            return await listFriends(message);
        }
        if (args[0] === 'add' || message.mentions.users.size > 0) {
            return await addFriend(message);
        }
    }
};

async function addFriend(message) {
    const friend = message.mentions.users.first();
    if (!friend) return message.reply('❌ منشن الشخص!');
    if (friend.id === message.author.id) return message.reply('❌ لا يمكنك إضافة نفسك!');

    const userId = message.author.id;
    const userData = db.getUserData(userId);
    const userFriends = Array.isArray(userData.friends) ? userData.friends : [];
    if (userFriends.some(entry => entry.userId === friend.id)) {
        return message.reply('✅ أنتما أصدقاء بالفعل!');
    }

    const since = Date.now();
    db.updateUserData(userId, {
        friends: [...userFriends, { userId: friend.id, since }]
    });

    const friendData = db.getUserData(friend.id);
    const friendFriends = Array.isArray(friendData.friends) ? friendData.friends : [];
    if (!friendFriends.some(entry => entry.userId === userId)) {
        db.updateUserData(friend.id, {
            friends: [...friendFriends, { userId, since }]
        });
    }
    return message.reply(`✅ تم إضافة ${friend} إلى قائمة أصدقائك!`);
}

async function listFriends(message) {
    const userData = db.getUserData(message.author.id);
    const userFriends = (Array.isArray(userData.friends) ? userData.friends : [])
        .map(entry => entry.userId)
        .filter(Boolean)
        .map(userId => `<@${userId}>`);
    if (userFriends.length === 0) return message.reply('❌ ليس لديك أصدقاء بعد!');
    const embed = PremiumEmbedBuilder.info('👥 قائمة أصدقائك', userFriends.join('\n'));
    return message.reply({ embeds: [embed] });
}
