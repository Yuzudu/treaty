import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DB_POOL = Symbol('DB_POOL');

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Pool | null> => {
        const logger = new Logger('DbModule');
        const connectionString = config.get<string>('DATABASE_URL');

        if (!connectionString) {
          logger.warn('DATABASE_URL is not set, database features will be unavailable');
          return null;
        }

        try {
          const pool = new Pool({ connectionString });
          const client = await pool.connect();
          client.release();
          logger.log('Database connection established');
          return pool;
        } catch (err) {
          logger.warn(
            `Database unreachable: ${(err as Error).message}, continuing without DB`,
          );
          return null;
        }
      },
    },
  ],
  exports: [DB_POOL],
})
export class DbModule {}
