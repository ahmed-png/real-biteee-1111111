import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, apiFetch } from '../auth'

// ─── Toast Notification System ────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])
  return { toasts, toast: add }
}

export function ToastContainer({ toasts }) {
  return (
    <div className="notify">
      {toasts.map(t => (
        <div key={t.id} className={`notify-item ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function RadarLogo({ className = '' }) {
  return (
    <svg
      className={`radar-logo-mark ${className}`}
      viewBox="0 0 64 64"
      role="img"
      aria-label="رادار البوت"
    >
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity=".24" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="1" />
      <circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="1" />
      <path d="M4 32h56M32 4v56" stroke="currentColor" strokeOpacity=".14" strokeWidth="1" />
      <g className="radar-sweep">
        <path d="M32 32V4a28 28 0 0 1 24 14L32 32Z" fill="currentColor" fillOpacity=".22" />
        <path d="M32 32 56 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle className="radar-target radar-target-one" cx="44" cy="25" r="2.5" fill="currentColor" />
      <circle className="radar-target radar-target-two" cx="21" cy="42" r="2" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  )
}

export function RefreshButton({ busy, lastUpdated, onClick }) {
  return (
    <div className="dashboard-refresh">
      <span className="dashboard-refresh-time">
        {lastUpdated
          ? `آخر تحديث ${lastUpdated.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}`
          : 'لم يتم التحديث بعد'}
      </span>
      <button className="btn btn-outline btn-sm" onClick={onClick} disabled={busy} type="button">
        <span aria-hidden="true">{busy ? '◌' : '↻'}</span>
        {busy ? 'جاري التحديث' : 'تحديث البيانات'}
      </button>
    </div>
  )
}

// ─── Sidebar Component ─────────────────────────────────────────────────────────
export function Sidebar({ activeSection, onSection, role, user, onLogout, selectedGuild }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isBotOwner = role === 'bot_owner'

  const botOwnerMenu = [
    { id: 'overview', icon: '📊', label: 'نظرة عامة' },
    { id: 'control', icon: '⚙️', label: 'إعدادات البوت' },
    { id: 'servers', icon: '🌐', label: 'السيرفرات' },
    { id: 'economy', icon: '💰', label: 'الاقتصاد' },
    { id: 'moderation', icon: '🔨', label: 'الإشراف' },
    { id: 'announce', icon: '📢', label: 'الإعلانات' },
    { id: 'logs', icon: '📋', label: 'السجلات' },
    { id: 'responses', icon: '🤖', label: 'الردود التلقائية' },
    { id: 'welcome', icon: '🖼️', label: 'صورة الترحيب' },
  ]

  const serverOwnerMenu = [
    { id: 'overview', icon: '📊', label: 'نظرة عامة' },
    { id: 'colors', icon: '🎨', label: 'نظام الألوان' },
    { id: 'logs', icon: '📋', label: 'قناة السجلات' },
    { id: 'welcome', icon: '👋', label: 'إعدادات الترحيب' },
    { id: 'protection', icon: '🛡️', label: 'الحماية' },
    { id: 'auto-role', icon: '🎟️', label: 'الرتبة التلقائية' },
    { id: 'roles', icon: '🏷️', label: 'الأدوار' },
    { id: 'leaderboard', icon: '🏆', label: 'المتصدرون' },
  ]

  const menu = isBotOwner ? botOwnerMenu : serverOwnerMenu

  return (
    <>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(open => !open)}
      >
        {mobileOpen ? '×' : '☰'}
      </button>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="إغلاق القائمة"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo"><RadarLogo /></div>
        <div>
          <div className="sidebar-title">لوحة التحكم</div>
          <div className="sidebar-subtitle">{isBotOwner ? 'Bot Owner' : selectedGuild?.name || 'Server Owner'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">{isBotOwner ? 'إدارة البوت' : 'إدارة السيرفر'}</div>
          {menu.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${activeSection === item.id ? ' active' : ''}`}
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => { onSection(item.id); setMobileOpen(false) }}
            >
              <span className="si-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">روابط</div>
          <a href="/store" className="sidebar-item" onClick={() => setMobileOpen(false)}>
            <span className="si-icon">🛒</span>
            المتجر
          </a>
          <a href="/auction" className="sidebar-item" onClick={() => setMobileOpen(false)}>
            <span className="si-icon">🏛️</span>
            المزاد
          </a>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          {user?.avatar
            ? <img className="user-avatar" src={user.avatar} alt="" />
            : <div className="user-avatar-placeholder">👤</div>
          }
          <div className="user-info">
            <div className="user-name">{user?.username || 'مستخدم'}</div>
            <div className={`user-role ${isBotOwner ? 'bot-owner' : 'server-owner'}`}>
              {isBotOwner ? '👑 Bot Owner' : '🔑 Server Owner'}
            </div>
          </div>
          <button onClick={onLogout} title="تسجيل خروج" aria-label="تسجيل خروج" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--muted)' }}>
            🚪
          </button>
        </div>
      </div>
      </aside>
    </>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, value, label, color = '' }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

// ─── Toggle Row ────────────────────────────────────────────────────────────────
export function ToggleRow({ label, checked, onChange, description }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border2)', paddingBottom: '14px', marginBottom: '14px' }}>
      <div className="toggle-wrap">
        <div>
          <div className="toggle-label">{label}</div>
          {description && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{description}</div>}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  )
}

// ─── Channel Dropdown ──────────────────────────────────────────────────────────
export function ChannelSelect({ channels, value, onChange, label, hint }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <select className="form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— اختر قناة —</option>
        {(channels || []).map(c => (
          <option key={c.id} value={c.id}>
            #{c.name}{!c.canSend ? ' ⚠️' : ''}
          </option>
        ))}
      </select>
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  )
}
