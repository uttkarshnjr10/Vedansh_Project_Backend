import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { OrderEntity } from './order.entity';
import { ProductEntity } from '../../products/entities/product.entity';
import { SellerEntity } from '../../sellers/entities/seller.entity';
import {
    ORDER_ITEM_STATUS,
    PAYOUT_ITEM_STATUS,
    RETURN_STATUS,
    REFUND_STATUS,
} from '../../../common/constants';

@Entity('order_items')
@Index(['sellerId', 'payoutStatus'])
@Index(['orderId'])
export class OrderItemEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    orderId: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Index()
    @Column({ type: 'uuid' })
    sellerId: string;

    // ── SNAPSHOTS (frozen at purchase time) ──
    @Column({ type: 'varchar', length: 500 })
    productName: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    productImageUrl: string | null;

    @Column({ type: 'varchar', length: 500 })
    productSlug: string;

    @Column({ type: 'varchar', length: 255 })
    sellerName: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalPrice: number;

    // ── COMMISSION (locked at purchase) ──
    @Column({ type: 'decimal', precision: 5, scale: 2 })
    commissionRate: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    commissionAmount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    sellerPayoutAmount: number;

    // ── STATUS ──
    @Column({
        type: 'enum',
        enum: ORDER_ITEM_STATUS,
        default: ORDER_ITEM_STATUS.PENDING,
    })
    itemStatus: ORDER_ITEM_STATUS;

    @Index()
    @Column({
        type: 'enum',
        enum: PAYOUT_ITEM_STATUS,
        default: PAYOUT_ITEM_STATUS.PENDING,
    })
    payoutStatus: PAYOUT_ITEM_STATUS;

    @Column({ type: 'uuid', nullable: true })
    payoutId: string | null;

    // ── RETURN ──
    @Column({ type: 'timestamp', nullable: true })
    returnRequestedAt: Date | null;

    @Column({ type: 'text', nullable: true })
    returnReason: string | null;

    @Column({
        type: 'enum',
        enum: RETURN_STATUS,
        default: RETURN_STATUS.NONE,
    })
    returnStatus: RETURN_STATUS;

    @Column({ type: 'timestamp', nullable: true })
    returnedAt: Date | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    refundAmount: number | null;

    @Column({
        type: 'enum',
        enum: REFUND_STATUS,
        default: REFUND_STATUS.NONE,
    })
    refundStatus: REFUND_STATUS;

    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: OrderEntity;

    @ManyToOne(() => ProductEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;

    @ManyToOne(() => SellerEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'sellerId' })
    seller: SellerEntity;
}
