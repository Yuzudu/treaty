import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('userid').primaryKey().defaultRandom(),
  email: varchar('email').notNull().unique(),
  name: varchar('name'),
  stripeId: varchar('stripeid'),
})

export const projects = pgTable('projects', {
  id: uuid('projectid').primaryKey().defaultRandom(),
  userId: uuid('userid').references(() => users.id),
  title: varchar('title').notNull(),
  status: varchar('status').notNull().default('DRAFT'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
