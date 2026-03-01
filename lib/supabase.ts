import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Returns undefined if env vars are not set (for demo mode)
export function createClient() {
  if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const isDemoMode = !supabaseUrl || supabaseUrl === 'your_supabase_project_url'
