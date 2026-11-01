CREATE TABLE `campuses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`gym_name` text NOT NULL,
	`invite_code` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campuses_invite_code_unique` ON `campuses` (`invite_code`);--> statement-breakpoint
CREATE TABLE `cheers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cheer_once` ON `cheers` (`session_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `desk_codes` (
	`campus_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`goal` integer NOT NULL,
	`days` text NOT NULL,
	`squad_id` text,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `members_campus` ON `members` (`campus_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week` text NOT NULL,
	`goal` integer NOT NULL,
	`days` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_user_week` ON `plans` (`user_id`,`week`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`duration` integer NOT NULL,
	`notes` text NOT NULL,
	`exercises` text NOT NULL,
	`status` text NOT NULL,
	`desk_supported` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`review_note` text,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `members`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_campus` ON `sessions` (`campus_id`);--> statement-breakpoint
CREATE TABLE `squads` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `squads_invite_code_unique` ON `squads` (`invite_code`);