import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { PRODUCT_STATUS } from '../../../common/constants';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { SubcategoryEntity } from '../../categories/entities/subcategory.entity';
import { SellerEntity } from '../../sellers/entities/seller.entity';
import { ProductImageEntity } from './product-image.entity';
import { ProductCertificateEntity } from './product-certificate.entity';
import { ProductReviewEntity } from './product-review.entity';

@Entity('products')
@Index(['categoryId', 'status', 'isFeatured'])
@Index(['status', 'createdAt'])
@Index(['status', 'salesCount'])
@Index(['sellerId', 'status'])
export class ProductEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    sellerId: string;

    @Column({ type: 'uuid' })
    categoryId: string;

    @Column({ type: 'uuid', nullable: true })
    subcategoryId: string | null;

    @Column({ type: 'varchar', length: 500 })
    name: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 500, unique: true })
    slug: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    shortDescription: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'jsonb', nullable: true })
    ingredients: Array<{ name: string; quantity?: string; unit?: string }> | null;

    @Column({ type: 'text', nullable: true })
    usageInstructions: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    storageInstructions: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    mrp: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    sellingPrice: number;

    @Column({ type: 'int', default: 0 })
    stockQuantity: number;

    @Column({ type: 'int', nullable: true })
    weightGrams: number | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sku: string | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 15 })
    commissionRate: number;

    @Index()
    @Column({
        type: 'enum',
        enum: PRODUCT_STATUS,
        default: PRODUCT_STATUS.PENDING,
    })
    status: PRODUCT_STATUS;

    @Index()
    @Column({ type: 'boolean', default: false })
    isFeatured: boolean;

    @Column({ type: 'boolean', default: false })
    isOrganicCertified: boolean;

    @Column({ type: 'boolean', default: false })
    isLabTested: boolean;

    @Column({ type: 'boolean', default: false })
    isFssaiLicensed: boolean;

    @Column({ type: 'boolean', default: false })
    isAyushApproved: boolean;

    @Column({ type: 'jsonb', default: [] })
    badges: string[];

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    avgRating: number;

    @Column({ type: 'int', default: 0 })
    reviewCount: number;

    @Column({ type: 'int', default: 0 })
    salesCount: number;

    @Column({ type: 'int', default: 0 })
    viewCount: number;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string | null;

    @Column({ type: 'text', nullable: true })
    adminNotes: string | null;

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date | null;

    @Column({ type: 'uuid', nullable: true })
    approvedBy: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    metaTitle: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    metaDescription: string | null;

    @Column({ type: 'simple-array', nullable: true })
    tags: string[] | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date | null;

    // Relations
    @ManyToOne(() => SellerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sellerId' })
    seller: SellerEntity;

    @ManyToOne(() => CategoryEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'categoryId' })
    category: CategoryEntity;

    @ManyToOne(() => SubcategoryEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'subcategoryId' })
    subcategory: SubcategoryEntity | null;

    @OneToMany(() => ProductImageEntity, (img) => img.product, { cascade: true })
    images: ProductImageEntity[];

    @OneToMany(() => ProductCertificateEntity, (cert) => cert.product, { cascade: true })
    certificates: ProductCertificateEntity[];

    @OneToMany(() => ProductReviewEntity, (review) => review.product)
    reviews: ProductReviewEntity[];

    // Hooks
    @BeforeInsert()
    @BeforeUpdate()
    updateBadgesAndValidate(): void {
        // Build badges array from boolean flags
        const badges: string[] = [];
        if (this.isOrganicCertified) badges.push('organic_certified');
        if (this.isLabTested) badges.push('lab_tested');
        if (this.isFssaiLicensed) badges.push('fssai_licensed');
        if (this.isAyushApproved) badges.push('ayush_approved');
        this.badges = badges;

        // Validate sellingPrice <= mrp
        if (
            this.sellingPrice != null &&
            this.mrp != null &&
            Number(this.sellingPrice) > Number(this.mrp)
        ) {
            throw new Error('Selling price cannot exceed MRP');
        }

        // Auto-generate slug if not set
        if (this.name && !this.slug) {
            this.slug = this.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
        }
    }
}
