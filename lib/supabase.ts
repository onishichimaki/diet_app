import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;
const projectUrl = 'https://wpufsuukptuswzvsfemg.supabase.co';

export const normalizePublicEnv = (value: string | undefined) => {
  if (!value) return '';
  const unwrapped = value.trim().replace(/^['"]|['"]$/g, '');
  return unwrapped.includes('=') ? unwrapped.slice(unwrapped.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : unwrapped;
};

export const resolveSupabaseUrl = (value: string | undefined) => {
  const normalized = normalizePublicEnv(value).replace(/\/+$/, '');
  if (!normalized || /x{4,}\.supabase\.co/i.test(normalized)) return projectUrl;
  return normalized;
};

const supabaseUrl = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
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
