import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('analytics_daily_snapshots')
export class AnalyticsDailySnapshotEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'date', unique: true })
    date: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalRevenue: number;

    @Column({ type: 'int', default: 0 })
    totalOrders: number;

    @Column({ type: 'int', default: 0 })
    newSellers: number;

    @Column({ type: 'int', default: 0 })
    newBuyers: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    topCategory: string | null;

    @CreateDateColumn()
    createdAt: Date;
}
