/**
 * User-scoped localStorage helpers for NexPOS.
 *
 * Keys are namespaced by the authenticated user's email so that two
 * different stores sharing the same browser never see each other's data.
 *
 * Format:  nexpos_<slug>_<base>
 *          e.g.  nexpos_cafe-test-com_products
 *
 * Migration: if the namespaced key is absent but the legacy key (nexpos_<base>)
 * exists, the data is migrated silently on first read.
 *
 * All helpers are safe to call during SSR — they return null / no-op when
 * localStorage is unavailable.
 */

/** Read the current user's email slug from nexpos_user. */
function getCurrentUserSlug(): string {
  try {
    const stored = localStorage.getItem('nexpos_user')
    if (!stored) return ''
    const user = JSON.parse(stored) as Record<string, unknown>
    const email = String(user?.email ?? '').toLowerCase()
    // Sanitise: collapse runs of non-alphanumeric chars to a single dash
    return email.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  } catch {
    return ''
  }
}

/**
 * Returns the namespaced localStorage key for the current user.
 * Falls back to the legacy key (nexpos_<base>) when no user is found.
 */
export function userKey(base: string): string {
  const slug = getCurrentUserSlug()
  return slug ? `nexpos_${slug}_${base}` : `nexpos_${base}`
}

/**
 * Read a string value from namespaced localStorage.
 * Automatically migrates from the legacy key on first access for a new namespace.
 */
export function readUserStorage(base: string): string | null {
  try {
    const slug = getCurrentUserSlug()
    if (!slug) return localStorage.getItem(`nexpos_${base}`)

    const nk = `nexpos_${slug}_${base}`
    const namespaced = localStorage.getItem(nk)
    if (namespaced !== null) return namespaced

    // Migration: copy from legacy un-namespaced key to this user's namespace
    const legacy = localStorage.getItem(`nexpos_${base}`)
    if (legacy !== null) {
      try { localStorage.setItem(nk, legacy) } catch {}
      return legacy
    }

    return null
  } catch {
    return null
  }
}

/** Write a string value to namespaced localStorage. */
export function writeUserStorage(base: string, value: string): void {
  try { localStorage.setItem(userKey(base), value) } catch {}
}

/** Remove a key from namespaced localStorage. */
export function removeUserStorage(base: string): void {
  try { localStorage.removeItem(userKey(base)) } catch {}
}
