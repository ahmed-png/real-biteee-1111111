const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const db = require('../../utils/database');

module.exports = {
    name: 'friends',
    aliases: ['اصدقاء', 'صديق', 'ضيف_صديق'],
    description: 'إدارة قائمة أصحابك',
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
    if (!friend) return message.reply('❌ سوّي منشن للشخص!');
    if (friend.id === message.author.id) return message.reply('❌ ما تگدر تضيف نفسك، صير صاحب نفسك 😄');

    const userId = message.author.id;
    const userData = db.getUserData(userId);
    const userFriends = Array.isArray(userData.friends) ? userData.friends : [];
    if (userFriends.some(entry => entry.userId === friend.id)) {
        return message.reply('✅ إنتو أصلاً أصحاب!');
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
    return message.reply(`✅ ضفنا ${friend} لقائمة أصحابك!`);
}

async function listFriends(message) {
    const userData = db.getUserData(message.author.id);
    const userFriends = (Array.isArray(userData.friends) ? userData.friends : [])
        .map(entry => entry.userId)
        .filter(Boolean)
        .map(userId => `<@${userId}>`);
    if (userFriends.length === 0) return message.reply('❌ لحد هسه ما عندك أصحاب بالقائمة!');
    const embed = PremiumEmbedBuilder.info('👥 قائمة أصحابك', userFriends.join('\n'));
    return message.reply({ embeds: [embed] });
}
