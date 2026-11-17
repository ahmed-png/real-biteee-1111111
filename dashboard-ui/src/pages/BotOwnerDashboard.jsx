import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { Sidebar, StatCard, ToggleRow, ToastContainer, useToast, RefreshButton } from '../components/ui'

const EMPTY_SETTINGS = Object.freeze({})

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ stats }) {
  if (!stats) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">دا أحمّل البيانات...</div>
    </div>
  )

  const up = stats.uptime || 0
  const upH = Math.floor(up / 3600)
  const upM = Math.floor((up % 3600) / 60)

  return (
    <div className="animate-fade-up">
      {/* Stat Cards */}
      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <StatCard icon="🌐" value={stats.discordGuilds} label="السيرفرات" color="green" />
        <StatCard icon="👥" value={(stats.discordUsers || 0).toLocaleString()} label="المستخدمون" color="purple" />
        <StatCard icon="⚡" value={`${stats.ping || 0}ms`} label="سرعة الاستجابة" color="cyan" />
        <StatCard icon="⏱️" value={`${upH}س ${upM}د`} label="مدة التشغيل" color="gold" />
        <StatCard icon="💾" value={`${stats.heapMB || 0} MB`} label="الذاكرة" />
        <StatCard icon="⚙️" value={stats.totalCmds || 0} label="الأوامر" />
      </div>

      <div className="cards-grid-2">
        {/* Bot Info */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🤖</span>
            <div>
              <div className="card-title">معلومات البوت</div>
              <div className="card-subtitle">حالة البوت ومعلوماته التقنية.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            {stats.botAvatar && (
              <div style={{ position: 'relative' }}>
                <img src={stats.botAvatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--accent)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }} />
                <span className="status-dot online" style={{ position: 'absolute', bottom: 2, right: 2 }} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{stats.botTag || 'Bot#0000'}</div>
              <div className="badge badge-green" style={{ marginTop: 6 }}>
                <span className="status-dot online" /> متصل
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🖥️', label: 'Node.js', value: stats.nodeVersion },
              { icon: '💽', label: 'نظام التشغيل', value: stats.platform },
              { icon: '📦', label: 'الذاكرة المستخدمة', value: `${stats.heapMB} MB` },
              { icon: '🔧', label: 'إجمالي الذاكرة', value: `${stats.rssMB} MB` },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{icon} {label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Guilds */}
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🌐</span>
            <div>
              <div className="card-title">أحدث السيرفرات</div>
              <div className="card-subtitle">آخر 5 سيرفرات</div>
            </div>
          </div>
          {(stats.guilds || []).slice(0, 5).map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border2)' }}>
              {g.icon
                ? <img src={g.icon} alt="" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)' }} />
                : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌐</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>👥 {(g.memberCount || 0).toLocaleString()} عضو</div>
              </div>
              <div style={{ fontSize: 11, background: 'var(--card2)', padding: '3px 8px', borderRadius: 99, color: 'var(--muted)' }}>#{g.id.slice(-4)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Activity Bar */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-icon">📊</span>
          <div>
            <div className="card-title">نشاط البوت هسه</div>
            <div className="card-subtitle">مؤشرات الأداء المباشرة.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { label: 'استخدام الذاكرة', value: Math.min(100, ((stats.heapMB || 0) / 512) * 100), color: '#6366f1', text: `${stats.heapMB} MB / 512 MB` },
            { label: 'سرعة الاستجابة', value: Math.max(0, 100 - ((stats.ping || 0) / 5)), color: '#22c55e', text: `${stats.ping || 0}ms` },
            { label: 'الأوامر المُسجَّلة', value: Math.min(100, ((stats.totalCmds || 0) / 100) * 100), color: '#a855f7', text: `${stats.totalCmds || 0} أمر` },
          ].map(m => (
            <div key={m.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>{m.label}</span>
                <span style={{ color: m.color, fontWeight: 700 }}>{m.text}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${m.value}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function ControlSection({ stats, toast }) {
  const settings = stats?.botSettings || EMPTY_SETTINGS
  const [s, setS] = useState({
    autoMessagesEnabled: true,
    aiRandomReplyEnabled: true,
    ghostPingEnabled: false,
    dailyReminderEnabled: true,
    dailySummaryEnabled: true,
    antiRaidAccountAgeEnabled: true,
    ...settings,
  })
  const [saving, setSaving] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  const [commandBusy, setCommandBusy] = useState('')

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) setS(prev => ({ ...prev, ...settings }))
  }, [settings])

  const commands = Array.isArray(stats?.commands) ? stats.commands : []
  const disabledCommands = new Set((Array.isArray(s.disabledCommands) ? s.disabledCommands : []).map(name => String(name).toLowerCase()))
  const filteredCommands = commands.filter(command => {
    const query = commandSearch.trim().toLowerCase()
    return !query || command.name.toLowerCase().includes(query) ||
      (command.aliases || []).some(alias => alias.toLowerCase().includes(query))
  })

  const save = async () => {
    setSaving(true)
    const res = await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify(s) })
    setSaving(false)
    if (res?.success) toast('انحفظت الإعدادات ✅', 'success')
    else toast('ما گدرت أحفظ الإعدادات.', 'error')
  }

  const toggleCommand = async command => {
    const currentlyDisabled = disabledCommands.has(command.name.toLowerCase())
    setCommandBusy(command.name)
    try {
      const res = await apiFetch('/bot-owner/command', {
        method: 'POST',
        body: JSON.stringify({ command: command.name, action: currentlyDisabled ? 'enable' : 'disable' }),
      })
      if (!res?.success) {
        toast(res?.error || 'ما گدرت أغيّر الأمر.', 'error')
        return
      }
      setS(prev => ({
        ...prev,
        disabledCommands: currentlyDisabled
          ? (Array.isArray(prev.disabledCommands) ? prev.disabledCommands : []).filter(name => String(name).toLowerCase() !== command.name.toLowerCase())
          : [...(Array.isArray(prev.disabledCommands) ? prev.disabledCommands : []), command.name],
      }))
      toast(currentlyDisabled ? 'اشتغل الأمر ✅' : 'انطفي الأمر.', 'success')
    } catch (error) {
      toast(error.message || 'ما گدرت أغيّر الأمر.', 'error')
    } finally {
      setCommandBusy('')
    }
  }

  const toggles = [
    { key: 'autoMessagesEnabled', label: 'الرسائل التلقائية', desc: 'رسائل خفيفة، تحديات وأحداث عشوائية.', icon: '🤖' },
    { key: 'aiRandomReplyEnabled', label: 'ردود الذكاء الاصطناعي', desc: 'ردود تلقائية بالمحادثات.', icon: '🧠' },
    { key: 'dailyReminderEnabled', label: 'تذكير الصبح', desc: 'رسالة صباحية كل يوم الساعة 9.', icon: '🌅' },
    { key: 'dailySummaryEnabled', label: 'ملخص اليوم', desc: 'ملخص نشاط السيرفر بالمساء.', icon: '📊' },
    { key: 'ghostPingEnabled', label: 'المنشن الوهمي', desc: 'منشن ينحذف بسرعة (مطفي تلقائياً).', icon: '👻' },
    { key: 'antiRaidAccountAgeEnabled', label: 'حماية الحسابات الجديدة', desc: 'يمنع الحسابات اللي عمرها أقل من 7 أيام.', icon: '🛡️' },
  ]

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">إعدادات البوت العامة</div>
          </div>
          {toggles.map(t => (
            <ToggleRow key={t.key}
              label={`${t.icon} ${t.label}`}
              description={t.desc}
              checked={s[t.key] ?? false}
              onChange={v => setS(p => ({ ...p, [t.key]: v }))}
            />
          ))}
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8, width: '100%' }}>
            {saving ? '⏳ دا أحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">ℹ️</span>
            <div className="card-title">ملاحظات الإعدادات</div>
          </div>
          <div className="info-box" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💡 انتبه لهالنقاط:</div>
            <div>• الإعدادات تشتغل من تحفظها</div>
            <div>• إيقاف AI ما يوقف الأوامر العادية</div>
            <div>• حماية الحسابات الجديدة تمنع الحسابات الحديثة</div>
            <div>• المنشن الوهمي للمزح؛ لا تستخدمه للإزعاج</div>
          </div>

          <div style={{ padding: '14px', background: 'var(--card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📈 إحصائيات سريعة</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'السيرفرات', val: stats?.discordGuilds || 0 },
                { label: 'المستخدمون', val: stats?.discordUsers || 0 },
                { label: 'سرعة الاستجابة', val: `${stats?.ping || 0}ms` },
                { label: 'مدة التشغيل', val: `${Math.floor((stats?.uptime || 0) / 3600)}س ${Math.floor(((stats?.uptime || 0) % 3600) / 60)}د` },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border2)' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent2)', marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-icon">⌨️</span>
          <div>
            <div className="card-title">إدارة أوامر البوت</div>
            <div className="card-subtitle">تگدر تطفي الأمر أو ترجّعه؛ ومالك البوت يظل يگدر يستخدمه.</div>
          </div>
          <span className="badge badge-blue" style={{ marginRight: 'auto' }}>{commands.length} أمر</span>
        </div>
        <input
          className="form-input"
          placeholder="🔍 دوّر باسم الأمر أو أحد بدائله..."
          value={commandSearch}
          onChange={event => setCommandSearch(event.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
          {filteredCommands.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">{commands.length ? 'ماكو أوامر تطابق بحثك.' : 'قائمة الأوامر مو متاحة هسه.'}</div>
            </div>
          ) : filteredCommands.map(command => {
            const disabled = disabledCommands.has(command.name.toLowerCase())
            const busy = commandBusy === command.name
            return (
              <div key={command.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--card2)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13 }}>{command.name}</strong>
                    <span className={`badge ${disabled ? 'badge-red' : 'badge-green'}`}>{disabled ? 'مطفي' : 'شغّال'}</span>
                    {command.ownerOnly && <span className="badge badge-yellow">للمالك بس</span>}
                  </div>
                  {command.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{command.description}</div>}
                  {command.aliases?.length > 0 && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>أسماء ثانية: {command.aliases.join('، ')}</div>}
                </div>
                <button
                  className={`btn btn-sm ${disabled ? 'btn-success' : 'btn-ghost'}`}
                  onClick={() => toggleCommand(command)}
                  disabled={Boolean(commandBusy)}
                >
                  {busy ? '⏳' : disabled ? 'تشغيل' : 'إطفاء'}
                </button>
              </div>
            )
          })}
        </div>
        <div className="form-hint" style={{ marginTop: 10 }}>حتى لو طفيت الأمر، يبقى متاح لمالك البوت حتى يگدر يرجّعه.</div>
      </div>
    </div>
  )
}

// ─── Servers Section ──────────────────────────────────────────────────────────
function ServersSection({ stats }) {
  const guilds = stats?.guilds || []
  const [search, setSearch] = useState('')
  const filtered = guilds.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder="🔍 بحث عن سيرفر..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <span className="badge badge-blue">{filtered.length} سيرفر</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>السيرفر</th>
              <th>الأعضاء</th>
              <th>القنوات</th>
              <th>الأدوار</th>
              <th>المالك</th>
              <th>البوت</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {g.icon
                      ? <img src={g.icon} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                      : <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌐</div>
                    }
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{g.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{g.id}</div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontWeight: 700, color: 'var(--green)' }}>👥 {(g.memberCount || 0).toLocaleString()}</span></td>
                <td>{g.channels || '—'}</td>
                <td>{g.roles || '—'}</td>
                <td><code>{g.ownerId?.slice(-8) || '—'}</code></td>
                <td><span className={`badge ${g.isOwner ? 'badge-green' : 'badge-blue'}`}>{g.isOwner ? '👑 مالك' : '✅ موجود'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Economy Section ──────────────────────────────────────────────────────────
function EconomySection({ toast }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [action, setAction] = useState('add')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!userId || !amount) return toast('كمّل كل الحقول أولاً.', 'error')
    setLoading(true)
    const res = await apiFetch('/bot-owner/economy', { method: 'POST', body: JSON.stringify({ userId, amount: Number(amount), action }) })
    setLoading(false)
    if (res?.success) {
      toast(`✅ تمت العملية على ${userId}.`, 'success')
      setUserId(''); setAmount('')
    } else {
      toast(res?.error || 'صار خلل.', 'error')
    }
  }

  const actions = [
    { value: 'add', label: '➕ زيد رصيد', color: 'var(--green)', desc: 'ضيف مبلغ لرصيد العضو.' },
    { value: 'remove', label: '➖ اخصم رصيد', color: 'var(--red)', desc: 'اطرح مبلغ من رصيد العضو.' },
    { value: 'set', label: '🎯 غيّر الرصيد', color: 'var(--cyan)', desc: 'خلّي رصيد العضو على مبلغ محدد.' },
  ]

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">💰</span>
            <div>
              <div className="card-title">إدارة أرصدة الأعضاء</div>
              <div className="card-subtitle">زيادة، خصم أو تحديد رصيد.</div>
            </div>
          </div>
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">🆔 معرّف عضو Discord</label>
              <input className="form-input" placeholder="123456789012345678" value={userId} onChange={e => setUserId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">💵 المبلغ</label>
              <input className="form-input" type="number" min="0" placeholder="10000" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">🎯 نوع العملية</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {actions.map(a => (
                  <label key={a.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: action === a.value ? 'var(--accent3)' : 'var(--card2)', borderRadius: 8, border: `1px solid ${action === a.value ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <input type="radio" value={a.value} checked={action === a.value} onChange={() => setAction(a.value)} style={{ display: 'none' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: action === a.value ? 'var(--accent2)' : 'var(--text)' }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.desc}</div>
                    </div>
                    {action === a.value && <span style={{ color: 'var(--accent2)' }}>✓</span>}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
              {loading ? '⏳ دا أنفّذ...' : '✅ نفّذ العملية'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <div className="card-title">قبل لا تنفّذ</div>
          </div>
          <div className="info-box" style={{ marginBottom: 12 }}>
            <strong>⚠️ انتبه:</strong> هالعمليات فورية وما تگدر ترجعها.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
            <div>📌 حتى تجيب معرّف العضو: اضغط عليه بالزر اليمين بـ Discord واختار «نسخ المعرّف» (Copy ID).</div>
            <div>📌 فعّل وضع المطوّر (Developer Mode) من الإعدادات.</div>
            <div>📌 ما يصير تضيف رصيد سالب؛ استخدم "خصم"</div>
            <div>📌 خيار "غيّر الرصيد" يستبدل الرصيد كله، مو بس يضيف عليه</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Announce ─────────────────────────────────────────────────────────────────
function AnnounceSection({ toast }) {
  const [channelId, setChannelId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [charCount, setCharCount] = useState(0)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    const res = await apiFetch('/bot-owner/announce', { method: 'POST', body: JSON.stringify({ channelId, message }) })
    setLoading(false)
    if (res?.success) {
      toast('انرسلت الرسالة ✅', 'success')
      setMessage('')
      setCharCount(0)
    } else {
      toast(res?.error || 'صار خلل.', 'error')
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">📢</span>
            <div>
              <div className="card-title">دز إعلان</div>
              <div className="card-subtitle">دز رسالة لأي قناة بأي سيرفر.</div>
            </div>
          </div>
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">📍 معرّف القناة</label>
              <input className="form-input" placeholder="123456789012345678" value={channelId} onChange={e => setChannelId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>💬 الرسالة</span>
                <span style={{ color: charCount > 1900 ? 'var(--red)' : 'var(--muted)', fontSize: 11 }}>{charCount}/2000</span>
              </label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="اكتب رسالتك هنا... وتگدر تضيف إيموجي 🎉"
                value={message}
                onChange={e => { setMessage(e.target.value); setCharCount(e.target.value.length) }}
                maxLength={2000}
                required
              />
              <div className="form-hint">يدعم Markdown: **عريض** *مائل* `كود` __خط تحتي__</div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? '⏳ دا أرسل...' : '📤 دز الإعلان'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">💡</span>
            <div className="card-title">ملاحظات الإعلان</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2.2 }}>
            <div>📌 استخدم معرّف القناة (Channel ID)، مو اسمها.</div>
            <div>📌 البوت يحتاج صلاحية Send Messages</div>
            <div>📌 Discord يرفض الرسائل الأطول من 2000 حرف</div>
            <div>📌 تگدر تمنشن دور أو عضو بكتابة ‎@everyone أو {'<@ID>'}</div>
          </div>

          <div style={{ marginTop: 20, padding: 14, background: 'var(--card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🎨 مثال:</div>
            <code style={{ display: 'block', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.8 }}>
              {`🎉 **عدنا خبر!**\n\nهلا @everyone،\nاليوم عدنا فعالية جديدة.\n\nالوقت: **8 بالليل**\nالمكان: #الأحداث`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
function LogsSection({ stats }) {
  const logs = stats?.logs || []
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? logs :
    filter === 'error' ? logs.filter(l => l.includes('❌') || l.includes('ERROR') || l.includes('error')) :
    filter === 'success' ? logs.filter(l => l.includes('✅') || l.includes('ready') || l.includes('success')) :
    logs

  return (
    <div className="animate-fade-up">
      <div className="card">
        <div className="card-header">
          <span className="card-icon">📋</span>
          <div>
            <div className="card-title">سجلات البوت الحية</div>
            <div className="card-subtitle">آخر 200 سطر من الـ console</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginRight: 'auto' }}>
            {['all', 'error', 'success'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'الكل' : f === 'error' ? '❌ أخطاء' : '✅ نجاح'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontFamily: 'var(--mono)', fontSize: 12, maxHeight: 500, overflowY: 'auto', lineHeight: 1.8, direction: 'ltr', textAlign: 'left' }}>
          {filtered.length === 0
            ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>ماكو سجلات تطابق الفلتر.</div>
            : filtered.map((line, i) => (
              <div key={i} style={{
                color: (line.includes('❌') || line.includes('ERROR') || line.includes('error'))
                  ? 'var(--red)'
                  : (line.includes('✅') || line.includes('ready') || line.includes('success'))
                  ? 'var(--green)'
                  : (line.includes('WARN') || line.includes('warn'))
                  ? 'var(--yellow)'
                  : 'var(--text2)',
                padding: '1px 0',
                borderBottom: '1px solid var(--border2)',
              }}>
                {line}
              </div>
            ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 16 }}>
          <span>📊 إجمالي السجلات: {logs.length}</span>
          <span>❌ أخطاء: {logs.filter(l => l.includes('ERROR')).length}</span>
          <span>✅ نجاح: {logs.filter(l => l.includes('ready')).length}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Responses ────────────────────────────────────────────────────────────────
function ResponsesSection({ toast }) {
  const [responses, setResponses] = useState([])
  const [trigger, setTrigger] = useState('')
  const [response, setResponse] = useState('')
  const [exact, setExact] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = () => apiFetch('/bot-owner/responses').then(d => { if (d?.success) setResponses(d.responses); setLoading(false) })

  useEffect(() => { reload() }, [])

  const add = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/bot-owner/response', { method: 'POST', body: JSON.stringify({ trigger, response, exactMatch: exact }) })
    if (res?.success) {
      toast('انضاف الرد ✅', 'success')
      setTrigger(''); setResponse(''); reload()
    } else {
      toast(res?.error || 'خطأ', 'error')
    }
  }

  const del = async (id) => {
    await apiFetch(`/bot-owner/response/${id}`, { method: 'DELETE' })
    setResponses(r => r.filter(x => x.id !== id))
    toast('تم الحذف', 'info')
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">➕</span>
            <div className="card-title">ضيف رد تلقائي جديد</div>
          </div>
          <form onSubmit={add}>
            <div className="form-group">
              <label className="form-label">🎯 كلمة أو عبارة التفعيل</label>
              <input className="form-input" placeholder="مثال: هلا" value={trigger} onChange={e => setTrigger(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">💬 الرد التلقائي</label>
              <textarea className="form-textarea" placeholder="مثال: هلا بيك! شلون أساعدك؟" value={response} onChange={e => setResponse(e.target.value)} required />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', fontSize: 13, padding: '10px 14px', background: exact ? 'var(--accent3)' : 'var(--card2)', borderRadius: 8, border: '1px solid var(--border)', transition: 'all 0.2s' }}>
              <input type="checkbox" checked={exact} onChange={e => setExact(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>لازم تطابقها حرفياً</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>ما يرد إلا إذا الرسالة كلها تطابق الكلمة أو العبارة.</div>
              </div>
            </label>
            <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>➕ ضيف الرد</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">📋</span>
            <div className="card-title">الردود الحالية ({responses.length})</div>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : responses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤖</div>
              <div className="empty-state-title">ماكو ردود تلقائية بعد.</div>
              <div className="empty-state-desc">ضيف رد من النموذج اللي يمك.</div>
            </div>
          ) : responses.map(r => (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>"{r.trigger}"</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{(r.response || '').substring(0, 70)}{(r.response || '').length > 70 ? '...' : ''}</div>
                <div style={{ marginTop: 5, display: 'flex', gap: 5 }}>
                  {r.exactMatch && <span className="badge badge-purple">تطابق تام</span>}
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Welcome Section (مُصلحة وكاملة) ─────────────────────────────────────────
function WelcomeSection({ stats, toast }) {
  const settings = stats?.botSettings || EMPTY_SETTINGS
  const guildChannels = stats?.guildChannels || []

  const [s, setS] = useState({
    welcomeGuildId: '',
    welcomeChannelId: '',
    welcomeImage: '',
    welcomeAvatarX: 960,
    welcomeAvatarY: 540,
    welcomeAvatarWidth: 256,
    welcomeAvatarHeight: 256,
    welcomeAvatarRadius: 50,
    savedWelcomeDesigns: [],
    ...settings,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [designName, setDesignName] = useState('')

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) setS(prev => ({ ...prev, ...settings }))
  }, [settings])

  const save = async () => {
    if (!s.welcomeGuildId || !s.welcomeChannelId) {
      return toast('⚠️ اختار السيرفر وقناة الترحيب أولاً.', 'error')
    }
    setSaving(true)
    const res = await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify(s) })
    setSaving(false)
    if (res?.success) toast('انحفظت إعدادات الترحيب ✅', 'success')
    else toast('ما گدرت أحفظ الإعدادات: ' + (res?.error || ''), 'error')
  }

  const testWelcome = async () => {
    if (!s.welcomeGuildId || !s.welcomeChannelId) {
      return toast('⚠️ اختار السيرفر والقناة واحفظ الإعدادات قبل التجربة.', 'error')
    }
    setTesting(true)
    // حفظ أولاً لضمان وصول الإعدادات للـ backend
    await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify(s) })
    // ثم إرسال الإعدادات في body التجربة
    const res = await apiFetch('/bot-owner/test-welcome', {
      method: 'POST',
      body: JSON.stringify({
        guildId: s.welcomeGuildId,
        channelId: s.welcomeChannelId,
      })
    })
    setTesting(false)
    if (res?.success) toast(res.message || '✅ وصلت رسالة الترحيب التجريبية!', 'success')
    else toast(res?.error || 'صار خلل.', 'error')
  }

  const saveDesign = async () => {
    if (!designName) return toast('اكتب اسم للتصميم.', 'error')
    if (!s.welcomeImage) return toast('ماكو صورة حتى نحفظها.', 'error')
    const newDesign = {
      id: Date.now().toString(),
      name: designName,
      image: s.welcomeImage,
      x: s.welcomeAvatarX, y: s.welcomeAvatarY,
      w: s.welcomeAvatarWidth, h: s.welcomeAvatarHeight,
      r: s.welcomeAvatarRadius
    }
    const newDesigns = [...(s.savedWelcomeDesigns || []), newDesign]
    setS({ ...s, savedWelcomeDesigns: newDesigns })
    setDesignName('')
    await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify({ savedWelcomeDesigns: newDesigns }) })
    toast('انحفظ التصميم بالمعرض ✅', 'success')
  }

  const applyDesign = (d) => {
    setS({ ...s, welcomeImage: d.image, welcomeAvatarX: d.x, welcomeAvatarY: d.y, welcomeAvatarWidth: d.w, welcomeAvatarHeight: d.h, welcomeAvatarRadius: d.r })
    toast('تطبّق التصميم؛ لا تنسى تحفظه.', 'info')
  }

  const deleteDesign = async (id) => {
    const newDesigns = (s.savedWelcomeDesigns || []).filter(d => d.id !== id)
    setS({ ...s, savedWelcomeDesigns: newDesigns })
    await apiFetch('/bot-owner/settings', { method: 'POST', body: JSON.stringify({ savedWelcomeDesigns: newDesigns }) })
    toast('تم حذف التصميم', 'info')
  }

  const selectedGuild = guildChannels.find(g => g.guildId === s.welcomeGuildId)
  const availableChannels = selectedGuild?.channels || []

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>تخصيص صورة ورسالة الترحيب لكل السيرفرات</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={testWelcome} disabled={testing || saving}>
            {testing ? '⏳ دا أجرّب...' : '🧪 جرّب الترحيب'}
          </button>
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? '⏳ دا أحفظ...' : '💾 حفظ وتطبيق'}
          </button>
        </div>
      </div>

      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">⚙️</span>
            <div className="card-title">الإعدادات</div>
          </div>

          <div className="form-group">
            <label className="form-label">🌐 السيرفر المخصص للترحيب</label>
            <select className="form-select" value={s.welcomeGuildId || ''} onChange={e => setS({ ...s, welcomeGuildId: e.target.value, welcomeChannelId: '' })}>
              <option value="">— اختار سيرفر —</option>
              {guildChannels.map(g => (
                <option key={g.guildId} value={g.guildId}>{g.guildName}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">💬 قناة الترحيب</label>
            <select className="form-select" value={s.welcomeChannelId || ''} onChange={e => setS({ ...s, welcomeChannelId: e.target.value })}>
              <option value="">— اختار قناة —</option>
              {availableChannels.map(ch => (
                <option key={ch.id} value={ch.id}>#{ch.name}{!ch.canSend ? ' ⚠️' : ''}</option>
              ))}
            </select>
            {s.welcomeChannelId && (
              <div className="form-hint" style={{ color: 'var(--green)' }}>✅ القناة المختارة: #{availableChannels.find(c => c.id === s.welcomeChannelId)?.name || s.welcomeChannelId}</div>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>🖼️ صورة الترحيب</label>
              {s.welcomeImage && (
                  <button className="btn btn-sm btn-danger" onClick={() => setS({ ...s, welcomeImage: '', welcomeImageBase64: '', deleteWelcomeImage: true })}>🗑️ احذف الصورة نهائياً</button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label className="btn btn-primary" style={{ flex: 1, cursor: 'pointer', textAlign: 'center' }}>
                ☁️ اختار صورة من جهازك
                <input type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) return toast('الصورة أكبر من الحد المسموح (5 ميجابايت).', 'error');
                  
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setS({ ...s, welcomeImage: ev.target.result, welcomeImageBase64: ev.target.result, deleteWelcomeImage: false });
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
            <div className="form-hint" style={{ color: 'var(--muted)', marginTop: 8 }}>أو حط رابط الصورة المباشر هنا:</div>
            <input type="text" className="form-input" style={{ marginTop: 5 }} placeholder="https://..." value={!s.welcomeImage?.startsWith('data:') && !s.welcomeImage?.startsWith('/uploads/') ? (s.welcomeImage || '') : ''} onChange={e => setS({ ...s, welcomeImage: e.target.value, welcomeImageBase64: '', deleteWelcomeImage: false })} />
          </div>

          {[
            { key: 'welcomeAvatarX', label: 'موضع الأفاتار أفقياً (X)', min: 0, max: 1920 },
            { key: 'welcomeAvatarY', label: 'موضع الأفاتار عمودياً (Y)', min: 0, max: 1080 },
            { key: 'welcomeAvatarWidth', label: 'عرض الأفاتار (Width)', min: 50, max: 600 },
            { key: 'welcomeAvatarHeight', label: 'طول الأفاتار (Height)', min: 50, max: 600 },
            { key: 'welcomeAvatarRadius', label: 'تدوير الزوايا (Radius %)', min: 0, max: 50 },
          ].map(({ key, label, min, max }) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}: <strong style={{ color: 'var(--accent2)' }}>{s[key]}{key === 'welcomeAvatarRadius' ? '%' : 'px'}</strong></label>
              <input type="range" min={min} max={max} value={s[key] || min} onChange={e => setS({ ...s, [key]: parseInt(e.target.value) })} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">👁️</span>
            <div className="card-title">معاينة مباشرة (1920×1080)</div>
          </div>
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '16/9',
            backgroundColor: '#111',
            backgroundImage: s.welcomeImage ? `url("${s.welcomeImage.trim()}")` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border)',
          }}>
            {s.welcomeImage ? (
              <div style={{
                position: 'absolute',
                left: `${(s.welcomeAvatarX / 1920) * 100}%`,
                top: `${(s.welcomeAvatarY / 1080) * 100}%`,
                width: `${(s.welcomeAvatarWidth / 1920) * 100}%`,
                height: `${(s.welcomeAvatarHeight / 1080) * 100}%`,
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderRadius: `${s.welcomeAvatarRadius}%`,
                border: '3px solid var(--accent)',
                boxShadow: '0 0 20px rgba(99,102,241,0.5)',
                transform: 'translate(-50%, -50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2vw', fontWeight: 'bold', color: '#333',
              }}>
                👤
              </div>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 32 }}>🖼️</span>
                <span>ضع رابط الصورة لمعاينة التصميم</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            * المواقع تُحسب بناءً على دقة 1920×1080
          </div>

          {/* معرض التصاميم */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>📚 حفظ التصميم الحالي</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" className="form-input" placeholder="اسم التصميم..." value={designName} onChange={e => setDesignName(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={saveDesign}>💾</button>
            </div>
          </div>
        </div>
      </div>

      {/* معرض التصاميم */}
      {(s.savedWelcomeDesigns || []).length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-icon">🎨</span>
            <div className="card-title">معرض التصاميم المحفوظة ({(s.savedWelcomeDesigns || []).length})</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(s.savedWelcomeDesigns || []).map(d => (
              <div key={d.id} style={{ width: 200, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', backgroundImage: `url(${d.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-success" style={{ flex: 1 }} onClick={() => applyDesign(d)}>تطبيق</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteDesign(d.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Moderation Section ───────────────────────────────────────────────────────
function ModerationSection({ toast }) {
  const [userId, setUserId] = useState('')
  const [guildId, setGuildId] = useState('')
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('warn')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!userId || !guildId) return toast('كمّل كل الحقول أولاً.', 'error')
    setLoading(true)
    const res = await apiFetch('/bot-owner/moderate', {
      method: 'POST',
      body: JSON.stringify({ userId, guildId, action, reason })
    })
    setLoading(false)
    if (res?.success) {
      toast(`✅ تنفّذ الإجراء على ${userId}.`, 'success')
      setUserId(''); setReason('')
    } else {
      toast(res?.error || 'ما گدرت أنفّذ الإجراء.', 'error')
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="cards-grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🔨</span>
            <div>
              <div className="card-title">إجراءات الإشراف</div>
              <div className="card-subtitle">نفّذ إجراء على عضو.</div>
            </div>
          </div>
          <form onSubmit={handle}>
            <div className="form-group">
              <label className="form-label">🆔 معرّف العضو</label>
              <input className="form-input" placeholder="123456789..." value={userId} onChange={e => setUserId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">🌐 معرّف السيرفر</label>
              <input className="form-input" placeholder="123456789..." value={guildId} onChange={e => setGuildId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">⚡ الإجراء</label>
              <select className="form-select" value={action} onChange={e => setAction(e.target.value)}>
                <option value="warn">⚠️ تحذير</option>
                <option value="kick">🦵 طرد (Kick)</option>
                <option value="ban">🔨 حظر (Ban)</option>
                <option value="timeout">⏰ كتم مؤقت</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">📝 السبب (اختياري)</label>
              <input className="form-input" placeholder="سبب الإجراء..." value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <button className="btn btn-danger" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? '⏳...' : '⚡ نفّذ الإجراء'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-icon">ℹ️</span>
            <div className="card-title">عن إجراءات الإشراف</div>
          </div>
          <div className="info-box warning" style={{ marginBottom: 12 }}>
            ⚠️ هالإجراءات فورية وتطبّق مباشرة على العضو بـ Discord.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2.2 }}>
            <div>• <strong>تحذير:</strong> توصله رسالة تنبيه.</div>
            <div>• <strong>طرد:</strong> يطلعه من السيرفر، ويگدر يرجع.</div>
            <div>• <strong>حظر:</strong> يمنعه من دخول السيرفر.</div>
            <div>• <strong>كتم مؤقت:</strong> ما يگدر يكتب لمدة 10 دقايق.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Bot Owner Dashboard ─────────────────────────────────────────────────
export default function BotOwnerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [stats, setStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loadError, setLoadError] = useState('')
  const { toasts, toast } = useToast()

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const data = await apiFetch('/bot-owner/stats')
      if (data?.success) {
        setStats(data.stats)
        setLastUpdated(new Date())
        setLoadError('')
      } else if (data) {
        setLoadError(data.error || 'ما گدرت أحمّل بيانات البوت.')
      }
    } catch {
      setLoadError('ما گدرت أحمّل بيانات البوت. تأكد من الاتصال وجرّب مرة ثانية.')
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    const interval = setInterval(() => loadStats(true), 60000)
    return () => clearInterval(interval)
  }, [loadStats])

  const sectionTitles = {
    overview:   '📊 نظرة عامة',
    control:    '⚙️ إعدادات البوت',
    servers:    '🌐 السيرفرات',
    economy:    '💰 الاقتصاد',
    moderation: '🔨 الإشراف',
    announce:   '📢 الإعلانات',
    logs:       '📋 السجلات',
    responses:  '🤖 الردود التلقائية',
    welcome:    '🖼️ صورة الترحيب',
  }

  const sections = {
    overview:   <Overview stats={stats} />,
    control:    <ControlSection stats={stats} toast={toast} />,
    servers:    <ServersSection stats={stats} />,
    economy:    <EconomySection toast={toast} />,
    moderation: <ModerationSection toast={toast} />,
    announce:   <AnnounceSection toast={toast} />,
    logs:       <LogsSection stats={stats} />,
    responses:  <ResponsesSection toast={toast} />,
    welcome:    <WelcomeSection stats={stats} toast={toast} />,
  }

  return (
    <div className="page-layout">
      <Sidebar activeSection={section} onSection={setSection} role="bot_owner" user={user} onLogout={logout} />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">{sectionTitles[section] || 'الداشبورد'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshButton busy={refreshing} lastUpdated={lastUpdated} onClick={() => loadStats()} />
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/guilds')} type="button">
              🏠 إدارة السيرفرات
            </button>
            {stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
                <span className="status-dot online" />
                <span>متصل • {stats.ping || 0}ms</span>
              </div>
            )}
            <span className="page-badge gold">👑 مالك البوت</span>
          </div>
        </div>
        {loadError && (
          <div className="dashboard-load-error" role="alert">
            <span>⚠️ {loadError}</span>
            <button className="btn btn-outline btn-sm" onClick={() => loadStats()} type="button">جرّب مرة ثانية</button>
          </div>
        )}
        {sections[section] || null}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
