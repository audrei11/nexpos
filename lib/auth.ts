/**
 * NexPOS — Auth data layer
 *
 * Hardcoded multi-store credentials for demo/testing.
 *
 * Migration path to Supabase:
 *   1. Keep AuthUser interface and store configs as-is.
 *   2. Replace validateCredentials() body with:
 *      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
 *      Then fetch store config from a `stores` table using data.user.id.
 */

export interface AuthUser {
  email: string
  name: string
  storeName: string
  storeEmoji: string
  role: 'owner' | 'admin' | 'staff'
  /** Per-store Apps Script Web App URL. Falls back to env var if empty. */
  googleScriptUrl: string
}

interface StoreConfig {
  name: string
  emoji: string
  role: 'owner' | 'admin' | 'staff'
  /**
   * Each store can have its own Google Apps Script deployment.
   * Leave empty to use NEXT_PUBLIC_GOOGLE_SHEETS_SCRIPT_URL from .env.local.
   */
  googleScriptUrl: string
}

// ── Store configurations ────────────────────────────────────────────────────
// To add a store: add an entry here and in CREDENTIALS below.
const SHARED_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzX17HURZDCTyLyTN7q7-mDKclYkZfRAuILrphqovGq9_jqXzdnnNWsEseWaEpMCZW9-w/exec'

const STORE_CONFIGS: Record<string, StoreConfig> = {
  'cafe@test.com': {
    name: 'Café Store',
    emoji: '☕',
    role: 'owner',
    googleScriptUrl: SHARED_SCRIPT_URL,
  },
  'elec@test.com': {
    name: 'Electronics Store',
    emoji: '⚡',
    role: 'owner',
    googleScriptUrl: SHARED_SCRIPT_URL,
  },
  'cloth@test.com': {
    name: 'Clothing Store',
    emoji: '👕',
    role: 'owner',
    googleScriptUrl: SHARED_SCRIPT_URL,
  },
}

// ── Hardcoded credentials ───────────────────────────────────────────────────
// To migrate to Supabase: remove this map and replace validateCredentials().
const CREDENTIALS: Record<string, string> = {
  'cafe@test.com':  '963!',
  'elec@test.com':  '485#',
  'cloth@test.com': '739@',
}

/**
 * Validates email + password against the hardcoded credential store.
 * Returns an AuthUser on success, or null on failure.
 *
 * Replace this function body to migrate to Supabase Auth or any other provider.
 */
export function validateCredentials(email: string, password: string): AuthUser | null {
  const lower = email.toLowerCase().trim()

  if (CREDENTIALS[lower] !== password) return null

  const store = STORE_CONFIGS[lower]
  if (!store) return null

  const namePart = lower.split('@')[0]
  const name = namePart.charAt(0).toUpperCase() + namePart.slice(1)

  return {
    email: lower,
    name,
    storeName: store.name,
    storeEmoji: store.emoji,
    role: store.role,
    googleScriptUrl: store.googleScriptUrl,
  }
}

/** All configured stores — used for the login hint panel. */
export const STORE_HINTS = Object.entries(STORE_CONFIGS).map(([email, cfg]) => ({
  email,
  password: CREDENTIALS[email],
  name: cfg.name,
  emoji: cfg.emoji,
}))
