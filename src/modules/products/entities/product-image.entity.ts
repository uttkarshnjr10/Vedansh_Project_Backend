import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';

@Entity('product_images')
export class ProductImageEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Column({ type: 'varchar', length: 1000 })
    url: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    thumbnailUrl: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    altText: string | null;

    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    @Column({ type: 'boolean', default: false })
    isPrimary: boolean;

    @CreateDateColumn()
    createdAt: Date;

    // Relations
    @ManyToOne(() => ProductEntity, (product) => product.images, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: ProductEntity;
}
