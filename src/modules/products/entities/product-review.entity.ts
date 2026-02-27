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
import { ProductEntity } from './product.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('product_reviews')
@Unique(['productId', 'userId'])
@Index(['productId', 'isApproved', 'createdAt'])
export class ProductReviewEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid', nullable: true })
    orderItemId: string | null;

    @Column({ type: 'int' })
    rating: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string | null;

    @Column({ type: 'text', nullable: true })
    body: string | null;

    @Column({ type: 'simple-array', nullable: true })
    images: string[] | null;

    @Column({ type: 'boolean', default: false })
    isVerifiedPurchase: boolean;

    @Column({ type: 'boolean', default: true })
    isApproved: boolean;

    @Column({ type: 'int', default: 0 })
    helpfulCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relations
    @ManyToOne(() => ProductEntity, (product) => product.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: UserEntity;
}
