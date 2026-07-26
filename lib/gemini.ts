export type NutritionEstimate = {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  confidence: '高' | '中' | '低';
  note: string;
};

export type NutritionRequest = {
  name: string;
  ingredients: string;
  servings: number;
};

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

type GeminiModelList = { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };

export const normalizeGeminiModel = (name: string) => name.trim().replace(/^models\//, '');

export function selectGeminiModel(payload: unknown, preferred = DEFAULT_GEMINI_MODEL) {
  const models = payload && typeof payload === 'object' ? (payload as GeminiModelList).models : undefined;
  const available = (models ?? [])
    .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
    .map(model => normalizeGeminiModel(model.name ?? ''))
    .filter(name => name.startsWith('gemini-') && !/(image|vision|tts|embedding)/i.test(name));
  const normalizedPreferred = normalizeGeminiModel(preferred);
  if (available.includes(normalizedPreferred)) return normalizedPreferred;
  const priorities = ['gemini-3-flash-preview', 'gemini-3-flash'];
  for (const name of priorities) if (available.includes(name)) return name;
  return available.filter(name => /flash/i.test(name)).sort().reverse()[0]
    ?? available.sort().reverse()[0]
    ?? normalizedPreferred;
}

const finiteInRange = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;

export function validateNutritionRequest(value: unknown): NutritionRequest | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<NutritionRequest>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const ingredients = typeof input.ingredients === 'string' ? input.ingredients.trim() : '';
  const servings = typeof input.servings === 'number' ? input.servings : Number(input.servings);
  if ((!name && !ingredients) || name.length > 100 || ingredients.length > 2_000 || !Number.isFinite(servings) || servings < 0.1 || servings > 100) return null;
  return { name, ingredients, servings };
}

export function parseNutritionEstimate(value: unknown): NutritionEstimate | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<NutritionEstimate>;
  if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100) return null;
  if (!finiteInRange(item.kcal, 20_000) || !finiteInRange(item.protein, 2_000) || !finiteInRange(item.fat, 2_000) || !finiteInRange(item.carbs, 2_000)) return null;
  if (!['高', '中', '低'].includes(item.confidence ?? '')) return null;
  if (typeof item.note !== 'string' || item.note.length > 300) return null;
  return {
    name: item.name.trim(),
    kcal: Math.round(item.kcal * 10) / 10,
    protein: Math.round(item.protein * 10) / 10,
    fat: Math.round(item.fat * 10) / 10,
    carbs: Math.round(item.carbs * 10) / 10,
    confidence: item.confidence as NutritionEstimate['confidence'],
    note: item.note.trim(),
  };
}

export function extractGeminiJson(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
  const text = candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim();
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/^```json\s*/i, '').replace(/\s*```$/, ''));
  } catch {
    return null;
  }
}
