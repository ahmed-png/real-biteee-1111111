'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../utils/database');
const friendsCommand = require('../commands/social/friends');
const pollCommand = require('../commands/social/poll');

function createMessage(authorId, mentionedUser) {
    const replies = [];
    return {
        message: {
            author: { id: authorId },
            content: '',
            mentions: {
                users: {
                    size: mentionedUser ? 1 : 0,
                    first: () => mentionedUser
                }
            },
            async reply(payload) {
                replies.push(payload);
                return payload;
            }
        },
        replies
    };
}

test('friendships are stored for both users and remain listable from persisted user data', async t => {
    const users = new Map();
    t.mock.method(database, 'getUserData', userId => users.get(userId) || { userId, friends: [] });
    t.mock.method(database, 'updateUserData', (userId, fields) => {
        users.set(userId, { ...database.getUserData(userId), ...fields });
    });

    const friend = { id: 'user-b', toString: () => '<@user-b>' };
    const { message, replies } = createMessage('user-a', friend);
    await friendsCommand.execute(message, ['add']);

    const userAFriends = users.get('user-a').friends;
    const userBFriends = users.get('user-b').friends;
    assert.deepEqual(userAFriends.map(entry => entry.userId), ['user-b']);
    assert.deepEqual(userBFriends.map(entry => entry.userId), ['user-a']);
    assert.equal(userAFriends[0].since, userBFriends[0].since);
    assert.match(replies[0], /تم إضافة/);

    const { message: listMessage, replies: listReplies } = createMessage('user-b', null);
    await friendsCommand.execute(listMessage, ['list']);
    assert.match(JSON.stringify(listReplies[0]), /<@user-a>/);
});

test('adding the same friend twice does not duplicate the persisted friendship', async t => {
    const users = new Map();
    t.mock.method(database, 'getUserData', userId => users.get(userId) || { userId, friends: [] });
    t.mock.method(database, 'updateUserData', (userId, fields) => {
        users.set(userId, { ...database.getUserData(userId), ...fields });
    });

    const friend = { id: 'user-b', toString: () => '<@user-b>' };
    const { message: firstMessage } = createMessage('user-a', friend);
    await friendsCommand.execute(firstMessage, ['add']);
    const { message: secondMessage, replies } = createMessage('user-a', friend);
    await friendsCommand.execute(secondMessage, ['add']);

    assert.equal(users.get('user-a').friends.length, 1);
    assert.match(replies[0], /أصدقاء بالفعل/);
});

test('poll creation rejects empty options before creating Discord components', async () => {
    for (const args of [
        ['Question', '|', 'Option A', '|'],
        ['Question', '|', '|', 'Option B']
    ]) {
        const replies = [];
        await pollCommand.execute({
            async reply(content) {
                replies.push(content);
            }
        }, args);

        assert.match(replies[0], /خيارين على الأقل/);
    }
});
