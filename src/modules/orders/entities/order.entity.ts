import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToOne,
    OneToMany,
    JoinColumn,
    Index,
    BeforeInsert,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CouponEntity } from '../../cart/entities/coupon.entity';
import { OrderAddressEntity } from './order-address.entity';
import { OrderItemEntity } from './order-item.entity';
import {
    ORDER_STATUS,
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    CANCELLED_BY,
} from '../../../common/constants';

@Entity('orders')
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class OrderEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 20, unique: true })
    orderNumber: string;

    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @Index()
    @Column({
        type: 'enum',
        enum: ORDER_STATUS,
        default: ORDER_STATUS.PENDING,
    })
    status: ORDER_STATUS;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    deliveryCharge: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    discountAmount: number;

    @Column({ type: 'int', default: 0 })
    loyaltyPointsUsed: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    loyaltyPointsValue: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ type: 'enum', enum: PAYMENT_METHOD })
    paymentMethod: PAYMENT_METHOD;

    @Index()
    @Column({
        type: 'enum',
        enum: PAYMENT_STATUS,
        default: PAYMENT_STATUS.PENDING,
    })
    paymentStatus: PAYMENT_STATUS;

    @Column({ type: 'uuid', nullable: true })
    couponId: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    couponCode: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    couponDiscountAmount: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
    razorpayOrderId: string | null;

    @Column({ type: 'date', nullable: true })
    estimatedDeliveryDate: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    deliveredAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    cancelledAt: Date | null;

    @Column({ type: 'text', nullable: true })
    cancellationReason: string | null;

    @Column({ type: 'enum', enum: CANCELLED_BY, nullable: true })
    cancelledBy: CANCELLED_BY | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    trackingId: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    logisticsPartner: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @ManyToOne(() => CouponEntity, { nullable: true })
    @JoinColumn({ name: 'couponId' })
    coupon: CouponEntity | null;

    @OneToOne(() => OrderAddressEntity, (address) => address.order, { cascade: true })
    address: OrderAddressEntity;

    @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
    items: OrderItemEntity[];

    // Hooks
    @BeforeInsert()
    generateOrderNumber(): void {
        if (!this.orderNumber) {
            const now = new Date();
            const date = now.toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.orderNumber = `VAN-${date}-${rand}`;
        }
    }
}
