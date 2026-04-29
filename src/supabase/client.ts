import { createClient } from '@supabase/supabase-js'

// Vite replaces import.meta.env.* at BUILD TIME with the literal value, or
// the string "undefined" when the variable was not set. The ?? operator does
// NOT help here because "undefined" (string) is truthy.
const env = (value?: string) =>
  value && value !== 'undefined' ? value : undefined

const supabaseUrl =
  env(import.meta.env.VITE_SUPABASE_URL) ??
  'https://placeholder.supabase.co'

const supabaseAnonKey =
  env(import.meta.env.VITE_SUPABASE_ANON_KEY) ??
  'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Required for hash-router (createHashRouter) + GitHub Pages:
    // Supabase appends tokens to the URL fragment. With a hash router the
    // fragment is also used for routing, so we must tell Supabase to parse
    // the session from the URL on every page load.
    detectSessionInUrl: true,
    // 'implicit' flow returns tokens in the URL hash — compatible with
    // GitHub Pages static hosting (no server-side callback needed).
    flowType: 'implicit',
    persistSession: true,
  },
})

export type SupabaseClient = typeof supabase
