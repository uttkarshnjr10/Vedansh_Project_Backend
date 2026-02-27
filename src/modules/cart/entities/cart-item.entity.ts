import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { ProductEntity } from '../../products/entities/product.entity';

@Entity('cart_items')
@Unique(['userId', 'productId'])
@Index(['userId', 'addedAt'])
export class CartItemEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Column({ type: 'int' })
    quantity: number;

    @CreateDateColumn()
    addedAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;

    @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;
}
