import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export const getRedisConfig = (configService: ConfigService): RedisOptions => {
    return {
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        password: configService.get<string>('REDIS_PASSWORD') || undefined,
        db: configService.get<number>('REDIS_DB', 0),
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        retryStrategy: (times: number) => {
            if (times > 3) {
                console.error(`Redis: Could not connect after ${times} attempts`);
                return null;
            }
            // Exponential backoff: 200ms, 400ms, 800ms
            const delay = Math.min(times * 200, 2000);
            return delay;
        },
    };
};
