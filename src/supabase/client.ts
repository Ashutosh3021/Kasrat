import { createClient } from '@supabase/supabase-js'

// Vite replaces import.meta.env.* at BUILD TIME with the literal value, or
// the string "undefined" when the variable was not set.
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
    // detectSessionInUrl: Supabase reads access_token from the URL on load.
    detectSessionInUrl: true,
    // persistSession: keeps the user logged in across page refreshes.
    persistSession: true,
    // storageKey: namespaced so multiple Supabase projects don't collide.
    storageKey: 'kasrat-auth',
  },
})

export type SupabaseClient = typeof supabase
