import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductEntity } from './product.entity';

@Entity('wishlists')
@Unique(['userId', 'productId'])
export class WishlistEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    productId: string;

    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;
}
