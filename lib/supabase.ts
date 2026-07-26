import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export const normalizePublicEnv = (value: string | undefined) => {
  if (!value) return '';
  const unwrapped = value.trim().replace(/^['"]|['"]$/g, '');
  return unwrapped.includes('=') ? unwrapped.slice(unwrapped.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : unwrapped;
};

const supabaseUrl = normalizePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
const supabaseKey = normalizePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabaseConfigured = Boolean(
  supabaseUrl && supabaseKey,
);

export const supabaseHost = (() => {
  try { return new URL(supabaseUrl).host; } catch { return ''; }
})();

export function getSupabaseClient() {
  if (client !== undefined) return client;
  client = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
  return client;
}
