import { createClient } from '@supabase/supabase-js'

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
    detectSessionInUrl: true,   // reads access_token from hash on return
    persistSession: true,
    storageKey: 'kasrat-auth',
    // 'implicit' flow means Supabase returns the token directly in the URL
    // hash on redirect, which pairs correctly with HashRouter + GitHub Pages.
    // 'pkce' (the newer default) uses a code exchange step that requires a
    // server round-trip and can cause history API conflicts with HashRouter.
    flowType: 'implicit',
  },
})

export type SupabaseClient = typeof supabase
