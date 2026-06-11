import { defineConfig } from 'drizzle-kit';

// TODO(phase-1): add schema once tables are defined in src/db/schema.ts
export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
