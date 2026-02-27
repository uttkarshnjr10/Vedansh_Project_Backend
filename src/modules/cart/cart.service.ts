import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CartItemEntity } from './entities/cart-item.entity';
import { CouponEntity, DiscountType } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { PRODUCT_STATUS } from '../../common/constants';

// ─── INTERFACES ─────────────────────────────

export interface CartItemDetail {
    cartItemId: string;
    product: {
        id: string;
        slug: string;
        name: string;
        primaryImageUrl: string | null;
        sellingPrice: number;
        mrp: number;
        stockQuantity: number;
        status: string;
        sellerId: string;
        badges: string[];
    };
    quantity: number;
    itemTotal: number;
    isAvailable: boolean;
}

export interface CartSummary {
    items: CartItemDetail[];
    subtotal: number;
    unavailableItems: CartItemDetail[];
    itemCount: number;
    uniqueItemCount: number;
}

export interface CartValidationResult {
    isValid: boolean;
    errors: Array<{
        productId: string;
        productName: string;
        error: 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'INSUFFICIENT_STOCK' | 'PRODUCT_UNAVAILABLE';
    }>;
    cart: CartSummary;
}

export interface CouponValidationResult {
    isValid: boolean;
    discountAmount: number;
    discountType: string;
    finalTotal: number;
    message: string;
}

@Injectable()
export class CartService {
    private readonly logger = new Logger(CartService.name);

    constructor(
        @InjectRepository(CartItemEntity)
        private readonly cartItemRepository: Repository<CartItemEntity>,
        @InjectRepository(CouponEntity)
        private readonly couponRepository: Repository<CouponEntity>,
        @InjectRepository(CouponUsageEntity)
        private readonly couponUsageRepository: Repository<CouponUsageEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
    ) { }

    // ─── GET CART ────────────────────────────

    async getCart(userId: string): Promise<CartSummary> {
        const cartItems = await this.cartItemRepository.find({
            where: { userId },
            relations: ['product', 'product.images'],
            order: { addedAt: 'DESC' },
        });

        const items: CartItemDetail[] = cartItems.map((item) => {
            const product = item.product;
            const primaryImage = product.images?.find((img) => img.isPrimary)
                ?? product.images?.[0];

            const isAvailable =
                product.status === PRODUCT_STATUS.APPROVED &&
                product.stockQuantity >= item.quantity;

            return {
                cartItemId: item.id,
                product: {
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    primaryImageUrl: primaryImage?.url ?? null,
                    sellingPrice: Number(product.sellingPrice),
                    mrp: Number(product.mrp),
                    stockQuantity: product.stockQuantity,
                    status: product.status,
                    sellerId: product.sellerId,
                    badges: product.badges ?? [],
                },
                quantity: item.quantity,
                itemTotal: Number(product.sellingPrice) * item.quantity,
                isAvailable,
            };
        });

        const availableItems = items.filter((i) => i.isAvailable);
        const unavailableItems = items.filter((i) => !i.isAvailable);

        return {
            items,
            subtotal: availableItems.reduce((sum, i) => sum + i.itemTotal, 0),
            unavailableItems,
            itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
            uniqueItemCount: items.length,
        };
    }

    // ─── ADD TO CART ─────────────────────────

    async addToCart(userId: string, dto: AddToCartDto): Promise<CartSummary> {
        // Validate product
        const product = await this.productRepository.findOne({
            where: { id: dto.productId, status: PRODUCT_STATUS.APPROVED },
        });
        if (!product) {
            throw new NotFoundException('Product not found or not available');
        }
        if (product.stockQuantity < dto.quantity) {
            throw new BadRequestException(
                `Only ${product.stockQuantity} items available`,
            );
        }

        // Upsert: check if item already in cart
        const existing = await this.cartItemRepository.findOne({
            where: { userId, productId: dto.productId },
        });

        if (existing) {
            const newQuantity = existing.quantity + dto.quantity;
            const capped = Math.min(newQuantity, product.stockQuantity);
            existing.quantity = capped;
            await this.cartItemRepository.save(existing);
        } else {
            const item = this.cartItemRepository.create({
                userId,
                productId: dto.productId,
                quantity: dto.quantity,
            });
            await this.cartItemRepository.save(item);
        }

        return this.getCart(userId);
    }

    // ─── UPDATE CART ITEM ────────────────────

    async updateCartItem(
        userId: string,
        cartItemId: string,
        dto: UpdateCartItemDto,
    ): Promise<CartSummary> {
        const item = await this.cartItemRepository.findOne({
            where: { id: cartItemId, userId },
        });
        if (!item) {
            throw new NotFoundException('Cart item not found');
        }

        // Quantity = 0 means remove
        if (dto.quantity === 0) {
            await this.cartItemRepository.remove(item);
            return this.getCart(userId);
        }

        // Validate stock
        const product = await this.productRepository.findOne({
            where: { id: item.productId },
        });
        if (product && dto.quantity > product.stockQuantity) {
            throw new BadRequestException(
                `Only ${product.stockQuantity} items available`,
            );
        }

        item.quantity = dto.quantity;
        await this.cartItemRepository.save(item);

        return this.getCart(userId);
    }

    // ─── REMOVE FROM CART ────────────────────

    async removeFromCart(userId: string, cartItemId: string): Promise<CartSummary> {
        const item = await this.cartItemRepository.findOne({
            where: { id: cartItemId, userId },
        });
        if (!item) {
            throw new NotFoundException('Cart item not found');
        }

        await this.cartItemRepository.remove(item);
        return this.getCart(userId);
    }

    // ─── CLEAR CART ──────────────────────────

    async clearCart(userId: string): Promise<void> {
        await this.cartItemRepository.delete({ userId });
    }

    // ─── VALIDATE CART (pre-checkout) ────────

    async validateCart(userId: string): Promise<CartValidationResult> {
        const cartItems = await this.cartItemRepository.find({
            where: { userId },
            relations: ['product'],
        });

        const errors: CartValidationResult['errors'] = [];

        // Re-query fresh product data (not cached)
        for (const item of cartItems) {
            const freshProduct = await this.productRepository.findOne({
                where: { id: item.productId },
            });

            if (!freshProduct || freshProduct.status !== PRODUCT_STATUS.APPROVED) {
                errors.push({
                    productId: item.productId,
                    productName: item.product?.name ?? 'Unknown',
                    error: 'PRODUCT_UNAVAILABLE',
                });
                continue;
            }

            if (freshProduct.stockQuantity === 0) {
                errors.push({
                    productId: item.productId,
                    productName: freshProduct.name,
                    error: 'OUT_OF_STOCK',
                });
            } else if (freshProduct.stockQuantity < item.quantity) {
                errors.push({
                    productId: item.productId,
                    productName: freshProduct.name,
                    error: 'INSUFFICIENT_STOCK',
                });
            }

            // Detect price changes (compare stored vs fresh)
            if (
                item.product &&
                Number(item.product.sellingPrice) !== Number(freshProduct.sellingPrice)
            ) {
                errors.push({
                    productId: item.productId,
                    productName: freshProduct.name,
                    error: 'PRICE_CHANGED',
                });
            }
        }

        const cart = await this.getCart(userId);

        return {
            isValid: errors.length === 0,
            errors,
            cart,
        };
    }

    // ─── VALIDATE & APPLY COUPON ─────────────

    async validateAndApplyCoupon(
        userId: string,
        dto: ValidateCouponDto,
    ): Promise<CouponValidationResult> {
        const fail = (message: string): CouponValidationResult => ({
            isValid: false,
            discountAmount: 0,
            discountType: '',
            finalTotal: dto.cartTotal,
            message,
        });

        // 1. Find coupon
        const coupon = await this.couponRepository.findOne({
            where: { code: dto.couponCode },
        });
        if (!coupon || !coupon.isActive) {
            return fail('Invalid or expired coupon code');
        }

        // 2. Check validity period
        const now = new Date();
        if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
            return fail('This coupon is no longer valid');
        }

        // 3. Check minimum order amount
        if (dto.cartTotal < Number(coupon.minimumOrderAmount)) {
            return fail(
                `Minimum order amount of ₹${coupon.minimumOrderAmount} required`,
            );
        }

        // 4. Check global usage limit
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            return fail('This coupon has reached its usage limit');
        }

        // 5. Check per-user usage limit
        const userUsageCount = await this.couponUsageRepository.count({
            where: { couponId: coupon.id, userId },
        });
        if (userUsageCount >= coupon.usageLimitPerUser) {
            return fail('You have already used this coupon');
        }

        // 6. Check applicable categories (if set)
        if (coupon.applicableCategories?.length) {
            const cartItems = await this.cartItemRepository.find({
                where: { userId },
                relations: ['product'],
            });
            const cartCategoryIds = cartItems.map((i) => i.product?.categoryId).filter(Boolean);
            const hasApplicable = cartCategoryIds.some((catId) =>
                coupon.applicableCategories!.includes(catId as string),
            );
            if (!hasApplicable) {
                return fail('This coupon is not applicable to items in your cart');
            }
        }

        // 7. Calculate discount
        let discountAmount = 0;

        switch (coupon.discountType) {
            case DiscountType.PERCENTAGE:
                discountAmount = (dto.cartTotal * Number(coupon.discountValue)) / 100;
                // Apply cap
                if (
                    coupon.maximumDiscountAmount !== null &&
                    discountAmount > Number(coupon.maximumDiscountAmount)
                ) {
                    discountAmount = Number(coupon.maximumDiscountAmount);
                }
                break;

            case DiscountType.FIXED_AMOUNT:
                discountAmount = Math.min(
                    Number(coupon.discountValue),
                    dto.cartTotal,
                );
                break;

            case DiscountType.FREE_DELIVERY:
                discountAmount = 0; // handled at checkout
                break;
        }

        discountAmount = Math.round(discountAmount * 100) / 100;
        const finalTotal = Math.max(0, dto.cartTotal - discountAmount);

        return {
            isValid: true,
            discountAmount,
            discountType: coupon.discountType,
            finalTotal,
            message: coupon.description ?? `Coupon ${coupon.code} applied!`,
        };
    }
}
