import {Global, Logger, Module} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Pool} from 'pg';

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
    providers: [
        {
            provide: PG_POOL,
            inject: [ConfigService],
            useFactory : async (configService: ConfigService) => {
                const pool = new Pool({
                    connectionString: configService.get<string>('DATABASE_URL'),
                });
                await pool.query('SELECT 1'); // Test the connection
                new Logger('Database').log('Connected to the database');
                return pool;
            },
        },
    ],
    exports: [PG_POOL],
})
export class DatabaseModule {}