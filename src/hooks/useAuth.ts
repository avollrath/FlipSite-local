import type { ReactNode } from 'react'

const localUser = { id: 'local', email: '' }

export function AuthProvider({ children }: { children: ReactNode }) {
  return children
}

export function useAuth() {
  return {
    user: localUser,
    isDemoMode: false,
    loading: false,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
  }
}
