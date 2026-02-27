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

@Entity('refresh_tokens')
@Index(['userId', 'isRevoked'])
export class RefreshTokenEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @Column({ type: 'varchar', length: 255, unique: true })
    tokenHash: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    deviceInfo: string | null;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ip: string | null;

    @Column({ type: 'boolean', default: false })
    isRevoked: boolean;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastUsedAt: Date | null;
}
