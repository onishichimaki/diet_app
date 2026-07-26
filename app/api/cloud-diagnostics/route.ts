import { normalizePublicEnv } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = normalizePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
  const publishable = normalizePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const legacy = normalizePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const key = publishable || legacy;
  const keySource = publishable ? 'publishable' : legacy ? 'legacy-anon' : 'missing';

  if (!url || !key) {
    return Response.json({ ok: false, stage: 'configuration', urlConfigured: Boolean(url), keySource }, { status: 503 });
  }

  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    return Response.json({ ok: false, stage: 'configuration', reason: 'invalid-url', keySource }, { status: 503 });
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    const text = await response.text();
    return Response.json({
      ok: response.ok,
      stage: 'supabase-auth',
      host,
      keySource,
      keyFormat: key.startsWith('sb_publishable_') ? 'publishable' : key.startsWith('eyJ') ? 'legacy-jwt' : 'unknown',
      keyLength: key.length,
      upstreamStatus: response.status,
      upstreamMessage: response.ok ? 'Supabase Auth is reachable.' : text.slice(0, 300),
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return Response.json({
      ok: false,
      stage: 'network',
      host,
      keySource,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 502 });
  }
}
