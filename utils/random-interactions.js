'use strict';

const appLogger = require('./app-logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('./database');
const chatLearner = require('./chat-learner');
const aiBrain = require('./ai-brain');
const clanManager = require('./clan-manager');
const config = require('../config');
const botSettings = require('./bot-settings');

const MOODS = {
    happy: { emoji: '😄', label: 'مبسوط', color: '#FFD700' },
    bored: { emoji: '😑', label: 'ملّان', color: '#95A5A6' },
    excited: { emoji: '🔥', label: 'متحمس', color: '#E74C3C' },
    curious: { emoji: '🤔', label: 'فضولي', color: '#3498DB' },
    sleepy: { emoji: '😴', label: 'نعسان', color: '#9B59B6' },
    spicy: { emoji: '🌶️', label: 'متحدي', color: '#FF5733' },
    wise: { emoji: '🧠', label: 'رايق', color: '#1ABC9C' },
    analytical: { emoji: '🔬', label: 'مرتب', color: '#2C3E50' },
    creative: { emoji: '🎨', label: 'مبدع', color: '#8E44AD' },
    nostalgic: { emoji: '🌅', label: 'مشتاق', color: '#D35400' },
    philosophical: { emoji: '💭', label: 'يفكر', color: '#16A085' },
};

class RandomInteractions {
    constructor() {
        this.currentMood = 'happy';
        this.lastLearnedReply = 0;

        this.moodMessages = {
            happy: [
                'شكو ماكو؟ شلون يومكم؟',
                'ها، شنو الأخبار؟',
                'اليوم رايق، إن شاء الله إنتوا همين.',
                'منو موجود نسولف شوي؟',
            ],
            bored: [
                'الشات هادي اليوم، وينكم؟',
                'ماكو أحد يحچي؟ خل نسولف.',
                'وين أهل السيرفر؟',
                'إذا موجودين اكتبوا شي.',
            ],
            excited: [
                'يلا، منو يلعب؟',
                'عندي حيل، شنو نلعب؟',
                'منو يتحداني؟',
                'خل نسوي جو بالسيرفر.',
            ],
            curious: [
                'سؤال سريع: شنو آخر شي ضحككم؟',
                'لو تسافرون هسة، وين تروحون؟',
                'تفضلون چاي لو قهوة؟',
                'شنو اللعبة اللي ما تملّون منها؟',
            ],
            sleepy: [
                'نعسانين لو بعدكم صاحيين؟',
                'الشات هادي، شكلكم تريدون ترگدون.',
                'منو صاحي لهسه؟',
                'شنو آخر شي سويتوه قبل لا تنامون؟',
            ],
            spicy: [
                'منو مستعد يتحدى؟ لا تخلوني أنتظر هواية.',
                'يلا نشوف منو أسرع واحد بالتريفيا، لا تجاوب قبل لا تقرا يا عبقري.',
                'منو عنده سؤال يحرجني؟ خلي أشوف شطارتكم.',
                'التحدي مفتوح، منو يبدي؟ لا أحد يختفي هالمرة.',
            ],
            wise: [
                'خطوة صغيرة كل يوم تسوي فرق.',
                'لا تستعجل، كل شي بوقته.',
                'إذا غلطت، تعلّم وكمّل.',
                'الراحة هم مهمة، لا تضغط على نفسك.',
            ],
            analytical: [
                'أحسن خطة تبدأ بخطوة واضحة.',
                'نقسم الشغلة ونخلصها شوي شوي.',
                'إذا الموضوع معقد، خل نبدي بالأسهل.',
                'مرات سؤال مضبوط يوفر هواية وقت.',
            ],
            creative: [
                'لو تغيرون اسم السيرفر، شتختارون؟',
                'اقترحوا فعالية جديدة نسويها هنا.',
                'لو تسوون لعبة للسيرفر، شنو فكرتها؟',
                'شنو أحلى شي ممكن نضيفه للسيرفر؟',
            ],
            nostalgic: [
                'تتذكرون أول يوم دخلتوا هالسيرفر؟',
                'شنو أحلى ذكرى عندكم من هنا؟',
                'منو بعده يتذكر أول فعالية سويناها؟',
                'أكو لعبة قديمة بعدكم تلعبوها؟',
            ],
            philosophical: [
                'برأيكم، شنو اللي يخلي اليوم حلو؟',
                'شنو أهم شي تعلمتوه هالسنة؟',
                'تفضلون تخططون لكلشي لو تمشونها عالبركة؟',
                'شنو الشي البسيط اللي يعدل مزاجكم؟',
            ],
        };
        this.jokes = [
            'واحد راح للدكتور گله: كلما أشرب چاي توجعني عيني. گله: شيل الملعقة من الاستكان.',
            'واحد اشترى منبه ذكي، كل يوم يرن وما يصحى. المنبه گاله: المشكلة مو بيّه.',
            'مبرمج گال لصاحبه: رتبت حياتي. گله: شلون؟ گال: سويت مجلدات، بس بعدني ما بديت.',
            'واحد نسى وين حط موبايله، دگ على نفسه حتى يلكاه. من رن، تذكر إن الموبايل بيده.',
            'واحد سأل صاحبه: شلونك؟ گاله: مثل النت، مرات سريع ومرات أختفي.',
            'المبرمج راح يشتري خبز، رجع بخبز ونسخة احتياطية من القائمة.',
            'واحد گال: باچر أبدي رياضة. باچر إجا، گال: خلي أستعد نفسياً.',
            'صاحبي يكول عنده ذاكرة قوية، بس كل ما أسأله وينها يكول ناسي.',
        ];
        this.facts = [
            'للأخطبوط ثلاثة قلوب، ودمه أزرق بسبب بروتين يحتوي على النحاس.',
            'الصوت ينتقل بالماي أسرع من انتقاله بالهواء.',
            'ضوء القمر يوصل للأرض تقريباً خلال ثانية وثلث.',
            'حرارة نواة الشمس تقارب 15 مليون درجة مئوية.',
            'اليوم على كوكب الزهرة أطول من سنته.',
            'الفراشة تتذوق الطعام بمستقبلات موجودة بأقدامها.',
            'الأرض تدور أسرع ما يمكن عند خط الاستواء، بسرعة تقارب 1670 كيلومتر بالساعة.',
            'القمر يبتعد عن الأرض بمعدل يقارب 3.8 سنتيمتر بالسنة.',
            'جسم الإنسان البالغ بيه تقريباً 37 تريليون خلية.',
            'النحلة تحتاج تزور آلاف الأزهار حتى تجمع رحيق يكفي لصنع العسل.',
            'الماء يتمدد من يتجمد، ولهذا الجليد يطفو على سطحه.',
            'الخفاش هو الثديي الوحيد القادر على الطيران الحقيقي.',
        ];
        this.challenges = [
            { msg: 'تحدي سرعة: أول واحد يرسل نقطة يربح {}!', type: 'dot' },
            { msg: 'خمن رقم بين 1 و10، والفائز ياخذ {}!', type: 'number', answer: () => Math.floor(Math.random() * 10) + 1 },
            { msg: 'خمن رقم بين 1 و50، والفائز ياخذ {} مضاعفة!', type: 'number', answer: () => Math.floor(Math.random() * 50) + 1 },
            { msg: 'لغز: إلي غرف هواية بس ما بيه أبواب ولا شبابيك، شنو هو؟ الجواب يربح {}!', type: 'qa', answer: 'العقل' },
            { msg: 'كمل المثل: العقل السليم بالجسم...', type: 'qa', answer: 'السليم' },
            { msg: 'احسبوها: 15 × 8 ÷ 6، أول جواب مضبوط يربح {}!', type: 'qa', answer: '20' },
            { msg: 'شنو أعلى جبل بالعالم؟ أول جواب مضبوط يربح {}!', type: 'qa', answer: 'إيفرست' },
            { msg: 'شنو عاصمة البرازيل؟ أول جواب مضبوط يربح {}!', type: 'qa', answer: 'برازيليا' },
            { msg: 'شنو أكثر غاز موجود بالغلاف الجوي؟ الجواب يربح {}!', type: 'qa', answer: 'نيتروجين' },
            { msg: 'كلما تاخذ منها تكبر، شنو هي؟ الجواب يربح {}!', type: 'qa', answer: 'حفرة' },
            { msg: 'شنو عاصمة اليابان؟ الجواب يربح {}!', type: 'qa', answer: 'طوكيو' },
            { msg: 'شنو الكوكب الأحمر؟ الجواب يربح {}!', type: 'qa', answer: 'المريخ' },
            { msg: 'شكد ناتج 8 × 7؟ أول جواب يربح {}!', type: 'qa', answer: '56' },
            { msg: 'شكد ناتج 12 + 25 - 7؟ الجواب يربح {}!', type: 'qa', answer: '30' },
            { msg: 'شنو أكبر محيط بالعالم؟ الجواب يربح {}!', type: 'qa', answer: 'الهادئ' },
            { msg: 'كمل المتتالية: 2، 4، 8، 16... شنو الرقم الجاي؟', type: 'qa', answer: '32' },
            { msg: 'شكد ناتج 100 ÷ 4؟ الجواب يربح {}!', type: 'qa', answer: '25' },
        ];
        this.activeChallenges = new Map();
    }

    initialize(client) {
        const enabled = botSettings.get('autoMessagesEnabled');
        appLogger.info('نظام التفاعلات العشوائية v3 جاهز — 11 حالة مزاجية');
        appLogger.info(`الرسائل التلقائية: ${enabled !== false ? 'مفعلة' : 'معطلة'}`);

        // يقرأ الإعدادات عند كل تشغيل (ديناميكي)
        const getInterval = (key, defaultMins) => (botSettings.get(key) || defaultMins) * 60 * 1000;

        setInterval(() => this._changeMood(), 30 * 60 * 1000).unref?.();

        setInterval(() => {
            if (botSettings.get('autoMessagesEnabled') !== false) {
                this.triggerRandomEvent(client).catch(() => {});
            }
        }, getInterval('randomEventInterval', 20)).unref?.();

        setInterval(() => {
            if (botSettings.get('autoMessagesEnabled') !== false) {
                this.triggerChallenge(client).catch(() => {});
            }
        }, getInterval('challengeInterval', 45)).unref?.();

        setInterval(() => {
            if (botSettings.get('autoMessagesEnabled') !== false) {
                this.sendMoodMessage(client).catch(() => {});
            }
        }, getInterval('moodMessageInterval', 180)).unref?.();

        setInterval(() => {
            if (botSettings.get('autoMessagesEnabled') !== false) {
                this._sendTimeBasedGreeting(client).catch(() => {});
            }
        }, getInterval('greetingInterval', 240)).unref?.();
    }

    _changeMood() {
        const moods = Object.keys(MOODS);
        // الأوزان للحالات المزاجية
        const weights = [22, 8, 14, 14, 6, 6, 8, 8, 6, 5, 3];
        let rand = Math.random() * weights.reduce((a, b) => a + b, 0);
        let i = 0;
        for (; i < weights.length - 1 && rand > weights[i]; i++) rand -= weights[i];
        this.currentMood = moods[i];
    }

    // ردود ديناميكية حسب وقت اليوم
    async _sendTimeBasedGreeting(client) {
        if (botSettings.get('autoMessagesEnabled') === false) return;
        const hour = new Date().getHours();
        if (Math.random() > 0.35) return; // 65% يتخطى
        let greet = null;
        if (hour >= 5 && hour < 11) greet = ['صباح الخير، شلونكم اليوم؟', 'صباح النور، لا تنسون مكافأة اليومي.', 'صباح الورد، منو صاحي؟'];
        else if (hour >= 11 && hour < 14) greet = ['وصلنا نص النهار، شلون يومكم؟', 'عافية على اللي دا يتغدّى.', 'شنو مخططين لباقي اليوم؟'];
        else if (hour >= 14 && hour < 18) greet = ['شلون ماشي يومكم؟', 'منو يريد يسولف شوي؟', 'هسة وقت حلو للعب، منو موجود؟'];
        else if (hour >= 18 && hour < 22) greet = ['مسا الخير يا أهل السيرفر.', 'مسا النشاط، شكو ماكو؟', 'منو موجود نسولف؟'];
        else greet = ['ليلة هادية عليكم.', 'شكو ماكو يا سهّارين؟', 'منو بعده صاحي لهسه؟'];

        const msg = greet[Math.floor(Math.random() * greet.length)];
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (ch) await ch.send(msg);
            } catch { /* ignore */ }
        }
    }

    getMoodInfo() { return MOODS[this.currentMood]; }

    async triggerRandomEvent(client) {
        if (botSettings.get('autoMessagesEnabled') === false) return;
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (!ch) continue;
                const rand = Math.random();
                if (rand < 0.20) await this._sendMoodRandom(ch);
                else if (rand < 0.35) await this._replayLearnedPhrase(ch);
                else if (rand < 0.48) await this._reactToLastMessage(ch);
                else if (rand < 0.62) await this._sendJoke(ch);
                else if (rand < 0.76) await this._sendFact(ch);
                else if (rand < 0.88) await this.startFastestClicker(ch);
                else await this._sendTip(ch);
            } catch (e) { /* ignore */ }
        }
    }

    async sendMoodMessage(client) {
        if (botSettings.get('autoMessagesEnabled') === false) return;
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (!ch) continue;
                const mood = this.getMoodInfo();
                const msgs = this.moodMessages[this.currentMood];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                const embed = new EmbedBuilder()
                    .setColor(mood.color)
                    .setDescription(`${mood.emoji} **${msg}**`)
                    .setFooter({ text: `حالتي هسة: ${mood.label}` })
                    .setTimestamp();
                await ch.send({ embeds: [embed] });
            } catch (e) { /* ignore */ }
        }
    }

    async triggerChallenge(client) {
        if (botSettings.get('autoMessagesEnabled') === false) return;
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (!ch) continue;
                if (this.activeChallenges.has(ch.id)) continue;

                const reward = Math.floor(Math.random() * 1200) + 300;
                const template = this.challenges[Math.floor(Math.random() * this.challenges.length)];
                const challengeMsg = template.msg.replace('{}', reward.toLocaleString());

                const embed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('تحدي سريع')
                    .setDescription(challengeMsg)
                    .setFooter({ text: 'عندكم 30 ثانية؛ أول واحد يجاوب صح يربح.' })
                    .setTimestamp();

                await ch.send({ embeds: [embed] });

                const answer = template.answer
                    ? (typeof template.answer === 'function' ? template.answer() : template.answer)
                    : null;

                this.activeChallenges.set(ch.id, { type: template.type, answer, reward, startedAt: Date.now() });

                setTimeout(() => {
                    if (this.activeChallenges.has(ch.id)) {
                        this.activeChallenges.delete(ch.id);
                        ch.send('خلص الوقت، ماكو أحد جاوب هالمرة.').catch(() => { });
                    }
                }, 30000);
            } catch (e) { /* ignore */ }
        }
    }

    async checkChallenge(message) {
        const challenge = this.activeChallenges.get(message.channel.id);
        if (!challenge || message.author.bot) return false;

        const text = message.content.trim().toLowerCase();
        let correct = false;

        switch (challenge.type) {
            case 'dot': correct = text === '.'; break;
            case 'number': correct = text === String(challenge.answer); break;
            case 'phrase': correct = text === challenge.answer; break;
            case 'qa': correct = text.includes(challenge.answer.toLowerCase()); break;
        }

        if (correct) {
            this.activeChallenges.delete(message.channel.id);
            const userData = db.getUserData(message.author.id);
            userData.balance = (userData.balance || 0) + challenge.reward;
            db.updateUserData(message.author.id, userData);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('فزت بالتحدي')
                .setDescription(`عاشت إيدك <@${message.author.id}>، جاوبت صح وربحت **${challenge.reward.toLocaleString()}** ${config.currency}.`)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            return true;
        }
        return false;
    }

    async handleContextualReply(message) {
        // احتمال الرد: 15% ( من 13%)
        if (Math.random() > 0.15) return false;
        if (message.author.bot) return false;
        if (!chatLearner.canReply(message.channel.id)) return false;

        const text = message.content;

        // سجّل الرسالة في ai-brain
        try { aiBrain.recordUserMessage(message.author.id, message.author.username, text); } catch { /* ignore */ }

        // 0) فحص قاعدة المعرفة المُضمَّنة
        const knownAnswer = aiBrain.lookupKnowledge(text);
        if (knownAnswer) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
            await message.reply(knownAnswer).catch(() => { });
            return true;
        }

        // 1) رد من نظام التعلم
        const learnedReply = chatLearner.getReply(text);
        if (learnedReply) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 800));
            await message.reply(learnedReply).catch(() => { });
            return true;
        }

        // 2) رد ذكي محلي من ai-brain
        const localReply = aiBrain.buildLocalReply(text, message.author.id);
        if (localReply && Math.random() < 0.4) {
            await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
            await message.reply(localReply).catch(() => { });
            return true;
        }

        // 3) إعادة عبارة محفوظة حسب الموضوع
        const classification = aiBrain.classifyMessage(text);
        const learned = chatLearner.getLearnedPhraseByTopic
            ? chatLearner.getLearnedPhraseByTopic(classification.topic, message.author.id)
            : chatLearner.getLearnedPhrase(message.author.id);

        if (learned) {
            const now = Date.now();
            if (now - this.lastLearnedReply < 2.5 * 60 * 1000) return false;
            this.lastLearnedReply = now;

            const templates = [
                `"${learned.text}" — هاي چانت سالفة ${learned.username}.`,
                `تتذكرون من ${learned.username} گال: "${learned.text}"؟`,
                `من سوالف الشات القديمة: "${learned.text}"`,
                `اقتباس من سوالفنا: "${learned.text}" — ${learned.username}`,
                `${learned.username} گالها مرة: "${learned.text}"`,
            ];
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
            await message.channel.send(templates[Math.floor(Math.random() * templates.length)]).catch(() => { });
            return true;
        }

        return false;
    }

    // دوال داخلية
    async _sendMoodRandom(channel) {
        const msgs = this.moodMessages[this.currentMood];
        await channel.send(msgs[Math.floor(Math.random() * msgs.length)]);
    }

    async _replayLearnedPhrase(channel) {
        const learned = chatLearner.getLearnedPhrase();
        if (!learned) return this._sendTip(channel);
        const templates = [
            `"${learned.text}" — واحد من الشباب گالها هنا.`,
            `تتذكرون من گال: "${learned.text}"؟`,
            `من سوالفنا القديمة: "${learned.text}"`,
            `اقتباس من الشات: "${learned.text}" — ${learned.username}`,
            `${learned.username} گالها مرة: "${learned.text}"`,
        ];
        await channel.send(templates[Math.floor(Math.random() * templates.length)]);
    }

    async _reactToLastMessage(channel) {
        const fetched = await channel.messages.fetch({ limit: 3 });
        const lastHuman = fetched.find(m => !m.author.bot);
        if (!lastHuman) return;
        const emojis = ['😂', '🤣', '👀', '💀', '🔥', '🤔', '❤️', '👑', '💯', '✅', '😍', '🎉', '🙏', '💙', '⚡'];
        await lastHuman.react(emojis[Math.floor(Math.random() * emojis.length)]).catch(() => { });
    }

    async _sendJoke(channel) {
        const joke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
        await channel.send(`نكتة:\n${joke}`);
    }

    async _sendFact(channel) {
        const fact = this.facts[Math.floor(Math.random() * this.facts.length)];
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setDescription(`معلومة:\n${fact}`)
            .setFooter({ text: 'إذا عندكم معلومة ثانية شاركونا بيها.' });
        await channel.send({ embeds: [embed] });
    }

    async _sendTip(channel) {
        const tips = [
            'تگدرون تلعبون `تريفيا` وتجمعون فلوس.',
            'اكتب `يومي` حتى تاخذ مكافأتك.',
            'تگدر تفتح شركة بأمر `شركة` وتخلي ربعك يشتغلون وياك.',
            'اكتب `حجر_ورقة_مقص` والعب ويا أحد.',
            'تريد تتزوج؟ جرّب `زوج @شخص`.',
            'أمرك `إيداع` و`سحب` يدبّر فلوسك بالبنك.',
            'اكتب `ترتيب` وشوف مركزك.',
            'تابع الشات، مرات تطلع بيه هدايا.',
            'عندك كلان؟ افتح لوحة الكلان من أمر `كلان`.',
            'اكتب `رصيد` حتى تشوف فلوسك.',
            'كل ما تشارك بالشات تجمع خبرة.',
            'إذا تحتاج مساعدة، اكتب `مساعدة`.',
            'اكتب `عجلة` وجرب حظك.',
        ];
        await channel.send(tips[Math.floor(Math.random() * tips.length)]);
    }

    async startFastestClicker(channel) {
        const reward = Math.floor(Math.random() * 900) + 200;
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('هدية للأسرع')
            .setDescription(`أول واحد يضغط ياخذ **${reward.toLocaleString()}** ${config.currency}.\nعندكم 15 ثانية.`)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('fast_click_gift')
                .setLabel(`اضغط هسة (${reward.toLocaleString()})`)
                .setStyle(ButtonStyle.Success)
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.customId === 'fast_click_gift',
            time: 15000,
            max: 1
        });

        collector.on('collect', async i => {
            const userData = db.getUserData(i.user.id);
            userData.balance = (userData.balance || 0) + reward;
            db.updateUserData(i.user.id, userData);

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('فزت')
                    .setDescription(`عاشت إيدك <@${i.user.id}>، سبقتهم وربحت **${reward.toLocaleString()}** ${config.currency}.`)
                    .setTimestamp()],
                components: []
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                msg.edit({
                    embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('خلص الوقت، محد ضغط هالمرة.')],
                    components: []
                }).catch(() => { });
            }
        });
    }

    async getRandomChannel(guild) {
        const guildData = db.getGuildData(guild.id);
        
        // 1. Try to find the AI bot channel
        if (guildData.aiChannel) {
            const aiCh = guild.channels.cache.get(guildData.aiChannel);
            if (aiCh && aiCh.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])) {
                return aiCh;
            }
        }
        
        // 2. Try to find the General Chat channel by name
        const generalCh = guild.channels.cache.find(ch => ch.type === 0 && (ch.name.includes('الدردشة-العامة') || ch.name.includes('general')) && ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']));
        if (generalCh) return generalCh;
        
        // 3. Fallback to any channel that has AI or bot in name
        const fallbackCh = guild.channels.cache.find(ch => ch.type === 0 && ch.name.includes('بوت') && ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']));
        
        return fallbackCh || null;
    }
}

module.exports = new RandomInteractions();
