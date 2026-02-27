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
import { OrderEntity } from '../../orders/entities/order.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum RefundStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum RefundMethod {
    WALLET = 'wallet',
    ORIGINAL_PAYMENT_METHOD = 'original_payment_method',
}

@Entity('refunds')
export class RefundEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    orderId: string;

    @Column({ type: 'uuid', nullable: true })
    orderItemId: string | null;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'text' })
    reason: string;

    @Index()
    @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
    status: RefundStatus;

    @Column({ type: 'enum', enum: RefundMethod })
    refundMethod: RefundMethod;

    @Column({ type: 'varchar', length: 100, nullable: true })
    razorpayRefundId: string | null;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    failureReason: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: OrderEntity;

    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
