import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum DiscountType {
    PERCENTAGE = 'percentage',
    FIXED_AMOUNT = 'fixed_amount',
    FREE_DELIVERY = 'free_delivery',
}

@Entity('coupons')
export class CouponEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 50, unique: true })
    code: string;

    @Column({ type: 'enum', enum: DiscountType })
    discountType: DiscountType;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    discountValue: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    minimumOrderAmount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    maximumDiscountAmount: number | null;

    @Column({ type: 'int', nullable: true })
    usageLimit: number | null;

    @Column({ type: 'int', default: 1 })
    usageLimitPerUser: number;

    @Column({ type: 'int', default: 0 })
    usedCount: number;

    @Column({ type: 'timestamp' })
    validFrom: Date;

    @Column({ type: 'timestamp' })
    validUntil: Date;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'simple-array', nullable: true })
    applicableCategories: string[] | null;

    @Column({ type: 'simple-array', nullable: true })
    applicableSellers: string[] | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    description: string | null;

    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
