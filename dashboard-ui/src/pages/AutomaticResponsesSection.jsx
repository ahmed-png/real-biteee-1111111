import React, { useEffect, useState } from 'react'
import { apiFetch } from '../auth'
import { ToggleRow } from '../components/ui'

function createResponseId() {
  return `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AutomaticResponsesSection({ guildId, toast }) {
  const [settings, setSettings] = useState(null)
  const [loadedGuildId, setLoadedGuildId] = useState(null)
  const [trigger, setTrigger] = useState('')
  const [response, setResponse] = useState('')
  const [exactMatch, setExactMatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    apiFetch(`/server/${guildId}/automatic-responses`)
      .then(data => {
        if (!active) return
        setLoadedGuildId(guildId)
        if (!data?.success || !Array.isArray(data.responses)) {
          setLoadError(data?.error || 'ما گدرت أحمّل الردود التلقائية.')
          return
        }
        setLoadError('')
        setSettings({ enabled: data.enabled !== false, responses: data.responses })
      })
      .catch(error => {
        if (active) {
          setLoadedGuildId(guildId)
          setLoadError(error.message || 'ما گدرت أحمّل الردود التلقائية.')
        }
      })

    return () => { active = false }
  }, [guildId])

  const updateResponse = (id, field, value) => {
    setSettings(current => ({
      ...current,
      responses: current.responses.map(item => item.id === id ? { ...item, [field]: value } : item),
    }))
  }

  const addResponse = event => {
    event.preventDefault()
    const cleanTrigger = trigger.trim()
    const cleanResponse = response.trim()
    if (!cleanTrigger || !cleanResponse || !settings) return
    if (settings.responses.length >= 100) {
      toast('وصلت الحد الأعلى: 100 رد لهذا السيرفر.', 'error')
      return
    }
    setSettings(current => ({
      ...current,
      responses: [...current.responses, {
        id: createResponseId(),
        trigger: cleanTrigger,
        response: cleanResponse,
        exactMatch,
        enabled: true,
      }],
    }))
    setTrigger('')
    setResponse('')
    setExactMatch(false)
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const result = await apiFetch(`/server/${guildId}/automatic-responses`, {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      if (!result?.success) {
        toast(result?.error || 'ما گدرت أحفظ الردود.', 'error')
        return
      }
      setSettings({ enabled: result.enabled, responses: result.responses })
      toast('انحفظت الردود التلقائية لهذا السيرفر ✅', 'success')
    } catch (error) {
      toast(error.message || 'ما گدرت أحفظ الردود.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loadedGuildId !== guildId) return <div className="loading-screen"><div className="spinner" /></div>

  if (loadError) {
    return (
      <div className="card" role="alert">
        <div className="info-box warning">{loadError}</div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="animate-fade-up">
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🤖</span>
          <div>
            <div className="card-title">ردود تلقائية خاصة بالسيرفر</div>
            <div className="card-subtitle">الردود اللي تضيفها هنا ما تشتغل إلا بهذا السيرفر.</div>
          </div>
        </div>

        <ToggleRow
          label="تفعيل الردود التلقائية"
          description="تگدر تطفي النظام كله بدون ما تحذف ردودك."
          checked={settings.enabled}
          onChange={enabled => setSettings(current => ({ ...current, enabled }))}
        />

        <form onSubmit={addResponse} style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          <input
            className="form-input"
            value={trigger}
            onChange={event => setTrigger(event.target.value)}
            maxLength={64}
            placeholder="كلمة أو عبارة التفعيل، مثال: قوانين السيرفر"
            aria-label="كلمة أو عبارة التفعيل"
            required
          />
          <textarea
            className="form-textarea"
            value={response}
            onChange={event => setResponse(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="اكتب الرد اللي يرسله البوت..."
            aria-label="نص الرد التلقائي"
            required
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={exactMatch} onChange={event => setExactMatch(event.target.checked)} />
            <span>الرسالة لازم تطابق العبارة حرفياً</span>
          </label>
          <button className="btn btn-outline" type="submit" disabled={settings.responses.length >= 100}>➕ ضيف الرد للقائمة</button>
        </form>

        <div className="card-header">
          <div className="card-title">ردود هذا السيرفر ({settings.responses.length})</div>
          <button className="btn btn-primary" onClick={save} disabled={saving} type="button" style={{ marginRight: 'auto' }}>
            {saving ? '⏳ دا أحفظ...' : '💾 حفظ التغييرات'}
          </button>
        </div>

        {settings.responses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">ما ضفت ردود لهذا السيرفر بعد.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxHeight: 620, overflowY: 'auto' }}>
            {settings.responses.map((item, index) => (
              <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--card2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span className="badge">{index + 1}</span>
                  <input
                    className="form-input"
                    value={item.trigger}
                    onChange={event => updateResponse(item.id, 'trigger', event.target.value)}
                    maxLength={64}
                    aria-label={`كلمة تفعيل الرد ${index + 1}`}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <label className="toggle" title={item.enabled ? 'إيقاف هذا الرد' : 'تفعيل هذا الرد'}>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={event => updateResponse(item.id, 'enabled', event.target.checked)}
                      aria-label={`${item.enabled ? 'إيقاف' : 'تفعيل'} الرد ${item.trigger}`}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() => setSettings(current => ({
                      ...current,
                      responses: current.responses.filter(responseItem => responseItem.id !== item.id),
                    }))}
                    aria-label={`حذف الرد ${item.trigger}`}
                  >
                    🗑️
                  </button>
                </div>
                <textarea
                  className="form-textarea"
                  value={item.response}
                  onChange={event => updateResponse(item.id, 'response', event.target.value)}
                  maxLength={2000}
                  rows={2}
                  aria-label={`الرد على ${item.trigger}`}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                  <input
                    type="checkbox"
                    checked={item.exactMatch}
                    onChange={event => updateResponse(item.id, 'exactMatch', event.target.checked)}
                  />
                  تطابق حرفي
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
