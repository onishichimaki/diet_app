export const MEAL_TYPES = ['朝食', '昼食', '夕食', '間食'] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export type Meal = { id: string; type: MealType; name: string; kcal: number; protein: number; fat: number; carbs: number; quantity?: number; unit?: string; time?: string; note?: string };
export type Exercise = { id: string; name: string; minutes: number; kcal: number };
export type DayRecord = { date: string; meals: Meal[]; weight: number | null; steps: number; distance: number; exercises: Exercise[]; sleep: number | null; modifiedAt?: string };
export type Goals = { kcal: number; weight: number; steps: number; sleep: number };
export type HealthStore = { version: 3; records: Record<string, DayRecord>; goals: Goals; sample: boolean; favorites: Meal[] };
export type Nutrients = { kcal: number; protein: number; fat: number; carbs: number };

export const storageKey = 'health-pocket-data-v2';
export const defaultGoals: Goals = { kcal: 2000, weight: 60, steps: 8000, sleep: 8 };
export const dateKey = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
export const emptyDay = (date: string): DayRecord => ({ date, meals: [], weight: null, steps: 0, distance: 0, exercises: [], sleep: null });
export const totals = (meals: Meal[]): Nutrients => meals.reduce((sum, meal) => ({ kcal: sum.kcal + meal.kcal, protein: sum.protein + meal.protein, fat: sum.fat + meal.fat, carbs: sum.carbs + meal.carbs }), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
export const exerciseMinutes = (day: DayRecord) => day.exercises.reduce((sum, item) => sum + item.minutes, 0);

const shiftDate = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return dateKey(date); };
const sampleDay = (date: string, index: number): DayRecord => ({
  date,
  meals: [
    { id: `${date}-b`, type: '朝食', name: 'ヨーグルトとベリー', kcal: 280, protein: 16, fat: 8, carbs: 36 },
    { id: `${date}-l`, type: '昼食', name: 'チキンサラダボウル', kcal: 520 + index * 8, protein: 38, fat: 18, carbs: 48 },
    { id: `${date}-d`, type: '夕食', name: '鮭と玄米のプレート', kcal: 650, protein: 42, fat: 20, carbs: 72 },
  ],
  weight: Number((62.8 - index * 0.08).toFixed(1)), steps: 6200 + index * 310, distance: Number((4.2 + index * .25).toFixed(1)),
  exercises: [{ id: `${date}-e`, name: index % 2 ? 'ウォーキング' : 'ストレッチ', minutes: 20 + index * 2, kcal: 90 + index * 5 }], sleep: Number((6.7 + (index % 4) * .3).toFixed(1)),
});
export const sampleStore: HealthStore = { version: 3, goals: defaultGoals, sample: true, favorites: [], records: Object.fromEntries(Array.from({ length: 35 }, (_, index) => { const date = shiftDate(index - 34); return [date, sampleDay(date, index)]; })) };

const finite = (value: unknown, min = 0, max = 100_000): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const validMeal = (value: unknown): value is Meal => { if (!value || typeof value !== 'object') return false; const m = value as Partial<Meal>; return typeof m.id === 'string' && MEAL_TYPES.includes(m.type as MealType) && typeof m.name === 'string' && m.name.trim().length > 0 && finite(m.kcal, 0, 20_000) && finite(m.protein, 0, 2_000) && finite(m.fat, 0, 2_000) && finite(m.carbs, 0, 2_000) && (m.quantity === undefined || finite(m.quantity, 0.01, 10000)) && (m.unit === undefined || typeof m.unit === 'string') && (m.time === undefined || typeof m.time === 'string') && (m.note === undefined || typeof m.note === 'string'); };
const validExercise = (value: unknown): value is Exercise => { if (!value || typeof value !== 'object') return false; const e = value as Partial<Exercise>; return typeof e.id === 'string' && typeof e.name === 'string' && e.name.trim().length > 0 && finite(e.minutes, 0, 1_440) && finite(e.kcal, 0, 20_000); };
const validDay = (value: unknown): value is DayRecord => { if (!value || typeof value !== 'object') return false; const d = value as Partial<DayRecord>; return typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Array.isArray(d.meals) && d.meals.every(validMeal) && (d.weight === null || finite(d.weight, 1, 500)) && finite(d.steps, 0, 200_000) && finite(d.distance, 0, 1_000) && Array.isArray(d.exercises) && d.exercises.every(validExercise) && (d.sleep === null || finite(d.sleep, 0, 24)); };
const validGoals = (value: unknown): value is Goals => { if (!value || typeof value !== 'object') return false; const g = value as Partial<Goals>; return finite(g.kcal, 500, 10_000) && finite(g.weight, 1, 500) && finite(g.steps, 0, 200_000) && finite(g.sleep, 1, 24); };
export const loadHealthStore = (raw: string | null): HealthStore => { if (!raw) return sampleStore; try { const value: unknown = JSON.parse(raw); if (!value || typeof value !== 'object') return sampleStore; const store = value as Partial<HealthStore> & { version?: number }; if (![2, 3].includes(store.version ?? 0) || !validGoals(store.goals) || !store.records || typeof store.records !== 'object') return sampleStore; const records = Object.values(store.records); if (!records.every(validDay)) return sampleStore; const favorites = Array.isArray(store.favorites) && store.favorites.every(validMeal) ? store.favorites : []; return { ...(store as Omit<HealthStore, 'version' | 'favorites'>), version: 3, favorites }; } catch { return sampleStore; } };

export const mergeHealthStores = (local: HealthStore, cloud: HealthStore): HealthStore => {
  const records = { ...local.records };
  for (const [date, remote] of Object.entries(cloud.records)) {
    const current = records[date];
    if (!current || (remote.modifiedAt ?? '') >= (current.modifiedAt ?? '')) records[date] = remote;
  }
  const favorites = [...local.favorites, ...cloud.favorites].filter((meal, index, all) => all.findIndex(item => item.name === meal.name && item.type === meal.type) === index);
  return { ...cloud, version: 3, records, favorites, sample: local.sample && cloud.sample };
};

export type HealthImport = { date: string; weight?: number; steps?: number; distance?: number; sleep?: number };
export const parseHealthImport = (text: string): HealthImport[] => {
  try {
    const value = JSON.parse(text) as HealthImport[] | { records?: HealthImport[] };
    const records = Array.isArray(value) ? value : value.records;
    if (Array.isArray(records)) return records.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  } catch { /* Apple Health XML is handled below. */ }
  const grouped: Record<string, HealthImport> = {};
  for (const match of text.matchAll(/<Record\b[^>]*>/g)) {
    const tag = match[0]; const attribute = (name: string) => tag.match(new RegExp(`${name}="([^"]+)"`))?.[1];
    const type = attribute('type')?.replace('HKQuantityTypeIdentifier', '').replace('HKCategoryTypeIdentifier', '');
    const start = attribute('startDate'); const date = start?.slice(0, 10); if (!date) continue;
    const item = grouped[date] ??= { date }; const number = Number(attribute('value'));
    if (type === 'BodyMass' && Number.isFinite(number)) item.weight = number;
    else if (type === 'StepCount' && Number.isFinite(number)) item.steps = (item.steps ?? 0) + number;
    else if (type === 'DistanceWalkingRunning' && Number.isFinite(number)) item.distance = (item.distance ?? 0) + number;
    else if (type === 'SleepAnalysis') { const end = attribute('endDate'); if (end && start) item.sleep = (item.sleep ?? 0) + Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000); }
  }
  return Object.values(grouped).map(item => ({ ...item, steps: item.steps === undefined ? undefined : Math.round(item.steps), distance: item.distance === undefined ? undefined : Number(item.distance.toFixed(2)), sleep: item.sleep === undefined ? undefined : Number(item.sleep.toFixed(2)) }));
};
export type ReportPeriod = '日' | '週' | '月' | '3か月' | '年';
export const periodRecords = (store: HealthStore, endDate: string, period: ReportPeriod) => { const days = period === '日' ? 1 : period === '週' ? 7 : period === '月' ? 30 : period === '3か月' ? 90 : 365; const end = new Date(`${endDate}T12:00:00`); const keys = Array.from({ length: days }, (_, i) => { const d = new Date(end); d.setDate(end.getDate() - (days - 1 - i)); return dateKey(d); }); return keys.map(key => store.records[key] ?? emptyDay(key)); };
export const average = (values: Array<number | null>) => { const valid = values.filter((v): v is number => v !== null); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0; };
