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
import { UserEntity } from '../../users/entities/user.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../../../common/constants';

@Entity('payments')
export class PaymentEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'uuid', unique: true })
    orderId: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'int' })
    amountPaise: number;

    @Column({ type: 'varchar', length: 3, default: 'INR' })
    currency: string;

    @Column({ type: 'enum', enum: PAYMENT_METHOD })
    paymentMethod: PAYMENT_METHOD;

    @Index()
    @Column({ type: 'enum', enum: PAYMENT_STATUS, default: PAYMENT_STATUS.PENDING })
    status: PAYMENT_STATUS;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
    razorpayOrderId: string | null;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
    razorpayPaymentId: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    razorpaySignature: string | null;

    @Column({ type: 'jsonb', nullable: true })
    gatewayResponse: Record<string, any> | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    failureReason: string | null;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date | null;

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
