import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum OtpPurpose {
    LOGIN = 'login',
    PHONE_VERIFY = 'phone_verify',
    SELLER_VERIFY = 'seller_verify',
}

@Entity('otps')
@Index(['phone', 'isUsed', 'expiresAt'])
export class OtpEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'varchar', length: 15 })
    phone: string;

    @Column({ type: 'varchar', length: 255 })
    otpHash: string;

    @Column({
        type: 'enum',
        enum: OtpPurpose,
        default: OtpPurpose.LOGIN,
    })
    purpose: OtpPurpose;

    @Column({ type: 'int', default: 0 })
    attempts: number;

    @Column({ type: 'boolean', default: false })
    isUsed: boolean;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ip: string | null;
}
