CREATE TABLE `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_events_session` ON `review_events` (`session_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`exercises` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routines_user` ON `routines` (`user_id`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `appeal_note` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `appealed_at` integer;