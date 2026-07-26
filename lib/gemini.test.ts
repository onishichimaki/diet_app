import { describe, expect, it } from 'vitest';
import { extractGeminiJson, parseNutritionEstimate, selectGeminiModel, splitMealNames, validateNutritionRequest } from './gemini';

describe('Gemini nutrition helpers', () => {
  it('読点・カンマ・改行で複数食品を分割する', () => {
    expect(splitMealNames('カレー、ヨーグルト, サラダ\nりんご')).toEqual(['カレー', 'ヨーグルト', 'サラダ', 'りんご']);
  });
  it('栄養推定リクエストを検証する', () => {
    expect(validateNutritionRequest({ name: '親子丼', ingredients: '鶏肉 100g', servings: 2 })).toEqual({ name: '親子丼', ingredients: '鶏肉 100g', servings: 2 });
    expect(validateNutritionRequest({ name: '', ingredients: '', servings: 1 })).toBeNull();
    expect(validateNutritionRequest({ name: '料理', ingredients: '', servings: 0 })).toBeNull();
  });

  it('GeminiのJSON回答を抽出・検証する', () => {
    const estimate = { name: '親子丼', kcal: 620.04, protein: 28.02, fat: 18, carbs: 82, confidence: '中', note: '一般的な1人分です。' };
    const extracted = extractGeminiJson({ candidates: [{ content: { parts: [{ text: JSON.stringify(estimate) }] } }] });
    expect(parseNutritionEstimate(extracted)).toEqual({ ...estimate, kcal: 620, protein: 28 });
  });

  it('異常値や壊れた回答を拒否する', () => {
    expect(extractGeminiJson({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })).toBeNull();
    expect(parseNutritionEstimate({ name: '料理', kcal: -1, protein: 1, fat: 1, carbs: 1, confidence: '高', note: '' })).toBeNull();
  });

  it('利用可能モデルからGemini 3 Flashを選択する', () => {
    const payload = { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3-flash-preview', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
    ] };
    expect(selectGeminiModel(payload, 'gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(selectGeminiModel(payload, 'missing-model')).toBe('gemini-3-flash-preview');
  });
});
