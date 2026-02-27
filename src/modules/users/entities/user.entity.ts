import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert,
    Index,
    OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ROLES } from '../../../common/constants';
import { SellerEntity } from '../../sellers/entities/seller.entity';

export enum UserStatus {
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
    PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'varchar', length: 15, unique: true })
    phone: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    email: string | null;

    @Column({ type: 'varchar', length: 255 })
    fullName: string;

    @Exclude()
    @Column({ type: 'varchar', length: 255, nullable: true })
    passwordHash: string | null;

    @Column({
        type: 'enum',
        enum: ROLES,
        default: ROLES.BUYER,
    })
    role: ROLES;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.PENDING_VERIFICATION,
    })
    status: UserStatus;

    @Column({ type: 'timestamp', nullable: true })
    phoneVerifiedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    emailVerifiedAt: Date | null;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
    })
    walletBalance: number;

    @Column({ type: 'int', default: 0 })
    loyaltyPoints: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    googleId: string | null;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    avatar: string | null;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date | null;

    @Column({ type: 'int', default: 0 })
    loginCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;

    // Relations
    @OneToOne(() => SellerEntity, (seller) => seller.user)
    sellerProfile: SellerEntity;

    // --- Hooks ---

    @BeforeInsert()
    trimFields(): void {
        if (this.phone) {
            this.phone = this.phone.trim();
        }
        if (this.email) {
            this.email = this.email.trim().toLowerCase();
        }
    }

    // --- Instance Methods ---

    isActive(): boolean {
        return this.status === UserStatus.ACTIVE;
    }

    isPhoneVerified(): boolean {
        return this.phoneVerifiedAt !== null;
    }

    canLogin(): boolean {
        return this.status !== UserStatus.SUSPENDED;
    }
}
