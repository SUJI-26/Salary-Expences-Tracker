import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * One row per account: the user's whole budget document (settings + every month's
 * categories, fixed costs and expenses). `revision` increases on every save and is used
 * for optimistic concurrency, so two devices can never silently overwrite each other.
 */
export const userData = pgTable('user_data', {
  userId: text('user_id').primaryKey(),
  data: jsonb('data').notNull(),
  revision: integer('revision').notNull().default(1),
  deviceId: text('device_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Point-in-time copies of a user's document. Written automatically before risky saves
 * (and at most every few hours otherwise), before a restore, or on request.
 */
export const backups = pgTable(
  'backups',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    data: jsonb('data').notNull(),
    revision: integer('revision').notNull(),
    reason: text('reason').notNull(), // 'auto' | 'manual' | 'before-restore' | 'before-large-delete'
    months: integer('months').notNull().default(0),
    expenses: integer('expenses').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('backups_user_created_idx').on(t.userId, t.createdAt)],
);
