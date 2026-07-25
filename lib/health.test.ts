import { describe, expect, it } from 'vitest';
import { average, dateKey, emptyDay, loadHealthStore, periodRecords, sampleStore, totals } from './health';

describe('health domain', () => {
  it('食事のカロリーとPFCを集計する', () => {
    const meals = sampleStore.records[Object.keys(sampleStore.records)[0]].meals;
    expect(totals(meals)).toEqual({ kcal: 1450, protein: 96, fat: 46, carbs: 156 });
  });
  it('空の食事を0として扱う', () => expect(totals([])).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 }));
  it('空の日次記録を作る', () => expect(emptyDay('2026-01-01')).toMatchObject({ date: '2026-01-01', meals: [], exercises: [], weight: null }));
  it('平均値では未記録を除く', () => expect(average([1, null, 3])).toBe(2));
  it('値がない平均は0', () => expect(average([null])).toBe(0));
  it('ローカル日付キーを生成する', () => expect(dateKey(new Date('2026-07-24T12:00:00Z'))).toMatch(/^2026-07-24$/));
});

describe('periodRecords', () => {
  it.each([['日', 1], ['週', 7], ['月', 30], ['3か月', 90], ['年', 365]] as const)('%sレポート用の日数を返す', (period, length) => {
    expect(periodRecords(sampleStore, dateKey(), period)).toHaveLength(length);
  });
  it('記録がない日を空データで補完する', () => {
    expect(periodRecords({ ...sampleStore, records: {} }, '2026-01-01', '日')[0]).toEqual(emptyDay('2026-01-01'));
  });
});

describe('loadHealthStore', () => {
  it('保存値がない場合はサンプルデータを返す', () => expect(loadHealthStore(null)).toBe(sampleStore));
  it('壊れたJSONは安全にフォールバックする', () => expect(loadHealthStore('{')).toBe(sampleStore));
  it('古いバージョンを受け入れない', () => expect(loadHealthStore('{"version":1}')).toBe(sampleStore));
  it('異常な数値を含むデータを受け入れない', () => {
    const invalid = structuredClone(sampleStore); const key = Object.keys(invalid.records)[0]; invalid.records[key].steps = -1;
    expect(loadHealthStore(JSON.stringify(invalid))).toBe(sampleStore);
  });
  it('有効な保存値を復元する', () => expect(loadHealthStore(JSON.stringify(sampleStore))).toEqual(sampleStore));
});
