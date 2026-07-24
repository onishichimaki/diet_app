import { env } from "cloudflare:workers";

export type HealthEntryInput = {
  kind: "meal" | "weight" | "activity" | "sleep";
  recordedAt?: string;
  category?: string;
  label: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  weight?: number | null;
  steps?: number | null;
  distance?: number | null;
  duration?: number | null;
  sleepHours?: number | null;
  note?: string;
};

const tableStatements = [
  `CREATE TABLE IF NOT EXISTS health_entries (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    category TEXT,
    label TEXT NOT NULL,
    calories INTEGER NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    protein REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    weight REAL,
    steps INTEGER,
    distance REAL,
    duration INTEGER,
    sleep_hours REAL,
    note TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS health_entries_date_idx
    ON health_entries (recorded_at DESC)`,
  `CREATE INDEX IF NOT EXISTS health_entries_kind_idx
    ON health_entries (kind, recorded_at DESC)`,
  `CREATE TABLE IF NOT EXISTS health_goals (
    id INTEGER PRIMARY KEY,
    calories INTEGER NOT NULL DEFAULT 1800,
    carbs INTEGER NOT NULL DEFAULT 225,
    protein INTEGER NOT NULL DEFAULT 90,
    fat INTEGER NOT NULL DEFAULT 50,
    weight REAL NOT NULL DEFAULT 60,
    steps INTEGER NOT NULL DEFAULT 8000,
    sleep_hours REAL NOT NULL DEFAULT 7.5,
    updated_at INTEGER NOT NULL
  )`,
];

function database(): D1Database {
  if (!env.DB) {
    throw new Error("Health database is not available.");
  }
  return env.DB;
}

export async function initializeHealthDatabase() {
  const db = database();
  await db.batch(tableStatements.map((sql) => db.prepare(sql)));

  const now = Date.now();
  await db
    .prepare(
      `INSERT OR IGNORE INTO health_goals
        (id, calories, carbs, protein, fat, weight, steps, sleep_hours, updated_at)
       VALUES (1, 1800, 225, 90, 50, 60, 8000, 7.5, ?)`,
    )
    .bind(now)
    .run();

  const count = await db
    .prepare("SELECT COUNT(*) AS total FROM health_entries")
    .first<{ total: number }>();

  if ((count?.total ?? 0) === 0) {
    await seedDemoData(db, now);
  }
  return db;
}

async function seedDemoData(db: D1Database, now: number) {
  const isoDate = (daysAgo: number) => {
    const date = new Date(now - daysAgo * 86_400_000);
    return date.toISOString().slice(0, 10);
  };
  const seed: Array<HealthEntryInput & { id: string; daysAgo: number }> = [
    { id: "seed-breakfast", daysAgo: 0, kind: "meal", category: "朝食", label: "ヨーグルトとバナナ", calories: 320, carbs: 48, protein: 14, fat: 8 },
    { id: "seed-lunch", daysAgo: 0, kind: "meal", category: "昼食", label: "チキンと玄米のボウル", calories: 580, carbs: 72, protein: 38, fat: 16 },
    { id: "seed-snack", daysAgo: 0, kind: "meal", category: "間食", label: "アーモンド", calories: 165, carbs: 6, protein: 6, fat: 14 },
    { id: "seed-activity", daysAgo: 0, kind: "activity", category: "ウォーキング", label: "夕方のウォーキング", steps: 6842, distance: 4.8, duration: 46 },
    { id: "seed-weight-0", daysAgo: 0, kind: "weight", label: "朝の体重", weight: 61.2 },
    { id: "seed-weight-3", daysAgo: 3, kind: "weight", label: "朝の体重", weight: 61.6 },
    { id: "seed-weight-6", daysAgo: 6, kind: "weight", label: "朝の体重", weight: 62.0 },
    { id: "seed-sleep-0", daysAgo: 0, kind: "sleep", label: "昨夜の睡眠", sleepHours: 7.2 },
    { id: "seed-sleep-1", daysAgo: 1, kind: "sleep", label: "睡眠", sleepHours: 6.8 },
    { id: "seed-sleep-2", daysAgo: 2, kind: "sleep", label: "睡眠", sleepHours: 7.6 },
    { id: "seed-meal-1", daysAgo: 1, kind: "meal", category: "合計", label: "1日の食事", calories: 1720, carbs: 214, protein: 92, fat: 48 },
    { id: "seed-meal-2", daysAgo: 2, kind: "meal", category: "合計", label: "1日の食事", calories: 1860, carbs: 228, protein: 88, fat: 55 },
    { id: "seed-meal-3", daysAgo: 3, kind: "meal", category: "合計", label: "1日の食事", calories: 1650, carbs: 205, protein: 94, fat: 44 },
    { id: "seed-meal-4", daysAgo: 4, kind: "meal", category: "合計", label: "1日の食事", calories: 1780, carbs: 219, protein: 90, fat: 49 },
    { id: "seed-meal-5", daysAgo: 5, kind: "meal", category: "合計", label: "1日の食事", calories: 1910, carbs: 236, protein: 96, fat: 57 },
    { id: "seed-meal-6", daysAgo: 6, kind: "meal", category: "合計", label: "1日の食事", calories: 1690, carbs: 209, protein: 86, fat: 47 },
  ];

  await db.batch(
    seed.map((entry, index) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO health_entries
            (id, kind, recorded_at, category, label, calories, carbs, protein, fat,
             weight, steps, distance, duration, sleep_hours, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          entry.id,
          entry.kind,
          isoDate(entry.daysAgo),
          entry.category ?? null,
          entry.label,
          entry.calories ?? 0,
          entry.carbs ?? 0,
          entry.protein ?? 0,
          entry.fat ?? 0,
          entry.weight ?? null,
          entry.steps ?? null,
          entry.distance ?? null,
          entry.duration ?? null,
          entry.sleepHours ?? null,
          entry.note ?? null,
          now - index,
        ),
    ),
  );
}

export async function listHealthData() {
  const db = await initializeHealthDatabase();
  const [entries, goals] = await Promise.all([
    db
      .prepare(
        `SELECT id, kind, recorded_at AS recordedAt, category, label, calories,
                carbs, protein, fat, weight, steps, distance, duration,
                sleep_hours AS sleepHours, note, created_at AS createdAt
         FROM health_entries
         ORDER BY recorded_at DESC, created_at DESC
         LIMIT 180`,
      )
      .all(),
    db
      .prepare(
        `SELECT calories, carbs, protein, fat, weight, steps,
                sleep_hours AS sleepHours
         FROM health_goals WHERE id = 1`,
      )
      .first(),
  ]);

  return { entries: entries.results, goals };
}

export async function addHealthEntry(input: HealthEntryInput) {
  const db = await initializeHealthDatabase();
  const id = crypto.randomUUID();
  const recordedAt = input.recordedAt ?? new Date().toISOString().slice(0, 10);
  const createdAt = Date.now();
  await db
    .prepare(
      `INSERT INTO health_entries
        (id, kind, recorded_at, category, label, calories, carbs, protein, fat,
         weight, steps, distance, duration, sleep_hours, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.kind,
      recordedAt,
      input.category ?? null,
      input.label,
      input.calories ?? 0,
      input.carbs ?? 0,
      input.protein ?? 0,
      input.fat ?? 0,
      input.weight ?? null,
      input.steps ?? null,
      input.distance ?? null,
      input.duration ?? null,
      input.sleepHours ?? null,
      input.note ?? null,
      createdAt,
    )
    .run();
  return { id, recordedAt, createdAt, ...input };
}

export async function deleteHealthEntry(id: string) {
  const db = await initializeHealthDatabase();
  await db.prepare("DELETE FROM health_entries WHERE id = ?").bind(id).run();
}

export async function updateHealthGoals(goals: Record<string, number>) {
  const db = await initializeHealthDatabase();
  await db
    .prepare(
      `UPDATE health_goals
       SET calories = ?, carbs = ?, protein = ?, fat = ?, weight = ?,
           steps = ?, sleep_hours = ?, updated_at = ?
       WHERE id = 1`,
    )
    .bind(
      goals.calories,
      goals.carbs,
      goals.protein,
      goals.fat,
      goals.weight,
      goals.steps,
      goals.sleepHours,
      Date.now(),
    )
    .run();
  return goals;
}
