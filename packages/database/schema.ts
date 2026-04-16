import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
