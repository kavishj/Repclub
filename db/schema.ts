import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const campuses = sqliteTable("campuses", {
  id: text("id").primaryKey(), name: text("name").notNull(), gymName: text("gym_name").notNull(),
  inviteCode: text("invite_code").notNull().unique(), ownerId: text("owner_id").notNull(), createdAt: integer("created_at").notNull(),
});
export const squads = sqliteTable("squads", {
  id: text("id").primaryKey(), campusId: text("campus_id").notNull().references(() => campuses.id),
  name: text("name").notNull(), inviteCode: text("invite_code").notNull().unique(), createdAt: integer("created_at").notNull(),
});
export const members = sqliteTable("members", {
  userId: text("user_id").primaryKey(), campusId: text("campus_id").notNull().references(() => campuses.id),
  name: text("name").notNull(), role: text("role").notNull(), goal: integer("goal").notNull(),
  days: text("days").notNull(), squadId: text("squad_id").references(() => squads.id), joinedAt: integer("joined_at").notNull(),
}, t => [index("members_campus").on(t.campusId)]);
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => members.userId),
  week: text("week").notNull(), goal: integer("goal").notNull(), days: text("days").notNull(),
}, t => [uniqueIndex("plan_user_week").on(t.userId, t.week)]);
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), campusId: text("campus_id").notNull().references(() => campuses.id),
  userId: text("user_id").notNull().references(() => members.userId), title: text("title").notNull(),
  type: text("type").notNull(), date: text("date").notNull(), duration: integer("duration").notNull(),
  notes: text("notes").notNull(), exercises: text("exercises").notNull(), status: text("status").notNull(),
  deskSupported: integer("desk_supported").notNull().default(0), createdAt: integer("created_at").notNull(),
  timingSource: text("timing_source").notNull().default("manual"),
  startedAt: integer("started_at"), endedAt: integer("ended_at"),
  reviewedBy: text("reviewed_by"), reviewedAt: integer("reviewed_at"), reviewNote: text("review_note"),
}, t => [index("sessions_campus").on(t.campusId),
  uniqueIndex("one_active_session_per_day").on(t.userId, t.date).where(sql`${t.timingSource} = 'scan' AND ${t.status} != 'declined'`),
  uniqueIndex("one_running_session_per_user").on(t.userId).where(sql`${t.status} = 'recording'`),
]);
export const cheers = sqliteTable("cheers", {
  id: text("id").primaryKey(), sessionId: text("session_id").notNull().references(() => sessions.id), userId: text("user_id").notNull().references(() => members.userId),
}, t => [uniqueIndex("cheer_once").on(t.sessionId, t.userId)]);
export const deskCodes = sqliteTable("desk_codes", {
  campusId: text("campus_id").primaryKey().references(() => campuses.id), code: text("code").notNull(), expiresAt: integer("expires_at").notNull(),
});
