import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { CouponEntity } from './coupon.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('coupon_usages')
@Index(['couponId', 'userId'])
export class CouponUsageEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    couponId: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid', nullable: true })
    orderId: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    discountAmount: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    usedAt: Date;

    // Relations
    @ManyToOne(() => CouponEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'couponId' })
    coupon: CouponEntity;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
