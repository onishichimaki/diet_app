import { extractGeminiJson, parseNutritionEstimate, validateNutritionRequest } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

function allowRequest(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

export async function GET() {
  return Response.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowRequest(ip)) return Response.json({ error: 'AI補完の利用回数が多すぎます。1分後に再試行してください。' }, { status: 429 });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: 'Gemini APIが設定されていません。' }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: '入力形式が正しくありません。' }, { status: 400 }); }
  const input = validateNutritionRequest(body);
  if (!input) return Response.json({ error: '料理名または材料、人数を確認してください。' }, { status: 400 });

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const apiBaseUrl = (process.env.GEMINI_API_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const prompt = `あなたは管理栄養士を補助する栄養計算システムです。以下の料理について、レシピ全体ではなく1人分の推定値を返してください。曖昧な場合は一般的な日本の家庭料理の量を仮定し、医療的助言はしないでください。\n料理名: ${input.name || '未入力'}\n材料・分量: ${input.ingredients || '詳細なし'}\nレシピの人数: ${input.servings}人分`;

  try {
    const response = await fetch(`${apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            required: ['name', 'kcal', 'protein', 'fat', 'carbs', 'confidence', 'note'],
            properties: {
              name: { type: 'STRING' }, kcal: { type: 'NUMBER' }, protein: { type: 'NUMBER' }, fat: { type: 'NUMBER' }, carbs: { type: 'NUMBER' },
              confidence: { type: 'STRING', enum: ['高', '中', '低'] }, note: { type: 'STRING' },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: { message?: string } }).error?.message || 'Gemini APIエラー')
        : 'Gemini APIから応答を取得できませんでした。';
      return Response.json({ error: message }, { status: response.status });
    }
    const estimate = parseNutritionEstimate(extractGeminiJson(payload));
    if (!estimate) return Response.json({ error: 'AIの回答を栄養情報として読み取れませんでした。' }, { status: 502 });
    return Response.json({ estimate });
  } catch (error) {
    console.error('Gemini nutrition request failed', error);
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json({ error: timedOut ? 'AIの応答がタイムアウトしました。' : 'Gemini APIへ接続できませんでした。' }, { status: 502 });
  }
}
