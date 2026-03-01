import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const logger = new Logger('StartupChecks');

export async function runStartupChecks(dataSource: DataSource): Promise<void> {
    logger.log('Running startup checks...');

    // 1. Database connection
    try {
        await dataSource.query('SELECT 1');
        logger.log('✅ Database connection OK');
    } catch (error: any) {
        logger.error(`❌ Database connection failed: ${error.message}`);
        throw new Error(`Database connection failed: ${error.message}`);
    }

    // 2. Required env vars in production
    if (process.env.NODE_ENV === 'production') {
        const required = [
            'JWT_ACCESS_SECRET',
            'JWT_REFRESH_SECRET',
            'DATABASE_HOST',
            'DATABASE_NAME',
        ];
        const missing = required.filter((key) => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required env vars: ${missing.join(', ')}`);
        }

        // JWT secret min length
        const jwtSecret = process.env.JWT_ACCESS_SECRET ?? '';
        if (jwtSecret.length < 32) {
            throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production');
        }

        logger.log('✅ Environment variables validated');
    }

    // 3. Check migrations status
    try {
        const pendingMigrations = await dataSource.showMigrations();
        if (pendingMigrations) {
            logger.warn('⚠️ Pending database migrations detected — run migration:run');
        } else {
            logger.log('✅ Database migrations up to date');
        }
    } catch {
        logger.warn('⚠️ Could not check migration status');
    }

    logger.log('🚀 All startup checks passed');
}
