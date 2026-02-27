import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { UserEntity } from '../modules/users/entities/user.entity';
import { NOTIFICATION_TYPE } from '../common/constants';

@Entity('notifications')
@Index(['userId', 'isRead', 'createdAt'])
export class NotificationEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'enum', enum: NOTIFICATION_TYPE })
    type: NOTIFICATION_TYPE;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'jsonb', nullable: true })
    data: Record<string, any> | null;

    @Index()
    @Column({ type: 'boolean', default: false })
    isRead: boolean;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date | null;

    @Index()
    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
