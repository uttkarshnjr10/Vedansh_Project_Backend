import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const sslEnabled = configService.get<string>('DB_SSL') === 'true';

        return {
            type: 'postgres' as const,
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT'),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_NAME'),
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
            synchronize: !isProduction,
            logging: isProduction ? ['error', 'warn'] as const : 'all' as const,
            ssl: sslEnabled ? { rejectUnauthorized: false } : false,
            extra: {
                max: 20,
                min: 5,
                idleTimeoutMillis: 30000,
            },
            autoLoadEntities: true,
            retryAttempts: isProduction ? 10 : 3,
            retryDelay: isProduction ? 3000 : 2000,
        };
    },
};
