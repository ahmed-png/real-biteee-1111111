import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../auth'
import { ToggleRow } from '../components/ui'

export default function IraqiResponsesSection({ guildId, toast }) {
  const [settings, setSettings] = useState(null)
  const [loadedGuildId, setLoadedGuildId] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    apiFetch(`/server/${guildId}/iraqi-responses`)
      .then(data => {
        if (!active) return
        setLoadedGuildId(guildId)
        if (!data?.success || !Array.isArray(data.responses)) {
          setLoadError(data?.error || 'ما گدرت أحمّل الردود العراقية.')
          return
        }
        setLoadError('')
        setSettings({ enabled: data.enabled !== false, responses: data.responses })
      })
      .catch(error => {
        if (active) {
          setLoadedGuildId(guildId)
          setLoadError(error.message || 'ما گدرت أحمّل الردود العراقية.')
        }
      })

    return () => { active = false }
  }, [guildId])

  const filteredResponses = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (settings?.responses || [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !query || item.trigger.toLowerCase().includes(query) || item.response.toLowerCase().includes(query))
  }, [search, settings?.responses])

  const updateResponse = (id, field, value) => {
    setSettings(current => ({
      ...current,
      responses: current.responses.map(item => item.id === id ? { ...item, [field]: value } : item),
    }))
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const result = await apiFetch(`/server/${guildId}/iraqi-responses`, {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      if (!result?.success) {
        toast(result?.error || 'ما گدرت أحفظ الردود.', 'error')
        return
      }
      setSettings({ enabled: result.enabled, responses: result.responses })
      toast('انحفظت الردود العراقية ✅', 'success')
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

  const enabledCount = settings.responses.filter(item => item.enabled).length

  return (
    <div className="animate-fade-up">
      <div className="card">
        <div className="card-header">
          <span className="card-icon">💬</span>
          <div>
            <div className="card-title">ردود عراقية تلقائية</div>
            <div className="card-subtitle">عدّل الكلمات والردود حتى تناسب جوّ سيرفرك.</div>
          </div>
          <span className="badge badge-blue" style={{ marginRight: 'auto' }}>
            {enabledCount} من {settings.responses.length} مفعّل
          </span>
        </div>

        <ToggleRow
          label="تفعيل الردود العراقية"
          description="البوت يرد على الكلمات والعبارات المفعّلة في المحادثات العامة."
          checked={settings.enabled}
          onChange={enabled => setSettings(current => ({ ...current, enabled }))}
        />

        <div className="info-box" style={{ marginBottom: 14 }}>
          الردود تطابق الكلمة أو العبارة بشكل مستقل؛ ما تشتغل إذا كانت مجرد جزء من كلمة أطول. التشكيل وعلامات الترقيم ما تأثر على المطابقة.
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            className="form-input"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="🔍 دوّر على كلمة أو رد..."
            aria-label="البحث في الردود العراقية"
            style={{ flex: '1 1 240px' }}
          />
          <button className="btn btn-primary" onClick={save} disabled={saving} type="button">
            {saving ? '⏳ دا أحفظ...' : '💾 حفظ التغييرات'}
          </button>
        </div>

        {filteredResponses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">ما لگينا ردود تطابق البحث.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxHeight: 620, overflowY: 'auto', padding: '2px 4px 2px 0' }}>
            {filteredResponses.map(({ item, index }) => (
              <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--card2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span className="badge">{index + 1}</span>
                  <input
                    className="form-input"
                    value={item.trigger}
                    onChange={event => updateResponse(item.id, 'trigger', event.target.value)}
                    maxLength={64}
                    aria-label={`كلمة تفعيل الرد ${index + 1}`}
                    placeholder="كلمة أو عبارة التفعيل"
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
                </div>
                <textarea
                  className="form-textarea"
                  value={item.response}
                  onChange={event => updateResponse(item.id, 'response', event.target.value)}
                  maxLength={400}
                  rows={2}
                  aria-label={`نص الرد على ${item.trigger}`}
                  placeholder="اكتب الرد باللهجة العراقية..."
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
