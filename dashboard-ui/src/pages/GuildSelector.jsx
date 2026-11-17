import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'
import { ToastContainer, useToast } from '../components/ui'

// ─── Guild Selector — يظهر للـ Server Owner ───────────────────────────────────
export default function GuildSelector() {
  const { user, guilds, logout } = useAuth()
  const navigate = useNavigate()
  const { toasts } = useToast()
  const [botStatus, setBotStatus] = useState(null)
  const [search, setSearch] = useState('')
  const isBotOwner = user?.role === 'bot_owner'
  const availableGuilds = useMemo(
    () => isBotOwner ? guilds.filter(guild => guild.isOwner) : guilds,
    [guilds, isBotOwner]
  )
  const filteredGuilds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query
      ? availableGuilds.filter(guild => guild.name.toLocaleLowerCase().includes(query))
      : availableGuilds
  }, [availableGuilds, search])
  const inviteUrl = botStatus?.clientId
    ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(botStatus.clientId)}&scope=bot%20applications.commands&permissions=0`
    : null

  useEffect(() => {
    apiFetch('/public/status').then(d => setBotStatus(d))
  }, [])

  return (
    <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 800 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--cyan)' }} />
                : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>
              }
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>هلا، {user?.username || 'مستخدم'}</div>
                <div className={`badge ${isBotOwner ? 'badge-gold' : 'badge-blue'}`} style={{ marginTop: 4 }}>
                  {isBotOwner ? '👑 مالك البوت · إدارة السيرفرات' : '🔑 مالك السيرفر'}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isBotOwner && (
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/bot-owner')} type="button">
                👑 الرجوع للوحة البوت
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={logout} type="button">🚪 خروج</button>
          </div>
        </div>

        {/* Bot Status */}
        {botStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24, fontSize: 13 }}>
            <span className={`status-dot ${botStatus.online ? 'online' : 'offline'}`} />
            <span>البوت: <strong style={{ color: botStatus.online ? 'var(--green)' : 'var(--red)' }}>{botStatus.online ? 'متصل' : 'غير متصل'}</strong></span>
            {botStatus.online && <span style={{ color: 'var(--muted)', marginRight: 12 }}>Ping: {botStatus.ping}ms</span>}
          </div>
        )}

        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>🌐 اختار السيرفر اللي تريد تديره</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          {isBotOwner
            ? 'هنا تبين السيرفرات اللي تملكها والبوت موجود بيها. صلاحيات مالك البوت تبقى نفسها.'
            : 'هنا تبين السيرفرات اللي تملكها والبوت موجود بيها.'}
        </p>

        {availableGuilds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>ماكو سيرفرات متاحة</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              ماكو سيرفر تملكه والبوت موجود بيه هسه.
            </div>
            {inviteUrl
              ? (
                <>
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    ➕ دعوة البوت لسيرفرك
                  </a>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                    رابط الدعوة يطلب أقل صلاحيات ممكنة؛ زيد صلاحيات البوت حسب الميزات اللي تحتاجها.
                  </p>
                </>
              )
              : <p className="guild-empty" role="status">رابط الدعوة مو متاح هسه؛ ما گدرت أجيب معرّف البوت.</p>
            }
          </div>
        ) : (
          <>
            <div className="guild-selector-toolbar">
              <label className="guild-search">
                <span aria-hidden="true">⌕</span>
                <input
                  className="form-input"
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="دوّر باسم السيرفر..."
                  aria-label="دوّر باسم السيرفر"
                />
              </label>
              <span className="badge">{filteredGuilds.length} سيرفر</span>
            </div>
            {filteredGuilds.length === 0 ? (
              <div className="guild-empty" role="status">ماكو نتائج تطابق بحثك.</div>
            ) : (
              <div className="guild-grid">
                {filteredGuilds.map(g => (
                  <div
                    key={g.id}
                    className="guild-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`إدارة السيرفر ${g.name}`}
                    onClick={() => navigate(`/server/${g.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/server/${g.id}`)
                      }
                    }}
                  >
                      {g.icon
                        ? <img className="guild-icon" src={g.icon} alt={g.name} />
                        : <div className="guild-icon-placeholder">🌐</div>
                      }
                      <div className="guild-name">{g.name}</div>
                      <div className="guild-members">👥 {(g.memberCount || 0).toLocaleString()} عضو</div>
                      {g.isOwner && <div className="badge badge-gold" style={{ marginTop: 8 }}>👑 مالك</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
