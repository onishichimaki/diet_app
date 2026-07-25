import { NextRequest } from 'next/server';
import { normalizePublicEnv } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const upstream = normalizePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
const forwardedRequestHeaders = ['accept', 'accept-language', 'apikey', 'authorization', 'content-type', 'prefer', 'range', 'x-client-info'];
const forwardedResponseHeaders = ['cache-control', 'content-language', 'content-range', 'content-type', 'expires', 'location', 'preference-applied', 'retry-after', 'vary', 'www-authenticate', 'x-ratelimit-limit', 'x-ratelimit-remaining'];

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!upstream) return Response.json({ message: 'Supabase URL is not configured.' }, { status: 503 });

  const { path } = await context.params;
  const target = new URL(`${upstream}/${path.join('/')}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    for (const name of forwardedResponseHeaders) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upstream error';
    return Response.json({ message: 'Supabaseへの接続に失敗しました。', detail }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
