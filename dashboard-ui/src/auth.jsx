import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

const API = '/api'

// ─── API Helper ───────────────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      window.location.href = '/'
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('[Dashboard] API request failed:', err)
    return { success: false, error: 'تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مجدداً.' }
  }
}

// ─── Auth Provider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [guilds, setGuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const authRequestId = useRef(0)

  const loadUser = useCallback(async () => {
    const requestId = ++authRequestId.current
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setGuilds([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (requestId !== authRequestId.current || token !== localStorage.getItem('token')) return

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        setUser(null)
        setGuilds([])
        setLoading(false)
        return
      }
      const data = await res.json()
      if (requestId !== authRequestId.current || token !== localStorage.getItem('token')) return

      if (data?.success) {
        setUser(data.user)
        setGuilds(data.guilds || [])
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        setUser(null)
        setGuilds([])
      }
    } catch (e) {
      if (requestId === authRequestId.current) {
        console.error('[Dashboard] Could not verify the current session:', e.message)
      }
    } finally {
      if (requestId === authRequestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Read OAuth credentials from the fragment so they are not sent in HTTP requests.
    const params = new URLSearchParams(window.location.hash.slice(1))
    const urlToken = params.get('token')
    const urlRole = params.get('role')
    const urlError = params.get('error')

    if (urlToken) {
      console.log('[Auth] Got token from URL, saving to localStorage...')
      localStorage.setItem('token', urlToken)
      if (urlRole) localStorage.setItem('role', urlRole)
      // حذف التوكن من الرابط قبل تحميل المستخدم
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (urlError) {
      console.error('[Auth] OAuth error from URL:', urlError)
      localStorage.setItem('authError', urlError)
      window.history.replaceState({}, '', window.location.pathname)
    }

    loadUser()
  }, [loadUser])

  const login = useCallback((token, role) => {
    localStorage.setItem('token', token)
    if (role) localStorage.setItem('role', role)
    loadUser()
  }, [loadUser])

  const logout = useCallback(() => {
    authRequestId.current += 1
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setUser(null)
    setGuilds([])
    setLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, guilds, loading, login, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
