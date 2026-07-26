import { NextRequest } from 'next/server';
import { normalizePublicEnv } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const upstream = normalizePublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
const blockedRequestHeaders = new Set(['connection', 'content-length', 'cookie', 'host', 'origin', 'referer', 'transfer-encoding']);
const blockedResponseHeaders = new Set(['connection', 'content-encoding', 'content-length', 'set-cookie', 'transfer-encoding']);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!upstream) return Response.json({ message: 'Supabase URL is not configured.' }, { status: 503 });

  const { path } = await context.params;
  const target = new URL(`${upstream}/${path.join('/')}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  request.headers.forEach((value, name) => {
    if (!blockedRequestHeaders.has(name)) headers.set(name, value);
  });

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'follow',
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    response.headers.forEach((value, name) => {
      if (!blockedResponseHeaders.has(name)) responseHeaders.set(name, value);
    });
    responseHeaders.set('x-health-cloud-proxy', 'supabase');
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
