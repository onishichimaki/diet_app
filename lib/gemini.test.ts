import { describe, expect, it } from 'vitest';
import { extractGeminiJson, parseNutritionEstimate, validateNutritionRequest } from './gemini';

describe('Gemini nutrition helpers', () => {
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
});
