import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  numeric,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('userid').primaryKey().defaultRandom(),
  email: varchar('email').notNull().unique(),
  name: varchar('name'),
  paymentAccountId: varchar('paymentaccountid'),
  paymentAccountStatus: varchar('paymentaccountstatus'),
});

export const projects = pgTable('projects', {
  id: uuid('projectid').primaryKey().defaultRandom(),
  userId: uuid('userid')
    .references(() => users.id)
    .notNull(),
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

export const assets = pgTable('assets', {
  id: uuid('assetid').primaryKey().defaultRandom(),
  projectId: uuid('projectid').references(() => projects.id),
  assetType: varchar('assettype'),
  fileUrl: text('fileurl'),
  watermarkedUrl: text('watermarkedurl'),
  expiresAt: timestamp('expiresat', { withTimezone: true }),
});

export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  status: varchar('status', { length: 16 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const collaborations = pgTable('collaborations', {
  id: uuid('collabid').primaryKey().defaultRandom(),
  assetId: uuid('assetid').references(() => assets.id),
  commentText: text('commenttext'),
  collaboratorName: varchar('collaboratorname', { length: 255 }),
});

export const annotationcoordinates = pgTable('annotationcoordinates', {
  id: uuid('annotationid').primaryKey().defaultRandom(),
  collabId: uuid('collabid').references(() => collaborations.id),
  coordX: numeric('coordx'),
  coordY: numeric('coordy'),
  boundingBox: jsonb('boundingbox'),
});

export const videoannotation = pgTable('videoannotation', {
  id: uuid('videoannotationid').primaryKey().defaultRandom(),
  collabId: uuid('collabid').references(() => collaborations.id),
  timestampSeconds: numeric('timestampseconds'),
  duration: numeric('duration'),
});
