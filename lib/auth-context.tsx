'use client'

/**
 * NexPOS — Auth Context
 *
 * Provides user session state across the entire app.
 * Session is persisted in localStorage and a browser cookie.
 * The cookie is read by middleware.ts to protect dashboard routes server-side.
 *
 * Migration path to Supabase:
 *   - Replace the login() body with supabase.auth.signInWithPassword()
 *   - Replace the logout() body with supabase.auth.signOut()
 *   - Replace the useEffect restore with supabase.auth.getSession()
 *   - Everything else (context shape, AuthUser type) stays the same.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { validateCredentials } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'

// ── Cookie helpers ──────────────────────────────────────────────────────────
// The cookie must be readable by middleware (not httpOnly), so we use
// document.cookie. SameSite=Lax prevents CSRF while allowing navigation.

const AUTH_COOKIE  = 'nexpos_auth'
const STORAGE_KEY  = 'nexpos_user'
const COOKIE_TTL   = 60 * 60 * 24 * 7 // 7 days in seconds

function writeCookie(email: string) {
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${COOKIE_TTL}; SameSite=Lax`
}

function clearCookie() {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
}

// ── Context shape ───────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  /** Validates credentials and sets the session. */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  /** Clears the session and redirects to /login. */
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Restore session from localStorage on first mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // Corrupted storage — silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    // Simulate a network round-trip (remove for Supabase — it has its own latency)
    await new Promise(r => setTimeout(r, 700))

    // --- Supabase migration point ---
    // Replace the two lines below with:
    //   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    //   if (error) return { ok: false, error: error.message }
    //   const authUser = buildAuthUserFromSupabase(data.user)
    const authUser = validateCredentials(email, password)
    if (!authUser) return { ok: false, error: 'Invalid email or password.' }
    // --------------------------------

    setUser(authUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
    writeCookie(authUser.email)

    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    // --- Supabase migration point ---
    // Add: await supabase.auth.signOut()
    // --------------------------------
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    clearCookie()
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
