CREATE TABLE `health_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`recorded_at` text NOT NULL,
	`category` text,
	`label` text NOT NULL,
	`calories` integer DEFAULT 0 NOT NULL,
	`carbs` real DEFAULT 0 NOT NULL,
	`protein` real DEFAULT 0 NOT NULL,
	`fat` real DEFAULT 0 NOT NULL,
	`weight` real,
	`steps` integer,
	`distance` real,
	`duration` integer,
	`sleep_hours` real,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_goals` (
	`id` integer PRIMARY KEY NOT NULL,
	`calories` integer DEFAULT 1800 NOT NULL,
	`carbs` integer DEFAULT 225 NOT NULL,
	`protein` integer DEFAULT 90 NOT NULL,
	`fat` integer DEFAULT 50 NOT NULL,
	`weight` real DEFAULT 60 NOT NULL,
	`steps` integer DEFAULT 8000 NOT NULL,
	`sleep_hours` real DEFAULT 7.5 NOT NULL,
	`updated_at` integer NOT NULL
);
