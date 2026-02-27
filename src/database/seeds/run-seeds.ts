import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { runCategorySeeder } from './categories.seed';

dotenv.config();

async function runAllSeeds() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vanaaushadhi_db',
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: false,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        await dataSource.initialize();
        console.log('📦 Database connected for seeding.\n');

        await runCategorySeeder(dataSource);

        console.log('\n✅ All seeds completed successfully.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

runAllSeeds();
