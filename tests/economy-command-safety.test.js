'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../utils/database');
const coreDatabase = require('../src/database/db');

function loadCasinoCommand(t) {
    const commandPath = require.resolve('../commands/economy/casino');
    delete require.cache[commandPath];
    t.after(() => { delete require.cache[commandPath]; });
    return require(commandPath);
}

function loadTournamentModule(t) {
    const modulePath = require.resolve('../commands/games/tournaments');
    delete require.cache[modulePath];
    t.after(() => { delete require.cache[modulePath]; });
    return require(modulePath);
}

test('roulette rejects invalid or non-positive bets without changing the balance', async t => {
    let updateCalls = 0;
    t.mock.method(database, 'getUserData', () => ({ balance: 1000 }));
    t.mock.method(database, 'updateFields', () => { updateCalls++; });
    const casinoCommand = loadCasinoCommand(t);

    for (const bet of ['-100', '0', '1.5', 'not-a-number']) {
        const replies = [];
        await casinoCommand.execute({
            author: { id: 'test-user' },
            async reply(content) { replies.push(content); }
        }, ['roulette', 'red', bet]);

        assert.match(replies[0], /مبلغ الرهان/);
    }

    assert.equal(updateCalls, 0);
});

test('crash cashout is credited once and is not paid again at crash settlement', async t => {
    let now = 1_000_000;
    let intervalCallback;
    let collectCallback;
    const payouts = [];
    t.mock.method(Date, 'now', () => now);
    t.mock.method(Math, 'random', () => 0);
    t.mock.method(globalThis, 'setInterval', callback => {
        intervalCallback = callback;
        return 1;
    });
    t.mock.method(globalThis, 'clearInterval', () => {});
    t.mock.method(globalThis, 'setTimeout', () => 1);
    t.mock.method(globalThis, 'clearTimeout', () => {});
    t.mock.method(database, 'getUserData', () => ({ balance: 1000 }));
    t.mock.method(database, 'removeMoney', () => true);
    t.mock.method(database, 'addMoney', (userId, amount) => {
        payouts.push({ userId, amount });
        return amount;
    });
    t.mock.method(database, 'addTransaction', () => {});
    t.mock.method(coreDatabase, 'getUserData', () => ({ balance: 1000 }));
    t.mock.method(coreDatabase, 'updateUserData', () => ({ balance: 1000 }));
    t.mock.method(coreDatabase, 'updateFields', () => ({ balance: 1000 }));
    t.mock.method(coreDatabase, 'removeMoney', () => true);
    t.mock.method(coreDatabase, 'addMoney', (userId, amount) => {
        payouts.push({ userId, amount });
        return amount;
    });
    t.mock.method(coreDatabase, 'addTransaction', () => {});
    const casinoCommand = loadCasinoCommand(t);

    const gameMessage = {
        async edit() {},
        createMessageComponentCollector() {
            return {
                on(event, callback) {
                    if (event === 'collect') collectCallback = callback;
                    return this;
                },
                stop() {}
            };
        }
    };
    const message = {
        author: { id: 'test-user' },
        channel: { id: 'test-channel' },
        async reply() { return gameMessage; }
    };

    await casinoCommand.execute(message, ['crash', '100']);
    await collectCallback({
        customId: 'crash_cashout_test-user',
        user: { id: 'test-user' },
        async reply() {},
        async update() {}
    });

    now += 1000;
    await intervalCallback();
    assert.equal(payouts.length, 1);
    assert.equal(payouts[0].userId, 'test-user');
});

test('tournaments reject negative fees and do not register players when a fee debit fails', async t => {
    t.mock.method(database, 'getUserData', () => ({ balance: 1000 }));
    t.mock.method(database, 'removeMoney', () => false);
    t.mock.method(coreDatabase, 'getUserData', () => ({ balance: 1000 }));
    t.mock.method(coreDatabase, 'removeMoney', () => false);
    const { tournamentSystem } = loadTournamentModule(t);

    const initialSize = tournamentSystem.activeTournaments.size;
    await assert.rejects(
        tournamentSystem.createTournament({ id: 'test-guild' }, { entryFee: -100 }),
        /رسوم الاشتراك/
    );
    assert.equal(tournamentSystem.activeTournaments.size, initialSize);

    const tournamentId = `test-${Date.now()}`;
    const tournament = {
        id: tournamentId,
        entryFee: -100,
        prizePool: 0,
        maxPlayers: 8,
        participants: [],
        status: 'registration'
    };
    tournamentSystem.activeTournaments.set(tournamentId, tournament);
    const invalidFee = await tournamentSystem.registerPlayer(tournamentId, 'test-user', 'Tester');
    assert.equal(invalidFee.success, false);
    assert.equal(tournament.prizePool, 0);
    assert.equal(tournament.participants.length, 0);

    tournament.entryFee = 100;
    const debitFailure = await tournamentSystem.registerPlayer(tournamentId, 'test-user', 'Tester');
    assert.equal(debitFailure.success, false);
    assert.equal(tournament.prizePool, 0);
    assert.equal(tournament.participants.length, 0);
    tournamentSystem.activeTournaments.delete(tournamentId);
});
