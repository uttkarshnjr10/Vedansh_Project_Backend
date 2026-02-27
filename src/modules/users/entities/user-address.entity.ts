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
import { UserEntity } from './user.entity';
import { ADDRESS_LABEL } from '../../../common/constants';

@Entity('user_addresses')
@Index(['userId'])
export class UserAddressEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'enum', enum: ADDRESS_LABEL, default: ADDRESS_LABEL.HOME })
    label: ADDRESS_LABEL;

    @Column({ type: 'varchar', length: 255 })
    fullName: string;

    @Column({ type: 'varchar', length: 15 })
    phone: string;

    @Column({ type: 'varchar', length: 500 })
    addressLine1: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    addressLine2: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    landmark: string | null;

    @Column({ type: 'varchar', length: 100 })
    city: string;

    @Column({ type: 'varchar', length: 100 })
    state: string;

    @Column({ type: 'varchar', length: 6 })
    pincode: string;

    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
