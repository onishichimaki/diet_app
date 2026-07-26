import { describe, expect, it } from 'vitest';
import { average, dateKey, emptyDay, loadHealthStore, mergeHealthStores, parseHealthImport, periodRecords, sampleStore, totals } from './health';

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
  it('version 2データをお気に入り付きversion 3へ移行する', () => {
    const legacy = { ...sampleStore, version: 2 }; delete (legacy as Partial<typeof sampleStore>).favorites;
    expect(loadHealthStore(JSON.stringify(legacy))).toMatchObject({ version: 3, favorites: [] });
  });
});

describe('cloud conflict merge', () => {
  it('日付ごとに更新時刻が新しい記録を採用する', () => {
    const date = Object.keys(sampleStore.records)[0];
    const local = structuredClone(sampleStore); const cloud = structuredClone(sampleStore);
    local.records[date] = { ...local.records[date], steps: 100, modifiedAt: '2026-01-02T00:00:00Z' };
    cloud.records[date] = { ...cloud.records[date], steps: 200, modifiedAt: '2026-01-01T00:00:00Z' };
    expect(mergeHealthStores(local, cloud).records[date].steps).toBe(100);
  });
});

describe('health data import', () => {
  it('Health Connect互換JSONを読み込む', () => expect(parseHealthImport('[{"date":"2026-01-01","steps":8000}]')).toEqual([{ date: '2026-01-01', steps: 8000 }]));
  it('Apple Health XMLから体重・歩数・睡眠を集計する', () => {
    const xml = '<HealthData><Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-01-01 08:00:00 +0900" value="61.2"/><Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-01-01 09:00:00 +0900" value="1200"/><Record type="HKCategoryTypeIdentifierSleepAnalysis" startDate="2026-01-01T00:00:00Z" endDate="2026-01-01T07:00:00Z" value="HKCategoryValueSleepAnalysisAsleep"/></HealthData>';
    expect(parseHealthImport(xml)[0]).toMatchObject({ date: '2026-01-01', weight: 61.2, steps: 1200, sleep: 7 });
  });
});
