import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '@/lib/api'
import { isDemoModeEmail } from '@/lib/demoMode'

export type LocalUser = {
  id: string
  email: string
  created_at?: string
}

type AuthContextValue = {
  user: LocalUser | null
  isDemoMode: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    apiFetch<{ user: LocalUser | null }>('/auth/session')
      .then(({ user: sessionUser }) => {
        if (mounted) {
          setUser(sessionUser)
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isDemoMode: isDemoModeEmail(user?.email),
      loading,
      async signIn(email, password) {
        const response = await apiFetch<{ user: LocalUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setUser(response.user)
      },
      async signUp(email, password) {
        const response = await apiFetch<{ user: LocalUser }>('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setUser(response.user)
      },
      async signOut() {
        await apiFetch<void>('/auth/logout', { method: 'POST' })
        setUser(null)
      },
    }),
    [loading, user],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
