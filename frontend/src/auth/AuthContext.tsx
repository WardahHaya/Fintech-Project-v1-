import {
  createContext,
  startTransition,
  useEffect,
  useState,
} from 'react'

import {
  fetchCurrentUser,
  loginRequest,
  setApiAuthToken,
  setApiUnauthorizedHandler,
} from '../lib/api'
import type { AppAccessRole, LoginResponse, UserProfile } from '../types'


const AUTH_STORAGE_KEY = 'tiqmo-auth-token'


interface AuthContextValue {
  token: string | null
  user: UserProfile | null
  role: AppAccessRole | null
  fullName: string
  isAuthenticated: boolean
  isHydrating: boolean
  login: (
    email: string,
    password: string,
    options?: { requireAdmin?: boolean },
  ) => Promise<LoginResponse>
  logout: () => void
}


const AuthContext = createContext<AuthContextValue | null>(null)


function readStoredToken() {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(AUTH_STORAGE_KEY)
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isHydrating, setIsHydrating] = useState(Boolean(readStoredToken()))

  function clearSession() {
    setToken(null)
    setUser(null)
    setIsHydrating(false)
    setApiAuthToken(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      startTransition(() => {
        clearSession()
      })
    })

    return () => {
      setApiUnauthorizedHandler(null)
    }
  }, [])

  useEffect(() => {
    if (token) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    setApiAuthToken(token)
  }, [token])

  useEffect(() => {
    let active = true

    async function hydrate() {
      if (!token) {
        if (!active) {
          return
        }
        setUser(null)
        setIsHydrating(false)
        return
      }

      if (!active) {
        return
      }

      setIsHydrating(true)
      try {
        const profile = await fetchCurrentUser()
        if (!active) {
          return
        }
        setUser(profile)
      } catch {
        if (!active) {
          return
        }
        clearSession()
      } finally {
        if (active) {
          setIsHydrating(false)
        }
      }
    }

    void hydrate()

    return () => {
      active = false
    }
  }, [token])

  async function login(
    email: string,
    password: string,
    options?: { requireAdmin?: boolean },
  ) {
    const response = await loginRequest(email, password)
    if (options?.requireAdmin && response.role !== 'admin') {
      throw new Error('NOT_ADMIN')
    }
    setIsHydrating(true)
    setToken(response.access_token)
    return response
  }

  function logout() {
    clearSession()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login')
    }
  }

  const value: AuthContextValue = {
    token,
    user,
    role: user?.role ?? null,
    fullName: user?.full_name ?? '',
    isAuthenticated: Boolean(token && user),
    isHydrating,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
