import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { Sidebar, StatCard, ToggleRow, ToastContainer, useToast, ChannelSelect, RefreshButton } from '../components/ui'
import IraqiResponsesSection from './IraqiResponsesSection'

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ info }) {
  if (!info) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">جاري تحميل...</div>
    </div>
  )
  const { guild, settings, botStatus } = info
  return (
    <div className="animate-fade-up">
      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <StatCard icon="👥" value={(guild.memberCount || 0).toLocaleString()} label="الأعضاء" color="green" />
        <StatCard icon="🚀" value={`المستوى ${guild.boostLevel || 0}`} label="مستوى تعزيز السيرفر" color="gold" />
        <StatCard icon="💎" value={guild.boostCount || 0} label="التعزيزات" color="cyan" />
        <StatCard icon="🛡️" value={botStatus.isAdmin ? 'صلاحيات إدارية ✅' : 'صلاحيات محدودة ⚠️'} label="صلاحيات البوت" color={botStatus.isAdmin ? 'green' : 'red'} />
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <div>
              <div className="card-title">معلومات السيرفر</div>
              <div className="card-subtitle">بيانات السيرفر الحالي</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
            {guild.icon
              ? <img src={guild.icon} alt="" style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid var(--accent)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }} />
              : <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: '3px solid var(--accent)' }}>🌐</div>
            }
            <div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{guild.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>معرّف السيرفر: {guild.id}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '📅', label: 'تاريخ إنشاء السيرفر', value: new Date(guild.createdAt).toLocaleDateString('ar-IQ') },
              { icon: '👑', label: 'صلاحيتك', value: 'مالك السيرفر' },
              { icon: '✅', label: 'صلاحيات البوت', value: botStatus.isAdmin ? 'إدارية' : 'محدودة' },
              { icon: '🔑', label: 'الوصول للأعضاء', value: 'مفعّل ✅' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{icon} {label}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">الإعدادات النشطة</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'قناة الألوان', value: settings.colorChannelName ? `#${settings.colorChannelName}` : 'مو محددة', active: !!settings.colorChannelName, icon: '🎨' },
              { label: 'قناة السجلات', value: settings.logChannelName ? `#${settings.logChannelName}` : 'مو محددة', active: !!settings.logChannelName, icon: '📋' },
              { label: 'البادئة', value: settings.prefix || '!', active: true, icon: '💬' },
              { label: 'الترحيب', value: settings.welcomeEnabled ? 'شغّال ✅' : 'مطفي', active: settings.welcomeEnabled, icon: '👋' },
            ].map(({ label, value, active, icon }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--card2)', borderRadius: 8, border: '1px solid var(--border2)' }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--text)' : 'var(--muted)' }}>{value}</div>
                </div>
                <span className={`badge ${active ? 'badge-green' : 'badge-red'}`}>{active ? 'شغّال' : 'مطفي'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Colors ───────────────────────────────────────────────────────────────────
function ColorsSection({ guildId, info, channels, toast, onRefresh }) {
  const [selectedChannel, setSelectedChannel] = useState(info?.settings?.colorChannelId || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!selectedChannel) return toast('اختار قناة أولاً.', 'error')
    setLoading(true)
    const res = await apiFetch(`/server/${guildId}/color-channel`, { method: 'POST', body: JSON.stringify({ channelId: selectedChannel }) })
    setLoading(false)
    if (res?.success) { toast(res.message || 'تعيّنت قناة الألوان ✅', 'success'); onRefresh() }
    else toast(res?.error || 'صار خلل.', 'error')
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🎨</span>
            <div>
              <div className="card-title">نظام ألوان البروفايل</div>
              <div className="card-subtitle">خلّي كل عضو يختار لون اسمه.</div>
            </div>
          </div>
          {info?.settings?.colorChannelName && (
            <div className="badge badge-green" style={{ marginBottom: 14, fontSize: 13 }}>✅ القناة الحالية: #{info.settings.colorChannelName}</div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18, lineHeight: 1.8 }}>
            اختار قناة نصية ينزل بيها البوت قائمة الألوان تلقائياً، والأعضاء يختارون لونهم بضغطة.
          </p>
          <ChannelSelect channels={channels} value={selectedChannel} onChange={setSelectedChannel} label="قناة الألوان" hint="⚠️ البوت يحتاج: View Channel, Send Messages, Embed Links, Manage Messages" />
          <button className="btn btn-primary" onClick={save} disabled={loading} style={{ width: '100%' }}>
            {loading ? '⏳ دا أرسل...' : '🎨 حفظ ودز قائمة الألوان'}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌈</span>
            <div className="card-title">الألوان المتاحة للأعضاء</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 10 }}>
            {[
              { hex: '#ef4444', name: 'أحمر', emoji: '🔴' },
              { hex: '#3b82f6', name: 'أزرق', emoji: '🔵' },
              { hex: '#22c55e', name: 'أخضر', emoji: '🟢' },
              { hex: '#f59e0b', name: 'ذهبي', emoji: '🟡' },
              { hex: '#a855f7', name: 'بنفسجي', emoji: '🟣' },
              { hex: '#ec4899', name: 'وردي', emoji: '🩷' },
              { hex: '#06b6d4', name: 'سماوي', emoji: '🩵' },
              { hex: '#f97316', name: 'برتقالي', emoji: '🟠' },
              { hex: '#111111', name: 'أسود', emoji: '⚫' },
              { hex: '#ffffff', name: 'أبيض', emoji: '⚪' },
            ].map(c => (
              <div key={c.hex} style={{ background: 'var(--card2)', border: `2px solid ${c.hex}33`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', borderTop: `3px solid ${c.hex}` }}>
                <div style={{ fontSize: 22 }}>{c.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 5, color: 'var(--text2)' }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
function LogsSection({ guildId, info, channels, toast, onRefresh }) {
  const [selectedChannel, setSelectedChannel] = useState(info?.settings?.logChannelId || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!selectedChannel) return toast('اختار قناة أولاً.', 'error')
    setLoading(true)
    const res = await apiFetch(`/server/${guildId}/log-channel`, { method: 'POST', body: JSON.stringify({ channelId: selectedChannel }) })
    setLoading(false)
    if (res?.success) { toast(res.message || 'تعيّنت قناة السجلات ✅', 'success'); onRefresh() }
    else toast(res?.error || 'صار خلل.', 'error')
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <div className="card-title">قناة السجلات</div>
          </div>
          {info?.settings?.logChannelName && (
            <div className="badge badge-green" style={{ marginBottom: 14 }}>✅ الحالية: #{info.settings.logChannelName}</div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18, lineHeight: 1.8 }}>
            توصل أحداث السيرفر لهالقناة. حتى نعرف من سوّى التغييرات الإدارية، يحتاج البوت صلاحية عرض سجل التدقيق.
          </p>
          {!info?.botStatus?.canViewAuditLog && (
            <div className="info-box warning" role="status" style={{ marginBottom: 16 }}>
              البوت ما عنده صلاحية <strong>View Audit Log</strong>؛ الأحداث الأساسية توصل، بس يمكن ما يبين من سوّى بعض التغييرات أو تفاصيلها.
            </div>
          )}
          <ChannelSelect channels={channels} value={selectedChannel} onChange={setSelectedChannel} label="قناة السجلات" hint="⚠️ البوت يحتاج: View Channel, Send Messages, Embed Links" />
          <button className="btn btn-primary" onClick={save} disabled={loading} style={{ width: '100%' }}>
            {loading ? '⏳ جاري الحفظ...' : '💾 حفظ قناة السجلات'}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">📝</span>
            <div className="card-title">شنو ينحفظ بالسجلات تلقائياً</div>
          </div>
          {[
            { icon: '🚪', label: 'انضمام ومغادرة الأعضاء' },
            { icon: '🔨', label: 'الطرد والحظر وإزالة الحظر' },
            { icon: '🗑️', label: 'حذف الرسائل والرسائل المجمعة' },
            { icon: '✏️', label: 'تعديل الرسائل' },
            { icon: '🏷️', label: 'تغييرات الرتب وأدوار الأعضاء' },
            { icon: '📁', label: 'إنشاء القنوات وتعديلها وحذفها' },
            { icon: '🔊', label: 'الانتقال بين القنوات الصوتية' },
            { icon: '🧾', label: 'الصلاحيات وWebhooks والمواضيع والفعاليات وAutoMod', requiresAuditLog: true },
            { icon: '⚙️', label: 'تغييرات إعدادات السيرفر', requiresAuditLog: true },
          ].map(lt => {
            const available = !lt.requiresAuditLog || info?.botStatus?.canViewAuditLog
            return (
            <div key={lt.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border2)', fontSize: 13 }}>
              <span style={{ fontSize: 18 }}>{lt.icon}</span>
              <span style={{ flex: 1, color: 'var(--text2)' }}>{lt.label}</span>
              <span className={`badge ${available ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                {available ? 'شغّال' : 'يحتاج صلاحية'}
              </span>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Protection ───────────────────────────────────────────────────────────────
function ProtectionSection({ guildId, toast }) {
  const [protection, setProtection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [restrictions, setRestrictions] = useState({})

  const loadProtection = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await apiFetch(`/server/${guildId}/protection`)
      if (data?.success) {
        setProtection(data.protection)
        setRestrictions(data.restrictions || {})
      }
      else setLoadError(data?.error || 'ما گدرت أحمّل إعدادات الحماية.')
    } catch (error) {
      setLoadError(error.message || 'ما گدرت أحمّل إعدادات الحماية.')
    } finally {
      setLoading(false)
    }
  }, [guildId])

  useEffect(() => { loadProtection() }, [loadProtection])

  const toggle = (key, field, value) => setProtection(p => ({ ...p, [key]: { ...p[key], [field]: value } }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`/server/${guildId}/protection`, { method: 'POST', body: JSON.stringify({ protection }) })
      if (res?.success) {
        toast('انحفظت إعدادات الحماية ✅', 'success')
        await loadProtection()
      } else {
        toast(res?.error || 'ما گدرت أحفظ إعدادات الحماية.', 'error')
      }
    } catch (error) {
      toast(error.message || 'ما گدرت أحفظ إعدادات الحماية.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!protection) {
    return (
      <div className="card" role="alert">
        <p>{loadError || 'ما گدرت أحمّل إعدادات الحماية.'}</p>
        <button className="btn btn-primary" onClick={loadProtection} type="button">جرّب مرة ثانية</button>
      </div>
    )
  }

  const protectionCards = [
    { key: 'antiSpam', icon: '🚫', name: 'مكافحة التكرار السريع', desc: 'حذف الرسائل المتقاربة وإيقاف العضو مؤقتاً.', fields: [{ key: 'threshold', label: 'الرسائل خلال 5 ثوانٍ', min: 3, max: 100 }, { key: 'duration', label: 'مدة الإيقاف بالدقائق', min: 1, max: 1440 }] },
    { key: 'antiRaid', icon: '⚔️', name: 'مكافحة دخول الريد', desc: 'طرد الحسابات عند تجاوز عدد الانضمامات في نافذة 10 ثوانٍ.', fields: [{ key: 'threshold', label: 'عدد الانضمامات', min: 2, max: 100 }] },
    { key: 'antiBadWords', icon: '🤬', name: 'فلترة الألفاظ المسيئة', desc: 'حذف الرسالة؛ ويُطبّق السجن إذا كان دوره مضبوطاً.' },
    { key: 'antiLink', icon: '🔗', name: 'مكافحة الروابط', desc: 'حذف الروابط المنشورة من غير الإداريين.' },
    { key: 'antiCaps', icon: '🔠', name: 'مكافحة الصراخ بالأحرف', desc: 'حذف الرسائل التي تتجاوز نسبة الأحرف الكبيرة.', fields: [{ key: 'threshold', label: 'الحد الأقصى للأحرف الكبيرة (%)', min: 50, max: 100 }] },
    { key: 'antiMentionSpam', icon: '📣', name: 'مكافحة إغراق المنشن', desc: 'حذف الرسالة وإيقاف العضو عند تجاوز الحد.', fields: [{ key: 'threshold', label: 'الحد الأدنى للمنشن', min: 2, max: 100 }] },
    { key: 'antiEmojiSpam', icon: '😵', name: 'مكافحة إغراق الإيموجي', desc: 'حذف الرسائل التي تتجاوز حد الإيموجي.', fields: [{ key: 'threshold', label: 'الحد الأدنى للإيموجي', min: 2, max: 100 }] },
    { key: 'antiDuplicate', icon: '🔁', name: 'مكافحة الرسائل المكررة', desc: 'حذف الرسائل المكررة وإيقاف العضو مؤقتاً.', fields: [{ key: 'threshold', label: 'عدد التكرارات خلال دقيقة', min: 2, max: 20 }] },
    { key: 'antiAccountAge', icon: '👶', name: 'فلتر الحسابات الحديثة', desc: 'طرد الحسابات الأصغر من العمر المحدد عند الانضمام.', fields: [{ key: 'minDays', label: 'أقل عمر للحساب بالأيام', min: 1, max: 365 }] },
  ]

  const isRestricted = key => key === 'antiAccountAge' && restrictions.antiAccountAge
  const enabledCount = protectionCards.filter(pc => protection[pc.key]?.enabled && !isRestricted(pc.key)).length

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge badge-green">{enabledCount} نظام مفعّل</span>
          <span className="badge">{protectionCards.length - enabledCount} معطّل</span>
        </div>
        <button className="btn btn-success" onClick={save} disabled={saving}>
          {saving ? '⏳ دا أحفظ...' : '💾 حفظ كل الإعدادات'}
        </button>
      </div>

      <div className="protection-grid">
        {protectionCards.map(pc => {
          const p = protection[pc.key] || {}
          const enabled = p.enabled || false
          const restricted = isRestricted(pc.key)
          const effectiveEnabled = enabled && !restricted
          return (
            <div key={pc.key} className={`protection-card ${effectiveEnabled ? 'enabled' : 'disabled'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{pc.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{pc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pc.desc}</div>
                  {restricted && <div role="status" style={{ fontSize: 11, color: 'var(--warning, #f0ad4e)', marginTop: 4 }}>مالك البوت موقفها من الإعدادات.</div>}
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={enabled} disabled={restricted} onChange={e => toggle(pc.key, 'enabled', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              {enabled && pc.fields?.map(field => (
                <label key={field.key} className="protection-setting">
                  <span>{field.label}</span>
                  <input
                    className="form-input"
                    type="number"
                    min={field.min}
                    max={field.max}
                    step="1"
                    value={p[field.key] ?? ''}
                    onChange={e => toggle(pc.key, field.key, e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Welcome Section لمالك السيرفر (مُضافة حديثاً) ──────────────────────────
function WelcomeSection({ guildId, channels, toast }) {
  const [ws, setWs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    apiFetch(`/server/${guildId}/welcome-settings`).then(d => {
      if (d?.success) {
        setWs({
          welcomeEnabled: d.welcomeEnabled,
          welcomeChannel: d.welcomeChannel || '',
          welcomeImage: d.welcomeImage || '',
          welcomeAvatarX: d.welcomeAvatarX || 960,
          welcomeAvatarY: d.welcomeAvatarY || 540,
          welcomeAvatarSize: d.welcomeAvatarSize || 256,
          welcomeAvatarRadius: d.welcomeAvatarRadius || 50,
          welcomeChannelName: d.welcomeChannelName,
          welcomeChannelValid: d.welcomeChannelValid,
        })
      }
      setLoading(false)
    })
  }, [guildId])

  const save = async () => {
    if (!ws.welcomeChannel) return toast('اختار قناة الترحيب أولاً.', 'error')
    setSaving(true)
    const res = await apiFetch(`/server/${guildId}/welcome-settings`, {
      method: 'POST',
      body: JSON.stringify({
        welcomeEnabled: ws.welcomeEnabled,
        welcomeChannel: ws.welcomeChannel,
        welcomeImage: ws.welcomeImage,
        welcomeAvatarX: ws.welcomeAvatarX,
        welcomeAvatarY: ws.welcomeAvatarY,
        welcomeAvatarSize: ws.welcomeAvatarSize,
        welcomeAvatarRadius: ws.welcomeAvatarRadius,
      })
    })
    setSaving(false)
    if (res?.success) toast('انحفظت إعدادات الترحيب ✅', 'success')
    else toast(res?.error || 'ما گدرت أحفظ الإعدادات.', 'error')
  }

  const testWelcome = async () => {
    if (!ws.welcomeChannel) return toast('اختار قناة الترحيب واحفظ الإعدادات أولاً.', 'error')
    setTesting(true)
    // حفظ أولاً
    await apiFetch(`/server/${guildId}/welcome-settings`, {
      method: 'POST',
      body: JSON.stringify({
        welcomeEnabled: ws.welcomeEnabled,
        welcomeChannel: ws.welcomeChannel,
        welcomeImage: ws.welcomeImage,
        welcomeAvatarX: ws.welcomeAvatarX,
        welcomeAvatarY: ws.welcomeAvatarY,
        welcomeAvatarSize: ws.welcomeAvatarSize,
        welcomeAvatarRadius: ws.welcomeAvatarRadius,
      })
    })
    const res = await apiFetch(`/server/${guildId}/test-welcome`, { method: 'POST' })
    setTesting(false)
    if (res?.success) toast(res.message || '✅ وصلت رسالة الترحيب التجريبية!', 'success')
    else toast(res?.error || 'صار خلل.', 'error')
  }

  if (loading || !ws) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>هذي إعدادات الترحيب بسيرفرك.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={testWelcome} disabled={testing || saving}>
            {testing ? '⏳...' : '🧪 تجربة'}
          </button>
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? '⏳ حفظ...' : '💾 حفظ وتطبيق'}
          </button>
        </div>
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">إعدادات الترحيب</div>
          </div>

          <ToggleRow
            label="👋 تفعيل رسائل الترحيب"
            description="دز رسالة من ينضم عضو جديد."
            checked={ws.welcomeEnabled}
            onChange={v => setWs({ ...ws, welcomeEnabled: v })}
          />

          <div className="form-group">
            <label className="form-label">💬 قناة الترحيب</label>
            <select
              className="form-select"
              value={ws.welcomeChannel || ''}
              onChange={e => setWs({ ...ws, welcomeChannel: e.target.value })}
            >
              <option value="">— اختار قناة —</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}{!ch.canSend ? ' ⚠️' : ''}</option>
              ))}
            </select>
            {ws.welcomeChannelValid && (
              <div className="form-hint" style={{ color: 'var(--green)' }}>✅ القناة الحالية: #{ws.welcomeChannelName}</div>
            )}
            {ws.welcomeChannel && !ws.welcomeChannelValid && (
              <div className="form-hint" style={{ color: 'var(--yellow)' }}>⚠️ تحقق من صلاحيات البوت في هذه القناة</div>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>🖼️ صورة الترحيب</label>
              {ws.welcomeImage && (
                  <button className="btn btn-sm btn-danger" onClick={() => setWs({ ...ws, welcomeImage: '', welcomeImageBase64: '', deleteWelcomeImage: true })}>🗑️ حذف الصورة نهائياً</button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label className="btn btn-primary" style={{ flex: 1, cursor: 'pointer', textAlign: 'center' }}>
                ☁️ اختار صورة من جهازك
                <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) return toast('حجم الصورة كبير جداً! (الحد الأقصى 5 ميجابايت)', 'error');
                  
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setWs({ ...ws, welcomeImage: ev.target.result, welcomeImageBase64: ev.target.result, deleteWelcomeImage: false });
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
            <div className="form-hint" style={{ color: 'var(--muted)', marginTop: 8 }}>أو حط رابط الصورة المباشر هنا:</div>
            <input
              type="text"
              className="form-input"
              style={{ marginTop: 5 }}
              placeholder="https://..."
              value={!ws.welcomeImage?.startsWith('data:') && !ws.welcomeImage?.startsWith('/uploads/') ? (ws.welcomeImage || '') : ''}
              onChange={e => setWs({ ...ws, welcomeImage: e.target.value, welcomeImageBase64: '', deleteWelcomeImage: false })}
            />
          </div>

          {[
            { key: 'welcomeAvatarX', label: 'موضع الصورة أفقياً (X)', min: 0, max: 1920 },
            { key: 'welcomeAvatarY', label: 'موضع الصورة عمودياً (Y)', min: 0, max: 1080 },
            { key: 'welcomeAvatarSize', label: 'حجم صورة الأفاتار', min: 50, max: 500 },
            { key: 'welcomeAvatarRadius', label: 'تدوير الزوايا %', min: 0, max: 50 },
          ].map(({ key, label, min, max }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}: <strong style={{ color: 'var(--accent2)' }}>{ws[key]}{key === 'welcomeAvatarRadius' ? '%' : 'px'}</strong></label>
              <input type="range" min={min} max={max} value={ws[key] || min} onChange={e => setWs({ ...ws, [key]: parseInt(e.target.value) })} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">👁️</span>
            <div className="card-title">معاينة الترحيب</div>
          </div>

          {/* Preview */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '16/9',
            backgroundColor: '#0d1117',
            backgroundImage: ws.welcomeImage ? `url("${ws.welcomeImage.trim()}")` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border)',
          }}>
            {ws.welcomeImage ? (
              <div style={{
                position: 'absolute',
                left: `${(ws.welcomeAvatarX / 1920) * 100}%`,
                top: `${(ws.welcomeAvatarY / 1080) * 100}%`,
                width: `${(ws.welcomeAvatarSize / 1920) * 100}%`,
                height: `${(ws.welcomeAvatarSize / 1080) * 100}%`,
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderRadius: `${ws.welcomeAvatarRadius}%`,
                border: '2px solid var(--accent)',
                transform: 'translate(-50%, -50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5vw', fontWeight: 'bold',
              }}>👤</div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 32 }}>🖼️</span>
                <span>ضع رابط صورة للمعاينة</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            * المواقع تُحسب بناءً على 1920×1080
          </div>

          <div className="info-box" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 معلومات:</div>
            <div>• رسالة الترحيب تُرسل عند انضمام أي عضو جديد</div>
            <div>• الصورة تظهر مع اسم العضو وعدد الأعضاء</div>
            <div>• اضغط "تجربة" للاختبار قبل التطبيق</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Automatic member role ───────────────────────────────────────────────────
function AutoRoleSection({ guildId, toast }) {
  const [loaded, setLoaded] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    apiFetch(`/server/${guildId}/auto-role`)
      .then(result => {
        if (!active) return
        if (!result?.success) {
          setLoaded({ guildId, error: result?.error || 'ما گدرت أحمّل إعدادات الرتبة التلقائية.' })
          return
        }
        setLoaded({ guildId, data: result })
      })
      .catch(error => {
        if (active) setLoaded({ guildId, error: error.message || 'ما گدرت أحمّل إعدادات الرتبة التلقائية.' })
      })
    return () => { active = false }
  }, [guildId, toast])

  const current = loaded?.guildId === guildId ? loaded : null
  const settings = current?.data
  const updateSettings = updates => {
    setLoaded(previous => previous?.guildId === guildId && previous.data
      ? { ...previous, data: { ...previous.data, ...updates } }
      : previous)
  }

  useEffect(() => {
    if (loaded?.guildId !== guildId || loaded.data?.backfill?.status !== 'running') return
    let active = true
    let timer
    const poll = async () => {
      try {
        const result = await apiFetch(`/server/${guildId}/auto-role`)
        if (!result?.success) {
          if (active) toast(result?.error || 'ما گدرت أحدّث حالة فحص الأعضاء.', 'error')
          return
        }
        if (!active) return
        setLoaded(previous => previous?.guildId === guildId && previous.data
          ? { ...previous, data: { ...previous.data, backfill: result.backfill } }
          : previous)
        timer = setTimeout(poll, 3000)
      } catch (error) {
        if (active) toast(error.message || 'ما گدرت أحدّث حالة فحص الأعضاء.', 'error')
      }
    }
    timer = setTimeout(poll, 3000)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [guildId, loaded?.guildId, loaded?.data?.backfill?.status, toast])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const payload = settings.enabled
        ? { enabled: true, roleName: settings.roleName, permissions: settings.permissions }
        : { enabled: false }
      const result = await apiFetch(`/server/${guildId}/auto-role`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!result?.success) {
        toast(result?.error || 'ما گدرت أحفظ إعدادات الرتبة التلقائية.', 'error')
        return
      }
      if (settings.enabled) {
        updateSettings({
          roleId: result.roleId,
          roleName: result.roleName,
          roleExists: true,
          roleCanBeManaged: true,
          permissions: result.permissions,
          backfill: result.backfill || settings.backfill,
        })
      } else {
        updateSettings({ enabled: false, backfill: result.backfill || settings.backfill })
      }
      toast(result.message || 'انحفظت الإعدادات ✅', 'success')
    } catch (error) {
      toast(error.message || 'ما گدرت أحفظ إعدادات الرتبة التلقائية.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const rerunBackfill = async () => {
    setSaving(true)
    try {
      const result = await apiFetch(`/server/${guildId}/auto-role/backfill`, { method: 'POST' })
      if (!result?.success) {
        toast(result?.error || 'ما گدرت أبدي فحص الأعضاء.', 'error')
        return
      }
      updateSettings({ backfill: result.backfill })
      toast(result.message || 'بديت أفحص أعضاء السيرفر.', 'success')
    } catch (error) {
      toast(error.message || 'ما گدرت أبدي فحص الأعضاء.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!current) return <div className="loading-screen"><div className="spinner" /></div>
  if (!settings) {
    return (
      <div className="card">
        <div className="info-box warning">{current.error}</div>
      </div>
    )
  }

  const groups = [
    { id: 'text', label: '💬 صلاحيات القنوات النصية' },
    { id: 'voice', label: '🔊 صلاحيات القنوات الصوتية' },
    { id: 'interaction', label: '⚡ صلاحيات التفاعل' },
  ]
  const canSave = !settings.enabled ||
    (settings.canManageRoles && (!settings.roleExists || settings.roleCanBeManaged))
  const backfill = settings.backfill || {}
  const backfillStatusLabels = {
    not_started: 'لم يبدأ الفحص',
    running: 'جارٍ فحص الأعضاء وإسناد الرتبة',
    completed: 'اكتمل فحص الأعضاء',
    partial: 'خلص الفحص، بس ما گدرت أنطي الرتبة لبعض الأعضاء.',
    failed: 'ما گدرت أكمل فحص الأعضاء.',
    stopped: 'انوقف فحص الأعضاء.',
  }
  const backfillPercent = backfill.total
    ? Math.min(100, Math.floor((backfill.processed / backfill.total) * 100))
    : backfill.status === 'completed' ? 100 : 0

  return (
    <div className="animate-fade-up">
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🎟️</span>
          <div>
            <div className="card-title">الرتبة التلقائية للأعضاء الجدد</div>
            <div className="card-subtitle">سوّي رتبة خاصة ووزعها على الأعضاء الحاليين والجدد.</div>
          </div>
        </div>

        <ToggleRow
          label="تفعيل توزيع الرتبة التلقائي"
          description="تنطي الرتبة للحسابات اللي يگدر البوت يديرها."
          checked={Boolean(settings.enabled)}
          onChange={enabled => updateSettings({ enabled })}
        />

        {settings.enabled && (
          <>
            {!settings.canManageRoles && (
              <div className="info-box warning" style={{ marginBottom: 12 }}>
                انطي البوت صلاحية Manage Roles حتى يگدر يسوي الرتبة ويديرها.
              </div>
            )}
            {settings.roleExists && !settings.roleCanBeManaged && (
              <div className="info-box warning" style={{ marginBottom: 12 }}>
                رتبة البوت لازم تكون أعلى من الرتبة التلقائية. ارفعها بإعدادات السيرفر وبعدين احفظ من جديد.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">🏷️ اسم الرتبة</label>
              <input
                className="form-input"
                maxLength={100}
                value={settings.roleName || ''}
                onChange={event => updateSettings({ roleName: event.target.value })}
                placeholder="عضو جديد"
                disabled={!settings.canManageRoles || (settings.roleExists && !settings.roleCanBeManaged)}
              />
              {settings.roleId && (
                <div className="form-hint">ID الرتبة: <code>{settings.roleId}</code></div>
              )}
            </div>

            <div className="card-header" style={{ padding: '12px 0 8px' }}>
              <div>
                <div className="card-title">صلاحيات الرتبة</div>
                <div className="card-subtitle">اختار بس الصلاحيات اللي يحتاجها العضو.</div>
              </div>
            </div>
            {groups.map(group => {
              const options = (settings.permissionOptions || []).filter(option => option.group === group.id)
              if (!options.length) return null
              return (
                <div key={group.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{group.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
                    {options.map(option => (
                      <label key={option.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card2)', cursor: settings.canManageRoles ? 'pointer' : 'not-allowed', opacity: settings.canManageRoles ? 1 : 0.6 }}>
                        <input
                          type="checkbox"
                          checked={(settings.permissions || []).includes(option.name)}
                          disabled={!settings.canManageRoles || (settings.roleExists && !settings.roleCanBeManaged)}
                          onChange={event => updateSettings({
                            permissions: event.target.checked
                              ? [...new Set([...(settings.permissions || []), option.name])]
                              : (settings.permissions || []).filter(name => name !== option.name),
                          })}
                        />
                        <span style={{ fontSize: 12 }}>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        <div className="info-box warning" style={{ marginTop: 12 }}>
          القائمة ما بيها صلاحية Administrator ولا صلاحيات الإشراف. إذا تغيّرت صلاحيات هالرتبة، تتغيّر هم على الأعضاء اللي لابسيها حالياً.
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving || !canSave} style={{ width: '100%', marginTop: 12 }}>
          {saving ? '⏳ دا أحفظ...' : settings.enabled ? (settings.roleExists ? '💾 حفظ الرتبة والصلاحيات' : '➕ إنشاء الرتبة وحفظها') : '⏸️ إيقاف التوزيع التلقائي'}
        </button>

        <div style={{ marginTop: 20, padding: 14, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>📦 توزيع الرتبة على الأعضاء الحاليين</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                يبدي التوزيع من أول حفظ. تگدر تعيد الفحص للأعضاء اللي ما انطتهم الرتبة.
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                نتجاوز العضو اللي عنده الرتبة من قبل أو رتبته أعلى من رتبة البوت.
              </div>
            </div>
            <span className={`badge ${backfill.status === 'completed' ? 'badge-green' : backfill.status === 'running' ? 'badge-blue' : backfill.status === 'partial' || backfill.status === 'failed' ? 'badge-yellow' : 'badge-purple'}`}>
              {backfillStatusLabels[backfill.status] || 'ما نعرف حالة الفحص.'}
            </span>
          </div>
          <div style={{ marginTop: 12, height: 8, overflow: 'hidden', borderRadius: 99, background: 'var(--bg)' }} role="progressbar" aria-valuenow={backfillPercent} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${backfillPercent}%`, height: '100%', background: backfill.status === 'partial' || backfill.status === 'failed' ? 'var(--yellow)' : 'var(--accent)', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text2)', marginTop: 9 }}>
            <span>انفحص: {backfill.processed || 0} / {backfill.total || 0}</span>
            <span>انطت الرتبة: {backfill.assigned || 0}</span>
            <span>تجاوزنا: {backfill.skipped || 0}</span>
            <span>ما ضبطت: {backfill.failed || 0}</span>
          </div>
          {backfill.error && <div className="info-box warning" style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{backfill.error}</div>}
          <button
            className="btn btn-ghost btn-sm"
            onClick={rerunBackfill}
            disabled={saving || !settings.enabled || !settings.roleExists || !settings.canManageRoles || !settings.roleCanBeManaged || backfill.status === 'running'}
            style={{ marginTop: 12 }}
          >
            {backfill.status === 'running' ? '⏳ دا نفحص...' : '🔄 افحص الأعضاء الحاليين من جديد'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Roles ────────────────────────────────────────────────────────────────────
function RolesSection({ guildId, toast }) {
  const [roles, setRoles] = useState([])
  const [rolesGuildId, setRolesGuildId] = useState('')
  const [canManageRoles, setCanManageRoles] = useState(false)
  const [userId, setUserId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [action, setAction] = useState('add')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    apiFetch(`/server/${guildId}/roles`)
      .then(d => {
        if (!active) return
        if (d?.success) {
          setRoles(d.roles || [])
          setCanManageRoles(Boolean(d.canManageRoles))
          setRoleId(d.roles?.find(role => role.canManage)?.id || '')
        } else {
          toast(d?.error || 'ما گدرت أحمّل الأدوار.', 'error')
          setRoles([])
          setCanManageRoles(false)
          setRoleId('')
        }
        setRolesGuildId(guildId)
      })
      .catch(error => {
        if (!active) return
        toast(error.message || 'ما گدرت أحمّل الأدوار.', 'error')
        setRoles([])
        setCanManageRoles(false)
        setRoleId('')
        setRolesGuildId(guildId)
      })
    return () => { active = false }
  }, [guildId, toast])

  const manageRole = async event => {
    event.preventDefault()
    if (!/^\d{17,20}$/.test(userId.trim())) return toast('اكتب معرّف Discord صحيح للعضو.', 'error')
    if (!roleId) return toast('اختار دور يگدر البوت يديره.', 'error')

    setSubmitting(true)
    try {
      const result = await apiFetch(`/server/${guildId}/roles/manage`, {
        method: 'POST',
        body: JSON.stringify({ userId: userId.trim(), roleId, action }),
      })
      if (result?.success) {
        toast(result.message || 'تحدّث الدور ✅', 'success')
        setUserId('')
      } else {
        toast(result?.error || 'ما گدرت أحدّث الدور.', 'error')
      }
    } catch (error) {
      toast(error.message || 'ما گدرت أحدّث الدور.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (rolesGuildId !== guildId) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="animate-fade-up">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-icon">🎭</span>
          <div>
            <div className="card-title">إدارة أدوار الأعضاء</div>
            <div className="card-subtitle">ضيف دور لعضو أو شيله باستخدام معرّف Discord.</div>
          </div>
        </div>
        {!canManageRoles && (
          <div className="info-box warning" style={{ marginBottom: 12 }}>
            البوت يحتاج صلاحية Manage Roles، ولازم رتبته تكون أعلى من الدور اللي تريد تعدّله.
          </div>
        )}
        <form onSubmit={manageRole} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label className="form-label">🆔 معرّف Discord للعضو</label>
            <input className="form-input" inputMode="numeric" placeholder="123456789012345678" value={userId} onChange={event => setUserId(event.target.value)} required />
          </div>
          <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label className="form-label">🏷️ الدور</label>
            <select className="form-select" value={roleId} onChange={event => setRoleId(event.target.value)} required disabled={!canManageRoles}>
              <option value="">— اختار دور —</option>
              {roles.filter(role => role.canManage).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px', marginBottom: 0 }}>
            <label className="form-label">⚡ الإجراء</label>
            <select className="form-select" value={action} onChange={event => setAction(event.target.value)}>
              <option value="add">إضافة الدور</option>
              <option value="remove">إزالة الدور</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!canManageRoles || submitting} style={{ minHeight: 40 }}>
            {submitting ? '⏳ دا أنفّذ...' : 'نفّذ'}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الرتبة</th>
              <th>الأعضاء</th>
              <th>اللون</th>
              <th>قابل للإشارة</th>
              <th>مُدار</th>
              <th>إمكانية التعديل</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color === '#000000' ? '#333' : r.color, border: '1px solid var(--border)' }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>
                  </div>
                </td>
                <td><span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{r.memberCount}</span></td>
                <td><code>{r.color}</code></td>
                <td>{r.mentionable ? <span className="badge badge-green">نعم</span> : <span className="badge badge-red">لا</span>}</td>
                <td>{r.managed ? <span className="badge badge-yellow">بوت</span> : '—'}</td>
                <td>{r.canManage ? <span className="badge badge-green">نعم</span> : <span className="badge badge-yellow">مقيّد</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderboardSection({ guildId }) {
  const [lb, setLb] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/server/${guildId}/members/leaderboard`).then(d => { if (d?.success) setLb(d.leaderboard); setLoading(false) })
  }, [guildId])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="animate-fade-up table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>العضو</th>
            <th>المحفظة</th>
            <th>البنك</th>
            <th>المستوى</th>
          </tr>
        </thead>
        <tbody>
          {lb.map((m, i) => (
            <tr key={m.id}>
              <td>
                <span style={{ fontWeight: 900, fontSize: 16, color: i === 0 ? 'var(--gold)' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : 'var(--muted)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={m.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} onError={e => e.target.style.display = 'none'} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.displayName}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>@{m.username}</div>
                  </div>
                </div>
              </td>
              <td><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{(m.balance || 0).toLocaleString()} 💰</span></td>
              <td><span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{(m.bank || 0).toLocaleString()}</span></td>
              <td><span className="badge badge-purple">المستوى {m.level || 0}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Server Owner Dashboard ──────────────────────────────────────────────
export default function ServerOwnerDashboard() {
  const { guildId } = useParams()
  const { user, guilds, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [info, setInfo] = useState(null)
  const [channels, setChannels] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loadError, setLoadError] = useState('')
  const { toasts, toast } = useToast()

  const selectedGuild = guilds.find(g => g.id === guildId)

  const loadInfo = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [iRes, cRes] = await Promise.all([
        apiFetch(`/server/${guildId}/info`),
        apiFetch(`/server/${guildId}/channels`),
      ])
      if (!iRes?.success) throw new Error(iRes?.error || 'ما گدرت أحمّل معلومات السيرفر.')
      if (!cRes?.success) throw new Error(cRes?.error || 'ما گدرت أحمّل قنوات السيرفر.')
      setInfo(iRes)
      setChannels(cRes.channels || [])
      setLastUpdated(new Date())
      setLoadError('')
    } catch (error) {
      setLoadError(error.message || 'ما گدرت أحدّث بيانات السيرفر.')
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [guildId])

  useEffect(() => {
    loadInfo()
    const interval = setInterval(() => loadInfo(true), 60000)
    return () => clearInterval(interval)
  }, [loadInfo])

  const titles = {
    overview:   '📊 نظرة عامة',
    colors:     '🎨 نظام الألوان',
    logs:       '📋 قناة السجلات',
    welcome:    '👋 إعدادات الترحيب',
    protection: '🛡️ الحماية',
    'iraqi-responses': '💬 الردود العراقية',
    'auto-role': '🎟️ الرتبة التلقائية',
    roles:      '🏷️ الأدوار',
    leaderboard:'🏆 المتصدرون',
  }

  const sections = {
    overview:    <Overview info={info} />,
    colors:      <ColorsSection guildId={guildId} info={info} channels={channels} toast={toast} onRefresh={loadInfo} />,
    logs:        <LogsSection guildId={guildId} info={info} channels={channels} toast={toast} onRefresh={loadInfo} />,
    welcome:     <WelcomeSection guildId={guildId} channels={channels} toast={toast} />,
    protection:  <ProtectionSection guildId={guildId} toast={toast} />,
    'iraqi-responses': <IraqiResponsesSection guildId={guildId} toast={toast} />,
    'auto-role': <AutoRoleSection guildId={guildId} toast={toast} />,
    roles:       <RolesSection guildId={guildId} toast={toast} />,
    leaderboard: <LeaderboardSection guildId={guildId} />,
  }

  return (
    <div className="page-layout">
      <Sidebar activeSection={section} onSection={setSection} role="server_owner" user={user} onLogout={logout} selectedGuild={selectedGuild} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{titles[section] || 'السيرفر'}</h1>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {selectedGuild?.icon && <img src={selectedGuild.icon} alt="" style={{ width: 16, height: 16, borderRadius: '50%', marginLeft: 6, verticalAlign: 'middle' }} />}
              🌐 {selectedGuild?.name || guildId}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <RefreshButton busy={refreshing} lastUpdated={lastUpdated} onClick={() => loadInfo()} />
            <span className={`page-badge ${user?.role === 'bot_owner' ? 'gold' : 'cyan'}`}>
              {user?.role === 'bot_owner' ? '👑 مالك البوت · إدارة السيرفر' : '🔑 مالك السيرفر'}
            </span>
            {user?.role === 'bot_owner' ? (
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/bot-owner')} type="button">
                👑 إدارة البوت
              </button>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/guilds')} type="button">
                ← العودة للسيرفرات
              </button>
            )}
          </div>
        </div>
        {loadError && (
          <div className="dashboard-load-error" role="alert">
            <span>⚠️ {loadError}</span>
            <button className="btn btn-outline btn-sm" onClick={() => loadInfo()} type="button">جرّب مرة ثانية</button>
          </div>
        )}
        {sections[section] || null}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
