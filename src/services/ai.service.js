'use strict';
const appLogger = require('../../utils/app-logger');

const axios = require('axios');
const config = require('../../config');
const aiBrain = require('../../utils/ai-brain');
const dailyChallenges = require('../../utils/daily-challenges');

// AI context cache
const _aiCtx = new Map();
// تنظيف كل 10 دقائق (بدلاً من clear الكامل — نُبقي المحادثات الحديثة فقط)
setInterval(() => {
    const KEEP_MS = 10 * 60 * 1000;
    const now = Date.now();
    for (const [chId, arr] of _aiCtx) {
        if (!arr.length || (now - (arr._lastAt || 0)) > KEEP_MS) {
            _aiCtx.delete(chId);
        }
    }
}, 10 * 60 * 1000).unref?.();

function addContext(channelId, role, text) {
    if (!_aiCtx.has(channelId)) _aiCtx.set(channelId, []);
    const arr = _aiCtx.get(channelId);
    arr.push({ role, text: text.substring(0, 200) });
    arr._lastAt = Date.now(); // طابع زمني للتنظيف الذكي
    if (arr.length > 10) arr.shift();
}

// Rate Limit
const _aiUserCooldown = new Map();
const AI_USER_CD = 8_000; // 8 ثوانٍ بين كل رد

// تنظيف دوري كل 5 دقائق
setInterval(() => {
    const now = Date.now();
    for (const [uid, ts] of _aiUserCooldown) {
        if (now - ts > AI_USER_CD * 10) _aiUserCooldown.delete(uid);
    }
}, 5 * 60 * 1000).unref?.();

function checkAIRateLimit(userId) {
    const now = Date.now();
    const lastCall = _aiUserCooldown.get(userId);
    if (lastCall && (now - lastCall < AI_USER_CD)) {
        return { allowed: false, waitSeconds: Math.ceil((AI_USER_CD - (now - lastCall)) / 1000) };
    }
    return { allowed: true };
}

// الرد الذكي (NVIDIA أولاً OpenRouter كـ fallback تلقائي)
async function handleAIReply(message, isRandomDrop = false) {
    const rateCheck = checkAIRateLimit(message.author.id);
    if (!rateCheck.allowed && !isRandomDrop) {
        return message.reply(`⏳ انتظر ${rateCheck.waitSeconds} ثانية...`)
            .then(m => setTimeout(() => m.delete().catch(() => { }), 3000));
    }

    const userText = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!userText && !isRandomDrop) {
        const quickReplies = [
            'منشنتني وما سألتني شي؟',
            'هلا، شكو ماكو؟',
            'تعال سولف وياي، آني موجود.',
        ];
        return message.reply(quickReplies[Math.floor(Math.random() * quickReplies.length)]);
    }

    if (!isRandomDrop) {
        await dailyChallenges.updateProgress(message.author.id, 'ai_chat', 1, message).catch(() => { });
    }

    const nvidiaToken = config.nvidiaApiKey;
    const openrouterToken = config.openrouterApiKey;

    // إذا لا يوجد أي مفتاح — خطأ
    if (!nvidiaToken && !openrouterToken) {
        if (!isRandomDrop) return message.reply('ماكو مفتاح AI مفعّل. ضيف NVIDIA_API_KEY أو OPENROUTER_API_KEY بملف .env.');
        return;
    }

    const ctx = _aiCtx.get(message.channel.id) || [];

    let basePrompt = `أنت "${message.client.user.username}"، شخصيتك عفوية وودودة وتحچي باللهجة العراقية البغدادية حصراً.
اكتب مثل شخص عراقي يحچي يومياً، مو مثل نص رسمي أو مترجم. استخدم مفردات عراقية بمكانها مثل: شلون، شكو ماكو، هسة، خوش، يمعود، عيني، لعد، شبيك، ماكو، شنو، گلت، آني.
ابتعد عن الفصحى واللهجات غير العراقية، ولا تكرر المفردات العراقية بشكل مصطنع. لا تستخدم كلمات مثل "شو"، "الحين"، "إيش" أو "أهلاً وسهلاً".
خلك ساخر بخفة، وممكن تطقطق أحياناً بكلمة مثل "يا عبقري" أو "يا بطل" إذا الموقف يسمح. لا تستخدم سب جارح، ولا تسخر من شكل المستخدم أو هويته أو ظرفه. إذا الموضوع جدي جاوب باحترام. لا تدّعي إنك إنسان؛ إذا انسألت عن هويتك جاوب ببساطة إنك بوت ديسكورد.
أنت تتحدث حالياً مع المستخدم: ${message.author.username}.
`;

    if (isRandomDrop) {
        basePrompt += `\nهذا رد عفوي بالدردشة. علّق على آخر موضوع أو شاركهم الحديث. خلي ردك قصير وطبيعي، جملة أو جملتين.`;
    }

    if (ctx.length > 0) {
        basePrompt += `\n\nسياق المحادثة الأخيرة في هذا الروم (لفهم الموضوع):\n${ctx.map(e => `${e.role}: ${e.text}`).join('\n')}`;
    }

    if (!isRandomDrop) {
        _aiUserCooldown.set(message.author.id, Date.now());
    }

    await message.channel.sendTyping().catch(() => {});
    const typingInterval = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
    }, 8000);

    const userContent = isRandomDrop ? (userText || 'حيّيهم أو علّق على الدردشة بجملة عراقية قصيرة') : userText;

    // محاولة NVIDIA أولاً (إذا متاح)
    if (nvidiaToken) {
        try {
            const response = await axios.post(
                'https://integrate.api.nvidia.com/v1/chat/completions',
                {
                    model: 'meta/llama-3.1-70b-instruct',
                    messages: [
                        { role: 'system', content: basePrompt },
                        { role: 'user', content: userContent }
                    ],
                    max_tokens: 350,
                    temperature: 0.85,
                    top_p: 0.95,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${nvidiaToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                }
            );

            clearInterval(typingInterval);
            const answer = response.data?.choices?.[0]?.message?.content?.trim() || '';

            if (answer) {
                addContext(message.channel.id, 'user', userText || '(دردشة عشوائية)');
                addContext(message.channel.id, 'bot', answer);
                return isRandomDrop ? message.channel.send(answer) : message.reply(answer);
            }

        } catch (nvidiaErr) {
            appLogger.warn('[NVIDIAOpenRouter] NVIDIA فشل، جاري التحويل لـ OpenRouter...',
                nvidiaErr.response?.status || nvidiaErr.message);
        }
    }

    // OpenRouter كـ fallback (أو primary إذا لا يوجد NVIDIA)
    if (openrouterToken) {
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'meta-llama/llama-3.3-70b-instruct',
                    messages: [
                        { role: 'system', content: basePrompt },
                        { role: 'user', content: userContent }
                    ],
                    max_tokens: 350,
                    temperature: 0.85,
                    top_p: 0.95,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${openrouterToken}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com',
                        'X-Title': message.client.user.username || 'Discord Bot',
                    },
                    timeout: 20000,
                }
            );

            clearInterval(typingInterval);
            const answer = response.data?.choices?.[0]?.message?.content?.trim() || '';

            if (answer) {
                addContext(message.channel.id, 'user', userText || '(دردشة عشوائية)');
                addContext(message.channel.id, 'bot', answer);
                appLogger.info('[OpenRouter] رد ناجح عبر OpenRouter');
                return isRandomDrop ? message.channel.send(answer) : message.reply(answer);
            }

        } catch (orErr) {
            clearInterval(typingInterval);
            appLogger.error('[OpenRouter Error]', orErr.response?.data || orErr.message);
        }
    }

    // فشل الكل — رد محلي ذكي
    clearInterval(typingInterval);
    if (!isRandomDrop) {
        const localReply = aiBrain.buildLocalReply(userText, message.author.id);
        const fallbackReplies = [
            'يمعود تأخرت عليك، جرّب تسألني بعد شوي.',
            'يبدو الاتصال تعبان، جرّب بعد لحظة.',
            'صار خلل بالاتصال، عود جرّب بعد شوي.',
        ];
        return message.reply(localReply || fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)]);
    }
}

module.exports = {
    handleAIReply,
    addContext,
    recordUserMessage: aiBrain.recordUserMessage
};
