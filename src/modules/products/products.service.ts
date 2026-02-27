import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductEntity } from './entities/product.entity';
import { ProductReviewEntity } from './entities/product-review.entity';
import { WishlistEntity } from './entities/wishlist.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { SubcategoryEntity } from '../categories/entities/subcategory.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto, ProductSortBy } from './dto/product-filter.dto';
import { ProductReviewDto } from './dto/product-review.dto';
import { AdminApproveProductDto, AdminAction } from './dto/admin-approve-product.dto';
import { PRODUCT_STATUS, SELLER_STATUS } from '../../common/constants';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);

    constructor(
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(ProductReviewEntity)
        private readonly reviewRepository: Repository<ProductReviewEntity>,
        @InjectRepository(WishlistEntity)
        private readonly wishlistRepository: Repository<WishlistEntity>,
        @InjectRepository(CategoryEntity)
        private readonly categoryRepository: Repository<CategoryEntity>,
        @InjectRepository(SubcategoryEntity)
        private readonly subcategoryRepository: Repository<SubcategoryEntity>,
        @InjectRepository(SellerEntity)
        private readonly sellerRepository: Repository<SellerEntity>,
    ) { }

    // ─── PRODUCT LISTING ──────────────────────

    async findAll(filterDto: ProductFilterDto): Promise<{
        items: ProductEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const {
            categoryId, subcategoryId, minPrice, maxPrice,
            isOrganicCertified, isLabTested, isFssaiLicensed,
            minRating, sellerId, search, sortBy, status,
            page = 1, limit = 20,
        } = filterDto;

        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.subcategory', 'subcategory');

        // Only show approved products for public (status filter is admin only)
        if (status) {
            qb.andWhere('product.status = :status', { status });
        } else {
            qb.andWhere('product.status = :status', { status: PRODUCT_STATUS.APPROVED });
        }

        // Filters
        if (categoryId) {
            qb.andWhere('product.categoryId = :categoryId', { categoryId });
        }
        if (subcategoryId) {
            qb.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId });
        }
        if (minPrice != null) {
            qb.andWhere('product.sellingPrice >= :minPrice', { minPrice });
        }
        if (maxPrice != null) {
            qb.andWhere('product.sellingPrice <= :maxPrice', { maxPrice });
        }
        if (isOrganicCertified) {
            qb.andWhere('product.isOrganicCertified = true');
        }
        if (isLabTested) {
            qb.andWhere('product.isLabTested = true');
        }
        if (isFssaiLicensed) {
            qb.andWhere('product.isFssaiLicensed = true');
        }
        if (minRating != null) {
            qb.andWhere('product.avgRating >= :minRating', { minRating });
        }
        if (sellerId) {
            qb.andWhere('product.sellerId = :sellerId', { sellerId });
        }
        if (search) {
            qb.andWhere(
                '(product.name ILIKE :search OR product.description ILIKE :search OR product.shortDescription ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        // Sorting
        switch (sortBy) {
            case ProductSortBy.PRICE_ASC:
                qb.orderBy('product.sellingPrice', 'ASC');
                break;
            case ProductSortBy.PRICE_DESC:
                qb.orderBy('product.sellingPrice', 'DESC');
                break;
            case ProductSortBy.NEWEST:
                qb.orderBy('product.createdAt', 'DESC');
                break;
            case ProductSortBy.RATING:
                qb.orderBy('product.avgRating', 'DESC');
                break;
            case ProductSortBy.POPULARITY:
            default:
                qb.orderBy('product.salesCount', 'DESC');
                break;
        }

        // Pagination
        const totalItems = await qb.getCount();
        const items = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            items,
            meta: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
            },
        };
    }

    // ─── PRODUCT DETAIL ───────────────────────

    async findBySlug(slug: string): Promise<ProductEntity> {
        const product = await this.productRepository.findOne({
            where: { slug, status: PRODUCT_STATUS.APPROVED },
            relations: ['category', 'subcategory', 'images', 'certificates'],
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Increment viewCount asynchronously (fire and forget)
        this.productRepository
            .createQueryBuilder()
            .update(ProductEntity)
            .set({ viewCount: () => '"viewCount" + 1' })
            .where('id = :id', { id: product.id })
            .execute()
            .catch((err) => this.logger.error('Failed to increment viewCount', err));

        return product;
    }

    // ─── RELATED PRODUCTS ─────────────────────

    async findRelatedProducts(productId: string, limit = 6): Promise<ProductEntity[]> {
        const product = await this.productRepository.findOne({
            where: { id: productId },
            select: ['id', 'subcategoryId', 'categoryId', 'sellerId'],
        });

        if (!product) return [];

        const qb = this.productRepository.createQueryBuilder('product')
            .where('product.status = :status', { status: PRODUCT_STATUS.APPROVED })
            .andWhere('product.id != :productId', { productId });

        if (product.subcategoryId) {
            qb.andWhere('product.subcategoryId = :subcategoryId', {
                subcategoryId: product.subcategoryId,
            });
        } else {
            qb.andWhere('product.categoryId = :categoryId', {
                categoryId: product.categoryId,
            });
        }

        // Exclude same seller
        qb.andWhere('product.sellerId != :sellerId', { sellerId: product.sellerId });
        qb.orderBy('product.salesCount', 'DESC');
        qb.take(limit);

        return qb.getMany();
    }

    // ─── RECOMMENDATIONS ──────────────────────

    async findRecommendations(
        _userId: string | null,
        productId: string,
    ): Promise<ProductEntity[]> {
        // MVP: Return most popular in same category
        // TODO: Phase 9 — upgrade to collaborative filtering / ML
        const product = await this.productRepository.findOne({
            where: { id: productId },
            select: ['id', 'categoryId'],
        });

        if (!product) return [];

        return this.productRepository.find({
            where: {
                categoryId: product.categoryId,
                status: PRODUCT_STATUS.APPROVED,
            },
            order: { salesCount: 'DESC' },
            take: 6,
        });
    }

    // ─── CREATE PRODUCT (Seller) ──────────────

    async createProduct(
        sellerId: string,
        createDto: CreateProductDto,
    ): Promise<ProductEntity> {
        // Verify seller is approved
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
        });
        if (!seller) {
            throw new NotFoundException('Seller profile not found');
        }
        if (seller.status !== SELLER_STATUS.APPROVED) {
            throw new ForbiddenException('Only approved sellers can list products');
        }

        // Validate category exists
        const category = await this.categoryRepository.findOne({
            where: { id: createDto.categoryId },
        });
        if (!category) {
            throw new NotFoundException('Category not found');
        }

        // Validate subcategory if provided
        if (createDto.subcategoryId) {
            const sub = await this.subcategoryRepository.findOne({
                where: { id: createDto.subcategoryId, categoryId: createDto.categoryId },
            });
            if (!sub) {
                throw new NotFoundException('Subcategory not found or does not belong to the selected category');
            }
        }

        // Generate unique slug
        let slug = createDto.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const existingSlug = await this.productRepository.findOne({ where: { slug } });
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        const product = this.productRepository.create({
            ...createDto,
            sellerId,
            slug,
            status: PRODUCT_STATUS.PENDING,
            commissionRate: seller.commissionRate,
        });

        return this.productRepository.save(product);
    }

    // ─── UPDATE PRODUCT (Seller) ──────────────

    async updateProduct(
        sellerId: string,
        productId: string,
        updateDto: UpdateProductDto,
    ): Promise<ProductEntity> {
        const product = await this.productRepository.findOne({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.sellerId !== sellerId) {
            throw new ForbiddenException('You can only edit your own products');
        }

        // If approved, changing price/description requires re-approval
        if (product.status === PRODUCT_STATUS.APPROVED) {
            const requiresReApproval =
                updateDto.sellingPrice !== undefined ||
                updateDto.mrp !== undefined ||
                updateDto.description !== undefined ||
                updateDto.name !== undefined;

            if (requiresReApproval) {
                product.status = PRODUCT_STATUS.PENDING;
            }
        }

        Object.assign(product, updateDto);
        return this.productRepository.save(product);
    }

    // ─── ADMIN APPROVE/REJECT ─────────────────

    async adminApproveProduct(
        productId: string,
        adminId: string,
        approveDto: AdminApproveProductDto,
    ): Promise<ProductEntity> {
        const product = await this.productRepository.findOne({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (approveDto.action === AdminAction.APPROVE) {
            product.status = PRODUCT_STATUS.APPROVED;
            product.approvedAt = new Date();
            product.approvedBy = adminId;
            product.rejectionReason = null;

            // Assign badges
            if (approveDto.badgesToAssign) {
                for (const badge of approveDto.badgesToAssign) {
                    switch (badge) {
                        case 'organic_certified': product.isOrganicCertified = true; break;
                        case 'lab_tested': product.isLabTested = true; break;
                        case 'fssai_licensed': product.isFssaiLicensed = true; break;
                        case 'ayush_approved': product.isAyushApproved = true; break;
                    }
                }
            }

            if (approveDto.commissionRate != null) {
                product.commissionRate = approveDto.commissionRate;
            }
        } else {
            product.status = PRODUCT_STATUS.REJECTED;
            product.rejectionReason = approveDto.rejectionReason ?? 'No reason provided';
        }

        return this.productRepository.save(product);
    }

    // ─── ADMIN: GET PENDING PRODUCTS ──────────

    async findPendingProducts(page = 1, limit = 20): Promise<{
        items: ProductEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.productRepository.findAndCount({
            where: { status: PRODUCT_STATUS.PENDING },
            relations: ['category', 'subcategory'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: {
                page,
                limit,
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
            },
        };
    }

    // ─── TOGGLE FEATURED ──────────────────────

    async toggleFeatured(productId: string): Promise<ProductEntity> {
        const product = await this.productRepository.findOne({
            where: { id: productId },
        });
        if (!product) throw new NotFoundException('Product not found');

        product.isFeatured = !product.isFeatured;
        return this.productRepository.save(product);
    }

    // ─── REVIEWS ──────────────────────────────

    async addReview(
        userId: string,
        productId: string,
        reviewDto: ProductReviewDto,
    ): Promise<ProductReviewEntity> {
        // Check product exists and is approved
        const product = await this.productRepository.findOne({
            where: { id: productId, status: PRODUCT_STATUS.APPROVED },
        });
        if (!product) throw new NotFoundException('Product not found');

        // Check no existing review by this user
        const existing = await this.reviewRepository.findOne({
            where: { productId, userId },
        });
        if (existing) {
            throw new ConflictException('You have already reviewed this product');
        }

        // TODO: Check order_items for verified purchase (Phase 5)
        const review = this.reviewRepository.create({
            productId,
            userId,
            ...reviewDto,
            isVerifiedPurchase: false,
            isApproved: true,
        });

        const savedReview = await this.reviewRepository.save(review);

        // Recalculate avgRating and reviewCount
        const { avg, count } = await this.reviewRepository
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'avg')
            .addSelect('COUNT(review.id)', 'count')
            .where('review.productId = :productId', { productId })
            .andWhere('review.isApproved = true')
            .getRawOne();

        await this.productRepository.update(productId, {
            avgRating: parseFloat(avg) || 0,
            reviewCount: parseInt(count, 10) || 0,
        });

        return savedReview;
    }

    async getProductReviews(
        productId: string, page = 1, limit = 10,
    ): Promise<{
        items: ProductReviewEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.reviewRepository.findAndCount({
            where: { productId, isApproved: true },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── WISHLIST ─────────────────────────────

    async addToWishlist(userId: string, productId: string): Promise<WishlistEntity> {
        const product = await this.productRepository.findOne({
            where: { id: productId, status: PRODUCT_STATUS.APPROVED },
        });
        if (!product) throw new NotFoundException('Product not found');

        const existing = await this.wishlistRepository.findOne({
            where: { userId, productId },
        });
        if (existing) return existing;

        const item = this.wishlistRepository.create({ userId, productId });
        return this.wishlistRepository.save(item);
    }

    async removeFromWishlist(userId: string, productId: string): Promise<void> {
        await this.wishlistRepository.delete({ userId, productId });
    }

    async getWishlist(userId: string, page = 1, limit = 20): Promise<{
        items: WishlistEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.wishlistRepository.findAndCount({
            where: { userId },
            relations: ['product', 'product.category'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── STOCK MANAGEMENT ─────────────────────

    async updateStock(
        productId: string,
        quantity: number,
        operation: 'increment' | 'decrement',
    ): Promise<void> {
        if (operation === 'decrement') {
            const result = await this.productRepository
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `"stockQuantity" - ${quantity}` })
                .where('id = :id AND "stockQuantity" >= :quantity', { id: productId, quantity })
                .execute();

            if (result.affected === 0) {
                throw new ConflictException('Insufficient stock');
            }
        } else {
            await this.productRepository
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `"stockQuantity" + ${quantity}` })
                .where('id = :id', { id: productId })
                .execute();
        }
    }

    // ─── ADMIN: DELETE PRODUCT ────────────────

    async adminDeleteProduct(productId: string): Promise<void> {
        const result = await this.productRepository.delete(productId);
        if (result.affected === 0) {
            throw new NotFoundException('Product not found');
        }
    }
}
