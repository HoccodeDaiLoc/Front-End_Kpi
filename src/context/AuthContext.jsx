import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kpi_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('kpi_token')
    const cachedUser = localStorage.getItem('kpi_user')

    if (!token) {
      setLoading(false)
      return
    }

    if (cachedUser) {
      // Đã có user cached, dùng luôn không gọi API
      setLoading(false)
      return
    }

    // Chỉ gọi API khi có token nhưng chưa có user cached
    authAPI.getProfile()
      .then(res => { setUser(res.data); localStorage.setItem('kpi_user', JSON.stringify(res.data)) })
      .catch(() => { localStorage.removeItem('kpi_token'); localStorage.removeItem('kpi_user'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    localStorage.setItem('kpi_token', res.data.token)
    localStorage.setItem('kpi_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('kpi_token')
    localStorage.removeItem('kpi_user')
    setUser(null)
  }

  const refreshUser = async () => {
    const res = await authAPI.getProfile()
    setUser(res.data)
    localStorage.setItem('kpi_user', JSON.stringify(res.data))
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)