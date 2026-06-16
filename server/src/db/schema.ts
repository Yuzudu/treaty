import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('userid').primaryKey().defaultRandom(),
  email: varchar('email').notNull().unique(),
  name: varchar('name'),
  paymentAccountId: varchar('paymentaccountid'),
});

export const projects = pgTable('projects', {
  id: uuid('projectid').primaryKey().defaultRandom(),
  userId: uuid('userid').references(() => users.id),
  title: varchar('title').notNull(),
  status: varchar('status').notNull().default('DRAFT'),
  priceCents: integer('pricecents'),
  currency: varchar('currency').default('PHP'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('transactionid').primaryKey().defaultRandom(),
  projectId: uuid('projectid').references(() => projects.id),
  paymentIntentId: varchar('paymentintentid').notNull().unique(),
  amountTotal: numeric('amounttotal').notNull(),
  platformFee: numeric('platformfee').notNull(),
  payoutStatus: varchar('payoutstatus').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
