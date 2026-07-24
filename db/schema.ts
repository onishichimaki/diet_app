import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const healthEntries = sqliteTable("health_entries", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  recordedAt: text("recorded_at").notNull(),
  category: text("category"),
  label: text("label").notNull(),
  calories: integer("calories").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  protein: real("protein").notNull().default(0),
  fat: real("fat").notNull().default(0),
  weight: real("weight"),
  steps: integer("steps"),
  distance: real("distance"),
  duration: integer("duration"),
  sleepHours: real("sleep_hours"),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
});

export const healthGoals = sqliteTable("health_goals", {
  id: integer("id").primaryKey(),
  calories: integer("calories").notNull().default(1800),
  carbs: integer("carbs").notNull().default(225),
  protein: integer("protein").notNull().default(90),
  fat: integer("fat").notNull().default(50),
  weight: real("weight").notNull().default(60),
  steps: integer("steps").notNull().default(8000),
  sleepHours: real("sleep_hours").notNull().default(7.5),
  updatedAt: integer("updated_at").notNull(),
});
