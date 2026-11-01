DROP INDEX `one_active_session_per_day`;--> statement-breakpoint
ALTER TABLE `sessions` ADD `timing_source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `ended_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `one_running_session_per_user` ON `sessions` (`user_id`) WHERE "sessions"."status" = 'recording';--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_session_per_day` ON `sessions` (`user_id`,`date`) WHERE "sessions"."timing_source" = 'scan' AND "sessions"."status" != 'declined';