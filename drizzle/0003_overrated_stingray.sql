DROP INDEX `one_active_session_per_day`;--> statement-breakpoint
CREATE INDEX `sessions_user_history` ON `sessions` (`user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `sessions_campus_history` ON `sessions` (`campus_id`,`created_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_session_per_day` ON `sessions` (`user_id`,`date`) WHERE "sessions"."timing_source" = 'scan' AND "sessions"."status" IN ('recording', 'pending', 'verified');--> statement-breakpoint
ALTER TABLE `desk_codes` ADD `previous_code` text;--> statement-breakpoint
ALTER TABLE `desk_codes` ADD `previous_expires_at` integer;--> statement-breakpoint
ALTER TABLE `plans` ADD `locked_at` integer;