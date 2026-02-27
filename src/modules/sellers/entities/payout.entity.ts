import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { SellerEntity } from './seller.entity';

export enum PayoutStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum PayoutMethod {
    BANK_TRANSFER = 'bank_transfer',
    UPI = 'upi',
}

@Entity('payouts')
@Index(['sellerId', 'status', 'createdAt'])
export class PayoutEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    sellerId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Index()
    @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
    status: PayoutStatus;

    @Column({ type: 'enum', enum: PayoutMethod, default: PayoutMethod.BANK_TRANSFER })
    payoutMethod: PayoutMethod;

    @Column({ type: 'varchar', length: 100, nullable: true })
    razorpayPayoutId: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    referenceNumber: string | null;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date | null;

    @Column({ type: 'text', nullable: true })
    failureReason: string | null;

    @Column({ type: 'simple-array', nullable: true })
    orderItemIds: string[] | null;

    @Column({ type: 'date' })
    periodStart: Date;

    @Column({ type: 'date' })
    periodEnd: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => SellerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sellerId' })
    seller: SellerEntity;
}
