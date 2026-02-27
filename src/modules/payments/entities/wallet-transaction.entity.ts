import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum WalletTransactionType {
    CREDIT = 'credit',
    DEBIT = 'debit',
}

export enum WalletReferenceType {
    ORDER_PAYMENT = 'order_payment',
    REFUND = 'refund',
    CASHBACK = 'cashback',
    ADMIN_CREDIT = 'admin_credit',
}

@Entity('wallet_transactions')
@Index(['userId', 'createdAt'])
export class WalletTransactionEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'enum', enum: WalletTransactionType })
    type: WalletTransactionType;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    balanceBefore: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    balanceAfter: number;

    @Column({ type: 'enum', enum: WalletReferenceType })
    referenceType: WalletReferenceType;

    @Column({ type: 'uuid', nullable: true })
    referenceId: string | null;

    @Column({ type: 'varchar', length: 500 })
    description: string;

    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
