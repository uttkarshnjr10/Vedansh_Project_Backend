import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserEntity } from '../../users/entities/user.entity';
import { SELLER_STATUS } from '../../../common/constants';

export enum BusinessType {
    INDIVIDUAL = 'individual',
    COMPANY = 'company',
    FARM = 'farm',
    COOPERATIVE = 'cooperative',
}

export interface BusinessAddress {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
}

@Entity('sellers')
export class SellerEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', unique: true })
    userId: string;

    @Column({ type: 'varchar', length: 255 })
    brandName: string;

    @Column({ type: 'enum', enum: BusinessType })
    businessType: BusinessType;

    @Column({ type: 'varchar', length: 15, nullable: true })
    gstNumber: string | null;

    @Exclude()
    @Column({ type: 'varchar', length: 500, nullable: true })
    panNumber: string | null;

    @Column({ type: 'varchar', length: 14, nullable: true })
    fssaiLicenseNumber: string | null;

    @Column({ type: 'jsonb', nullable: true })
    businessAddress: BusinessAddress | null;

    @Column({ type: 'varchar', length: 100 })
    state: string;

    @Index()
    @Column({
        type: 'enum',
        enum: SELLER_STATUS,
        default: SELLER_STATUS.PENDING_VERIFICATION,
    })
    status: SELLER_STATUS;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 15 })
    commissionRate: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalEarnings: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    pendingPayout: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    avgRating: number;

    @Column({ type: 'int', default: 0 })
    totalProductsSold: number;

    @Column({ type: 'boolean', default: false })
    isVerifiedBadge: boolean;

    @Column({ type: 'text', nullable: true })
    aboutBrand: string | null;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    logoUrl: string | null;

    @Exclude()
    @Column({ type: 'varchar', length: 255, nullable: true })
    bankAccountName: string | null;

    @Exclude()
    @Column({ type: 'varchar', length: 500, nullable: true })
    bankAccountNumber: string | null;

    @Column({ type: 'varchar', length: 11, nullable: true })
    bankIfscCode: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    bankName: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    razorpayContactId: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    razorpayFundAccountId: string | null;

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date | null;

    @Column({ type: 'uuid', nullable: true })
    approvedBy: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @OneToOne(() => UserEntity, { cascade: true })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    // Methods
    validateGST(): boolean {
        if (!this.gstNumber) return true;
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(this.gstNumber);
    }

    toJSON(): Record<string, any> {
        const obj = { ...this } as any;
        delete obj.panNumber;
        delete obj.bankAccountNumber;
        delete obj.bankAccountName;
        return obj;
    }
}
