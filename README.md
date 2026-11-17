# بوت Discord

بوت Discord مبني بـ Node.js وdiscord.js، مع قاعدة MongoDB ولوحة تحكم React وخادم ألعاب مبني على Express وSocket.IO.

## المتطلبات

- Node.js 24.
- قاعدة MongoDB.
- تطبيق بوت من [Discord Developer Portal](https://discord.com/developers/applications).

## التشغيل المحلي

1. ثبّت الحزم:

   ```bash
   npm ci
   ```

   يبني `postinstall` لوحة التحكم تلقائياً. بعد تعديل الواجهة، أعد بناءها باستخدام `npm run build:dashboard`.

2. انسخ `.env.example` إلى `.env` واضبط القيم المطلوبة، ومنها `DISCORD_TOKEN` و`OWNER_ID` و`MONGODB_URI` و`JWT_SECRET` و`DASHBOARD_KEY`. لا ترفع ملف `.env` أو مفاتيحه إلى المستودع.
3. فعّل Discord intents التي يحتاجها البوت من Developer Portal، ثم شغّله:

   ```bash
   npm start
   ```

للتطوير استخدم `npm run dev`. لتشغيل الاختبارات استخدم `npm test`، ولفحص الواجهة `npm run lint:dashboard`.

## لوحة التحكم والألعاب

تعمل لوحة التحكم والألعاب من خادم البوت نفسه. مسار `/health` لفحص الخدمة، ومسار `/games/` لملفات الألعاب. تحتاج بعض ميزات السيرفر إلى تفعيل Message Content وServer Members intents في إعدادات تطبيق Discord.

## النشر على Render

ملف `render.yaml` يعرّف إعداد الخدمة. أنشئ Blueprint من المستودع، ثم أضف القيم السرية المطلوبة إلى Environment في Render. يلزم استخدام خدمة تعمل باستمرار لتلقي أحداث Discord؛ خدمة الخطة المجانية قد تدخل وضع السكون. بيانات MongoDB دائمة، أما الغرف الجماعية النشطة والملفات المحلية فتُفقد عند إعادة تشغيل الخدمة.

لـ Discord OAuth2 أضف `DISCORD_CLIENT_ID` و`DISCORD_CLIENT_SECRET` و`DISCORD_REDIRECT_URI`، واضبط عنوان الرجوع نفسه في إعدادات تطبيق Discord. هذه القيم مطلوبة لتسجيل دخول مالكي السيرفرات، وليست مطلوبة لتشغيل البوت الأساسي.
