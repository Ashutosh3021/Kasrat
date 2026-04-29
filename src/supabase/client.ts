import { createClient } from '@supabase/supabase-js'

// Vite replaces import.meta.env.* at BUILD TIME with the literal value, or
// the string "undefined" when the variable was not set. The ?? operator does
// NOT help here because "undefined" (string) is truthy. This helper handles
// both JS undefined and the string "undefined" produced by Vite.
const env = (value?: string) =>
  value && value !== 'undefined' ? value : undefined

const supabaseUrl =
  env(import.meta.env.VITE_SUPABASE_URL) ??
  'https://placeholder.supabase.co'

const supabaseAnonKey =
  env(import.meta.env.VITE_SUPABASE_ANON_KEY) ??
  'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SupabaseClient = typeof supabase
