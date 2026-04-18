import { createContext, useContext, useEffect, useState, ReactNode, createElement } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

// ── Context ───────────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true })

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true })

  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, session: data.session, loading: false })
    })

    // Écoute les changements (login / logout / refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return createElement(AuthContext.Provider, { value: state }, children)
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export async function sendOtp(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  return { error: error?.message ?? null }
}

export async function verifyOtp(email: string, token: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  return { error: error?.message ?? null }
}

export async function signOut() {
  await supabase.auth.signOut()
}
