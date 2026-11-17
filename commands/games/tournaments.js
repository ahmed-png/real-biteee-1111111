const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

// نظام البطولات التلقائية
class TournamentSystem {
    constructor() {
        this.activeTournaments = new Map();
        this.tournamentHistory = [];
    }

    // إنشاء بطولة جديدة
    async createTournament(guild, options = {}) {
        const entryFee = options.entryFee === undefined ? 1000 : options.entryFee;
        if (!Number.isSafeInteger(entryFee) || entryFee < 0) {
            throw new RangeError('رسوم الاشتراك ما يصير تكون سالبة ولازم تكون عدد صحيح.');
        }

        const tournamentId = `tournament_${Date.now()}`;

        const tournament = {
            id: tournamentId,
            guildId: guild.id,
            game: options.game || 'mixed', // 'slots', 'blackjack', 'trivia', 'mixed'
            entryFee,
            prizePool: 0,
            maxPlayers: options.maxPlayers || 16,
            participants: [],
            status: 'registration', // 'registration', 'active', 'finished'
            startTime: Date.now() + (options.delayMinutes || 30) * 60 * 1000,
            rounds: [],
            createdAt: Date.now()
        };

        this.activeTournaments.set(tournamentId, tournament);
        return tournament;
    }

    // التسجيل في بطولة
    async registerPlayer(tournamentId, userId, username) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return { success: false, error: 'البطولة مو موجودة!' };

        if (tournament.status !== 'registration') {
            return { success: false, error: 'خلص وقت التسجيل!' };
        }

        if (tournament.participants.some(p => p.userId === userId)) {
            return { success: false, error: 'إنت مسجّل من قبل!' };
        }

        if (tournament.participants.length >= tournament.maxPlayers) {
            return { success: false, error: 'البطولة مليانة!' };
        }

        const userData = db.getUserData(userId);
        if (!Number.isSafeInteger(tournament.entryFee) || tournament.entryFee < 0) {
            return { success: false, error: 'رسوم الاشتراك بهالبطولة مو صالحة.' };
        }
        if (userData.balance < tournament.entryFee) {
            return { success: false, error: 'رصيدك ما يكفي!' };
        }

        // خصم رسوم الدخول
        if (tournament.entryFee > 0 && !db.removeMoney(userId, tournament.entryFee)) {
            return { success: false, error: 'ما گدرنا نخصم رسوم الاشتراك. جرّب مرة ثانية.' };
        }
        tournament.prizePool += tournament.entryFee;

        tournament.participants.push({
            userId,
            username,
            score: 0,
            wins: 0,
            losses: 0,
            eliminated: false
        });

        return { success: true, tournament };
    }

    // بدء البطولة
    async startTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return null;

        tournament.status = 'active';
        tournament.actualStartTime = Date.now();

        // إنشاء جدول المباريات
        tournament.rounds = this.generateBracket(tournament.participants);

        return tournament;
    }

    // توليد جدول المباريات
    generateBracket(participants) {
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        const rounds = [];
        let currentRound = [];

        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                currentRound.push({
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    winner: null,
                    completed: false
                });
            } else {
                // لاعب واحد متبقي - يتأهل تلقائياً
                currentRound.push({
                    player1: shuffled[i],
                    player2: null,
                    winner: shuffled[i],
                    completed: true
                });
            }
        }

        rounds.push(currentRound);
        return rounds;
    }

    // عرض البطولات النشطة
    getActiveTournaments(guildId) {
        return Array.from(this.activeTournaments.values())
            .filter(t => t.guildId === guildId);
    }

    // عرض تفاصيل بطولة
    getTournamentEmbed(tournament) {
        const statusEmoji = {
            'registration': '📝',
            'active': '🏆',
            'finished': '✅'
        };

        const embed = PremiumEmbedBuilder.custom({
            color: tournament.status === 'finished' ? '#FFD700' : '#3498DB',
            title: `${statusEmoji[tournament.status]} بطولة ${getGameName(tournament.game)}`,
            description: `المعرّف: \`${tournament.id}\``,
        });

        // معلومات البطولة
        embed.addFields(
            {
                name: `${ICONS.COIN} جائزة البطولة`,
                value: `**${tournament.prizePool.toLocaleString()}** ${config.currency}`,
                inline: true
            },
            {
                name: '👥 المشاركين',
                value: `${tournament.participants.length}/${tournament.maxPlayers}`,
                inline: true
            },
            {
                name: '💵 رسوم الاشتراك',
                value: `${tournament.entryFee.toLocaleString()} ${config.currency}`,
                inline: true
            }
        );

        // الحالة
        if (tournament.status === 'registration') {
            const timeLeft = Math.max(0, tournament.startTime - Date.now());
            const minutes = Math.floor(timeLeft / 60000);
            embed.addFields({
                name: '⏰ وقت البداية',
                value: `بعد **${minutes}** دقيقة\nسجّل هسه: \`!tournament join ${tournament.id}\``,
                inline: false
            });
        }

        // عرض المشاركين
        if (tournament.participants.length > 0) {
            const participantsList = tournament.participants
                .slice(0, 10)
                .map((p, i) => `${i + 1}. ${p.username} ${p.eliminated ? '❌' : ''}`)
                .join('\n');

            embed.addFields({
                name: '📋 المشاركين',
                value: participantsList + (tournament.participants.length > 10 ? `\n...و ${tournament.participants.length - 10} آخرين` : ''),
                inline: false
            });
        }

        // الفائز
        if (tournament.status === 'finished' && tournament.winner) {
            embed.addFields({
                name: '👑 الفايز',
                value: `**${tournament.winner.username}**\nالجائزة: **${tournament.finalPrize.toLocaleString()}** ${config.currency}`,
                inline: false
            });
        }

        return embed;
    }
}

// helper
function getGameName(gameType) {
    const names = {
        'slots': 'سلوتس',
        'blackjack': 'بلاك جاك',
        'trivia': 'أسئلة عامة',
        'mixed': 'منوّعة'
    };
    return names[gameType] || 'عامّة';
}

// Singleton instance
const tournamentSystem = new TournamentSystem();

// أوامر البطولة
async function tournamentCommand(message, args) {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'list') {
        return await listTournaments(message);
    }

    if (subcommand === 'create') {
        // للإدمن فقط
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ هالأمر للإداريين بس!');
        }
        return await createTournamentCommand(message, args.slice(1));
    }

    if (subcommand === 'join') {
        return await joinTournament(message, args[1]);
    }

    if (subcommand === 'info') {
        return await tournamentInfo(message, args[1]);
    }

    return message.reply('الاستخدام مو صحيح! جرّب: `!tournament list/create/join/info`');
}

async function listTournaments(message) {
    const tournaments = tournamentSystem.getActiveTournaments(message.guild.id);

    if (tournaments.length === 0) {
        return message.reply('📭 ماكو بطولات شغّالة هسه!');
    }

    const embed = PremiumEmbedBuilder.custom({
        color: '#3498DB',
        title: '🏆 البطولات الشغّالة',
        description: `عدد البطولات: **${tournaments.length}**`
    });

    tournaments.forEach((t, i) => {
        embed.addFields({
            name: `${i + 1}. ${getGameName(t.game)} - ${t.status === 'registration' ? '📝 تسجيل' : '🏆 شغّالة'}`,
            value:
                `المعرّف: \`${t.id}\`\n` +
                `الجائزة: **${t.prizePool.toLocaleString()}** ${config.currency}\n` +
                `المشاركين: ${t.participants.length}/${t.maxPlayers}\n` +
                `رسوم الاشتراك: ${t.entryFee.toLocaleString()} ${config.currency}`,
            inline: true
        });
    });

    await message.reply({ embeds: [embed] });
}

async function createTournamentCommand(message, args) {
    const game = args[0] || 'mixed';
    const parsedEntryFee = args[1] === undefined ? 1000 : Number(args[1]);
    if (!Number.isSafeInteger(parsedEntryFee) || parsedEntryFee < 0) {
        return message.reply('❌ رسوم الاشتراك ما يصير تكون سالبة ولازم تكون عدد صحيح.');
    }
    const entryFee = parsedEntryFee;
    const maxPlayers = parseInt(args[2]) || 16;
    const delayMinutes = parseInt(args[3]) || 30;

    const tournament = await tournamentSystem.createTournament(message.guild, {
        game,
        entryFee,
        maxPlayers,
        delayMinutes
    });

    const embed = tournamentSystem.getTournamentEmbed(tournament);
    await message.reply({ embeds: [embed] });

    // جدولة بدء البطولة
    setTimeout(async () => {
        if (tournament.participants.length >= 2) {
            await tournamentSystem.startTournament(tournament.id);
            const channel = message.guild.channels.cache.get(message.channel.id);
            if (channel) {
                channel.send(`🏆 **بدت بطولة ${getGameName(tournament.game)}!**\nالجائزة: **${tournament.prizePool.toLocaleString()}** ${config.currency}`);
            }
        } else {
            // إلغاء - عدد مشاركين قليل
            tournament.participants.forEach(p => {
                db.addMoney(p.userId, tournament.entryFee); // إرجاع الرسوم
            });
            tournamentSystem.activeTournaments.delete(tournament.id);
        }
    }, delayMinutes * 60 * 1000);
}

async function joinTournament(message, tournamentId) {
    const result = await tournamentSystem.registerPlayer(
        tournamentId,
        message.author.id,
        message.author.username
    );

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    const embed = tournamentSystem.getTournamentEmbed(result.tournament);
    await message.reply({ content: '✅ تسجّلت بالبطولة بنجاح!', embeds: [embed] });
}

async function tournamentInfo(message, tournamentId) {
    const tournament = tournamentSystem.activeTournaments.get(tournamentId);
    if (!tournament) {
        return message.reply('❌ البطولة مو موجودة!');
    }

    const embed = tournamentSystem.getTournamentEmbed(tournament);
    await message.reply({ embeds: [embed] });
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'tournament',
    aliases: ['بطولة', 'tournaments'],
    description: 'دير البطولات، سجّل واعرف التفاصيل',
    usage: 'tournament [list/create/join/info]',

    async execute(message, args) {
        await tournamentCommand(message, args);
    },

    // ─── export الدوال للاستخدام من ملفات أخرى ──────────────────
    tournamentCommand,
    tournamentSystem,
};
