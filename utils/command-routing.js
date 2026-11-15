'use strict';

const BASIC_SETUP_TRIGGERS = [
    'تفعيل', 'تفعيل رتب', 'تفعيل-رتب',
    'اعداد', 'اعداد الرتب', 'اعداد-الرتب',
    'setup',
];
const SERVER_SETUP_TRIGGERS = [
    'تفعيل سيرفر', 'تفعيل-سيرفر', 'اعداد سيرفر',
    'setup-server', 'بناء-سيرفر',
];
const RESET_TRIGGERS = [
    'اعادة تفعيل', 'إعادة تفعيل',
    'اعادةتفعيل', 'إعادةتفعيل',
    'اعادة-تفعيل', 'إعادة-تفعيل',
    'reset-server', 'reset',
];

function matchesTrigger(message, trigger) {
    return message === trigger || message.startsWith(`${trigger} `);
}

function resolveSetupAction(content, prefix) {
    const trimmed = content.trim();
    const commandText = prefix && trimmed.startsWith(prefix)
        ? trimmed.slice(prefix.length).trim()
        : trimmed;
    const normalized = commandText.toLowerCase();

    if (RESET_TRIGGERS.some(trigger => matchesTrigger(normalized, trigger))) {
        return 'reset-server';
    }
    if (SERVER_SETUP_TRIGGERS.some(trigger => matchesTrigger(normalized, trigger))) {
        return 'server';
    }
    if (BASIC_SETUP_TRIGGERS.includes(normalized)) {
        return 'roles';
    }
    return null;
}

module.exports = { resolveSetupAction };
