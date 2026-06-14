import { Global, Module, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../../db/schema'

export const DB_POOL = Symbol('DB_POOL')
export const DRIZZLE_DB = Symbol('DRIZZLE_DB')

export type DrizzleDB = NodePgDatabase<typeof schema>

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Pool | null> => {
        const logger = new Logger('DbModule')
        const connectionString = config.get<string>('DATABASE_URL')

        if (!connectionString) {
          logger.warn('DATABASE_URL is not set, database features will be unavailable')
          return null
        }

        try {
          const pool = new Pool({ connectionString })
          const client = await pool.connect()
          client.release()
          logger.log('Database connection established')
          return pool
        } catch (err) {
          logger.warn(
            `Database unreachable: ${(err as Error).message}, continuing without DB`,
          )
          return null
        }
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [DB_POOL],
      useFactory: (pool: Pool | null): DrizzleDB | null => {
        if (!pool) return null
        return drizzle(pool, { schema })
      },
    },
  ],
  exports: [DB_POOL, DRIZZLE_DB],
})
export class DbModule {}
