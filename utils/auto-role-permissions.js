'use strict';

const AUTO_ROLE_PERMISSION_OPTIONS = [
    { name: 'ViewChannel', label: 'عرض القنوات', group: 'text' },
    { name: 'SendMessages', label: 'إرسال الرسائل', group: 'text' },
    { name: 'ReadMessageHistory', label: 'قراءة سجل الرسائل', group: 'text' },
    { name: 'AddReactions', label: 'إضافة تفاعلات', group: 'text' },
    { name: 'EmbedLinks', label: 'إظهار معاينة الروابط', group: 'text' },
    { name: 'AttachFiles', label: 'إرفاق الملفات', group: 'text' },
    { name: 'UseExternalEmojis', label: 'استخدام الرموز الخارجية', group: 'text' },
    { name: 'UseExternalStickers', label: 'استخدام الملصقات الخارجية', group: 'text' },
    { name: 'SendMessagesInThreads', label: 'الكتابة في المواضيع', group: 'text' },
    { name: 'CreatePublicThreads', label: 'إنشاء مواضيع عامة', group: 'text' },
    { name: 'CreatePrivateThreads', label: 'إنشاء مواضيع خاصة', group: 'text' },
    { name: 'UseApplicationCommands', label: 'استخدام أوامر التطبيقات', group: 'interaction' },
    { name: 'SendPolls', label: 'إنشاء استطلاعات', group: 'interaction' },
    { name: 'Connect', label: 'دخول القنوات الصوتية', group: 'voice' },
    { name: 'Speak', label: 'التحدث صوتياً', group: 'voice' },
    { name: 'Stream', label: 'مشاركة الشاشة', group: 'voice' },
    { name: 'UseVAD', label: 'استخدام اكتشاف الصوت', group: 'voice' },
    { name: 'RequestToSpeak', label: 'طلب التحدث في المسرح', group: 'voice' },
    { name: 'UseEmbeddedActivities', label: 'استخدام الأنشطة الصوتية', group: 'voice' },
    { name: 'UseSoundboard', label: 'استخدام لوحة الأصوات', group: 'voice' },
    { name: 'UseExternalSounds', label: 'استخدام الأصوات الخارجية', group: 'voice' },
    { name: 'SendVoiceMessages', label: 'إرسال الرسائل الصوتية', group: 'voice' },
];

const AUTO_ROLE_PERMISSION_NAMES = new Set(AUTO_ROLE_PERMISSION_OPTIONS.map(permission => permission.name));

module.exports = { AUTO_ROLE_PERMISSION_OPTIONS, AUTO_ROLE_PERMISSION_NAMES };
