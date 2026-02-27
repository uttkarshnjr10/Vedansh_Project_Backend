import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderAddressEntity } from './entities/order-address.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { UserEntity } from '../users/entities/user.entity';
import { UserAddressEntity } from '../users/entities/user-address.entity';
import { CouponEntity } from '../cart/entities/coupon.entity';
import { CouponUsageEntity } from '../cart/entities/coupon-usage.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { CartService } from '../cart/cart.service';
import { LoyaltyService } from '../cart/loyalty.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ReturnItemDto } from './dto/return-item.dto';
import {
    ORDER_STATUS,
    PAYMENT_STATUS,
    PAYMENT_METHOD,
    ORDER_ITEM_STATUS,
    CANCELLED_BY,
    RETURN_STATUS,
    REFUND_STATUS,
    PRODUCT_STATUS,
} from '../../common/constants';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(OrderAddressEntity)
        private readonly orderAddressRepository: Repository<OrderAddressEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(UserAddressEntity)
        private readonly userAddressRepository: Repository<UserAddressEntity>,
        @InjectRepository(CouponEntity)
        private readonly couponRepository: Repository<CouponEntity>,
        @InjectRepository(CouponUsageEntity)
        private readonly couponUsageRepository: Repository<CouponUsageEntity>,
        @InjectRepository(SellerEntity)
        private readonly sellerRepository: Repository<SellerEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        private readonly cartService: CartService,
        private readonly loyaltyService: LoyaltyService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) { }

    // ─── CREATE ORDER (TRANSACTIONAL) ────────

    async createOrder(
        userId: string,
        dto: CreateOrderDto,
    ): Promise<{ order: OrderEntity; razorpayOrderId: string }> {
        // 1. Validate cart
        const cartValidation = await this.cartService.validateCart(userId);
        if (!cartValidation.isValid) {
            throw new BadRequestException({
                message: 'Cart validation failed',
                errors: cartValidation.errors,
            });
        }

        const cart = cartValidation.cart;
        if (cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        // 2. Validate address
        const address = await this.userAddressRepository.findOne({
            where: { id: dto.addressId, userId },
        });
        if (!address) {
            throw new NotFoundException('Delivery address not found');
        }

        // Run everything inside a transaction
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 3. Calculate pricing with FRESH DB prices
            let subtotal = 0;
            const orderItemsData: Array<{
                product: ProductEntity;
                seller: SellerEntity;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
            }> = [];

            for (const item of cart.items) {
                if (!item.isAvailable) continue;

                const product = await queryRunner.manager.findOne(ProductEntity, {
                    where: { id: item.product.id },
                });
                if (!product || product.status !== PRODUCT_STATUS.APPROVED) {
                    throw new BadRequestException(
                        `Product "${item.product.name}" is no longer available`,
                    );
                }

                const seller = await queryRunner.manager.findOne(SellerEntity, {
                    where: { id: product.sellerId },
                });
                if (!seller) {
                    throw new BadRequestException(
                        `Seller for "${item.product.name}" not found`,
                    );
                }

                const unitPrice = Number(product.sellingPrice);
                const totalPrice = unitPrice * item.quantity;
                subtotal += totalPrice;

                orderItemsData.push({
                    product,
                    seller,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice,
                });
            }

            // 4. Calculate coupon discount
            let couponId: string | null = null;
            let couponCode: string | null = null;
            let couponDiscountAmount = 0;
            let coupon: CouponEntity | null = null;

            if (dto.couponCode) {
                const couponResult = await this.cartService.validateAndApplyCoupon(
                    userId,
                    { couponCode: dto.couponCode.toUpperCase(), cartTotal: subtotal },
                );
                if (couponResult.isValid) {
                    coupon = await queryRunner.manager.findOne(CouponEntity, {
                        where: { code: dto.couponCode.toUpperCase() },
                    });
                    couponId = coupon?.id ?? null;
                    couponCode = dto.couponCode.toUpperCase();
                    couponDiscountAmount = couponResult.discountAmount;
                }
            }

            // 5. Calculate loyalty discount
            let loyaltyPointsUsed = 0;
            let loyaltyPointsValue = 0;

            if (dto.loyaltyPointsToRedeem && dto.loyaltyPointsToRedeem > 0) {
                const loyaltyResult = await this.loyaltyService.calculateLoyaltyDiscount(
                    userId,
                    dto.loyaltyPointsToRedeem,
                    subtotal - couponDiscountAmount,
                );
                loyaltyPointsUsed = dto.loyaltyPointsToRedeem;
                loyaltyPointsValue = loyaltyResult.pointsValue;
            }

            // 6. Calculate delivery charge
            const deliveryCharge = subtotal >= 499 ? 0 : 50;

            // 7. Calculate total
            const discountAmount = couponDiscountAmount + loyaltyPointsValue;
            const totalAmount = Math.max(
                0,
                subtotal - discountAmount + deliveryCharge,
            );

            // 8. Decrement stock ATOMICALLY
            for (const item of orderItemsData) {
                const result = await queryRunner.manager
                    .createQueryBuilder()
                    .update(ProductEntity)
                    .set({
                        stockQuantity: () =>
                            `"stockQuantity" - ${item.quantity}`,
                    })
                    .where(
                        'id = :id AND "stockQuantity" >= :qty',
                        { id: item.product.id, qty: item.quantity },
                    )
                    .execute();

                if (result.affected === 0) {
                    throw new BadRequestException(
                        `"${item.product.name}" sold out during checkout`,
                    );
                }
            }

            // 9. Create Order
            const order = queryRunner.manager.create(OrderEntity, {
                userId,
                subtotal,
                deliveryCharge,
                discountAmount,
                loyaltyPointsUsed,
                loyaltyPointsValue,
                totalAmount,
                paymentMethod: dto.paymentMethod,
                paymentStatus:
                    dto.paymentMethod === PAYMENT_METHOD.COD
                        ? PAYMENT_STATUS.PENDING
                        : PAYMENT_STATUS.PENDING,
                couponId,
                couponCode,
                couponDiscountAmount,
                notes: dto.notes ?? null,
                status: ORDER_STATUS.PENDING,
            });
            const savedOrder = await queryRunner.manager.save(order);

            // 10. Create Order Address (snapshot)
            const orderAddress = queryRunner.manager.create(OrderAddressEntity, {
                orderId: savedOrder.id,
                fullName: address.fullName,
                phone: address.phone,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 ?? null,
                landmark: address.landmark ?? null,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
            });
            await queryRunner.manager.save(orderAddress);

            // 11. Create Order Items with snapshots
            for (const item of orderItemsData) {
                const commissionRate = Number(item.product.commissionRate);
                const commissionAmount =
                    Math.round(item.totalPrice * commissionRate) / 100;
                const sellerPayoutAmount = item.totalPrice - commissionAmount;

                // Get primary image
                const images = await queryRunner.manager.query(
                    `SELECT url FROM product_images WHERE "productId" = $1 AND "isPrimary" = true LIMIT 1`,
                    [item.product.id],
                );

                const orderItem = queryRunner.manager.create(OrderItemEntity, {
                    orderId: savedOrder.id,
                    productId: item.product.id,
                    sellerId: item.product.sellerId,
                    productName: item.product.name,
                    productImageUrl: images?.[0]?.url ?? null,
                    productSlug: item.product.slug,
                    sellerName: item.seller.brandName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    commissionRate,
                    commissionAmount,
                    sellerPayoutAmount,
                    itemStatus: ORDER_ITEM_STATUS.PENDING,
                });
                await queryRunner.manager.save(orderItem);
            }

            // 12. Record coupon usage
            if (coupon) {
                const usage = queryRunner.manager.create(CouponUsageEntity, {
                    couponId: coupon.id,
                    userId,
                    discountAmount: couponDiscountAmount,
                });
                await queryRunner.manager.save(usage);

                await queryRunner.manager
                    .createQueryBuilder()
                    .update(CouponEntity)
                    .set({ usedCount: () => '"usedCount" + 1' })
                    .where('id = :id', { id: coupon.id })
                    .execute();
            }

            // 13. Deduct loyalty points
            if (loyaltyPointsUsed > 0) {
                await queryRunner.manager
                    .createQueryBuilder()
                    .update(UserEntity)
                    .set({
                        loyaltyPoints: () =>
                            `"loyaltyPoints" - ${loyaltyPointsUsed}`,
                    })
                    .where('id = :id AND "loyaltyPoints" >= :pts', {
                        id: userId,
                        pts: loyaltyPointsUsed,
                    })
                    .execute();
            }

            // COMMIT
            await queryRunner.commitTransaction();

            // Post-transaction: clear cart
            await this.cartService.clearCart(userId);

            this.logger.log(
                `Order created: ${savedOrder.orderNumber} for user ${userId}, total ₹${totalAmount}`,
            );

            // COD orders auto-confirm
            if (dto.paymentMethod === PAYMENT_METHOD.COD) {
                savedOrder.status = ORDER_STATUS.CONFIRMED;
                savedOrder.paymentStatus = PAYMENT_STATUS.PENDING;
                await this.orderRepository.save(savedOrder);
            }

            return {
                order: savedOrder,
                razorpayOrderId: savedOrder.razorpayOrderId ?? 'cod_' + savedOrder.id,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // ─── CONFIRM ORDER (after payment) ──────

    async confirmOrder(
        orderId: string,
        paymentDetails: { razorpayPaymentId: string; razorpayOrderId: string },
    ): Promise<OrderEntity> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
        });
        if (!order) throw new NotFoundException('Order not found');

        order.paymentStatus = PAYMENT_STATUS.CAPTURED;
        order.status = ORDER_STATUS.CONFIRMED;
        order.razorpayOrderId = paymentDetails.razorpayOrderId;

        // Estimate delivery: 3-5 business days
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);
        order.estimatedDeliveryDate = deliveryDate;

        this.logger.log(`Order ${order.orderNumber} confirmed`);
        return this.orderRepository.save(order);
    }

    // ─── CANCEL ORDER ────────────────────────

    async cancelOrder(
        userId: string,
        orderId: string,
        dto: CancelOrderDto,
        cancelledBy: CANCELLED_BY = CANCELLED_BY.USER,
    ): Promise<OrderEntity> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items'],
        });
        if (!order) throw new NotFoundException('Order not found');

        if (cancelledBy === CANCELLED_BY.USER && order.userId !== userId) {
            throw new ForbiddenException('Not your order');
        }

        const cancellable = [
            ORDER_STATUS.PENDING,
            ORDER_STATUS.CONFIRMED,
            ORDER_STATUS.PROCESSING,
        ];
        if (!cancellable.includes(order.status)) {
            throw new BadRequestException(
                `Cannot cancel order in ${order.status} status`,
            );
        }

        // Restock products (atomic)
        for (const item of order.items) {
            await this.productRepository
                .createQueryBuilder()
                .update(ProductEntity)
                .set({
                    stockQuantity: () =>
                        `"stockQuantity" + ${item.quantity}`,
                })
                .where('id = :id', { id: item.productId })
                .execute();
        }

        // Update order
        order.status = ORDER_STATUS.CANCELLED;
        order.cancelledAt = new Date();
        order.cancelledBy = cancelledBy;
        order.cancellationReason = dto.reason;

        // Update all items
        await this.orderItemRepository.update(
            { orderId },
            { itemStatus: ORDER_ITEM_STATUS.CANCELLED },
        );

        // Refund loyalty points if used
        if (order.loyaltyPointsUsed > 0) {
            await this.userRepository
                .createQueryBuilder()
                .update(UserEntity)
                .set({
                    loyaltyPoints: () =>
                        `"loyaltyPoints" + ${order.loyaltyPointsUsed}`,
                })
                .where('id = :id', { id: order.userId })
                .execute();
        }

        this.logger.log(`Order ${order.orderNumber} cancelled by ${cancelledBy}`);

        // TODO: Phase 10 — initiate payment refund if paid
        // TODO: Phase 10 — emit 'order.cancelled' event

        return this.orderRepository.save(order);
    }

    // ─── REQUEST RETURN ──────────────────────

    async requestReturn(
        userId: string,
        dto: ReturnItemDto,
    ): Promise<OrderItemEntity> {
        const item = await this.orderItemRepository.findOne({
            where: { id: dto.orderItemId },
            relations: ['order'],
        });
        if (!item) throw new NotFoundException('Order item not found');
        if (item.order.userId !== userId) {
            throw new ForbiddenException('Not your order');
        }
        if (item.itemStatus !== ORDER_ITEM_STATUS.DELIVERED) {
            throw new BadRequestException('Item must be delivered to request return');
        }

        // Check 7-day return window
        const deliveredAt = item.order.deliveredAt;
        if (deliveredAt) {
            const daysSinceDelivery = Math.floor(
                (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24),
            );
            if (daysSinceDelivery > 7) {
                throw new BadRequestException(
                    'Return window has expired (7 days from delivery)',
                );
            }
        }

        item.returnRequestedAt = new Date();
        item.returnReason = dto.reason;
        item.returnStatus = RETURN_STATUS.REQUESTED;

        this.logger.log(`Return requested for order item ${item.id}`);

        return this.orderItemRepository.save(item);
    }

    // ─── ADMIN: PROCESS RETURN ───────────────

    async processAdminReturn(
        orderItemId: string,
        action: 'approve' | 'reject',
        _adminId: string,
    ): Promise<OrderItemEntity> {
        const item = await this.orderItemRepository.findOne({
            where: { id: orderItemId },
            relations: ['order'],
        });
        if (!item) throw new NotFoundException('Order item not found');

        if (action === 'approve') {
            item.returnStatus = RETURN_STATUS.APPROVED;
            item.refundAmount = Number(item.totalPrice);
            item.refundStatus = REFUND_STATUS.PENDING;
            item.returnedAt = new Date();

            // Restock
            await this.productRepository
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `"stockQuantity" + ${item.quantity}` })
                .where('id = :id', { id: item.productId })
                .execute();

            this.logger.log(`Return approved for item ${item.id}, refund ₹${item.refundAmount}`);
        } else {
            item.returnStatus = RETURN_STATUS.REJECTED;
            this.logger.log(`Return rejected for item ${item.id}`);
        }

        return this.orderItemRepository.save(item);
    }

    // ─── GET USER ORDERS ─────────────────────

    async getUserOrders(
        userId: string,
        page = 1,
        limit = 20,
        status?: string,
    ): Promise<{
        items: OrderEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const where: any = { userId };
        if (status) where.status = status;

        const [items, totalItems] = await this.orderRepository.findAndCount({
            where,
            relations: ['items', 'address'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── GET ORDER DETAIL ────────────────────

    async getOrderDetail(userId: string, orderId: string): Promise<OrderEntity> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, userId },
            relations: ['items', 'address'],
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    // ─── UPDATE ORDER STATUS ─────────────────

    async updateOrderStatus(
        orderId: string,
        newStatus: ORDER_STATUS,
        metadata?: { trackingId?: string; logisticsPartner?: string },
    ): Promise<OrderEntity> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items'],
        });
        if (!order) throw new NotFoundException('Order not found');

        const allowed = VALID_TRANSITIONS[order.status] ?? [];
        if (!allowed.includes(newStatus)) {
            throw new BadRequestException(
                `Cannot transition from ${order.status} to ${newStatus}`,
            );
        }

        order.status = newStatus;

        // Map order status to item status
        const itemStatusMap: Record<string, ORDER_ITEM_STATUS> = {
            [ORDER_STATUS.CONFIRMED]: ORDER_ITEM_STATUS.CONFIRMED,
            [ORDER_STATUS.PROCESSING]: ORDER_ITEM_STATUS.PROCESSING,
            [ORDER_STATUS.SHIPPED]: ORDER_ITEM_STATUS.SHIPPED,
            [ORDER_STATUS.DELIVERED]: ORDER_ITEM_STATUS.DELIVERED,
            [ORDER_STATUS.CANCELLED]: ORDER_ITEM_STATUS.CANCELLED,
        };
        const newItemStatus = itemStatusMap[newStatus];
        if (newItemStatus) {
            await this.orderItemRepository.update(
                { orderId },
                { itemStatus: newItemStatus },
            );
        }

        if (newStatus === ORDER_STATUS.SHIPPED && metadata) {
            order.trackingId = metadata.trackingId ?? null;
            order.logisticsPartner = metadata.logisticsPartner ?? null;
        }

        if (newStatus === ORDER_STATUS.DELIVERED) {
            order.deliveredAt = new Date();

            // Credit loyalty points (1 point per rupee)
            await this.loyaltyService.creditLoyaltyPoints(
                order.userId,
                order.id,
                Number(order.totalAmount),
            );
        }

        this.logger.log(`Order ${order.orderNumber} → ${newStatus}`);

        return this.orderRepository.save(order);
    }

    // ─── ADMIN: ALL ORDERS ───────────────────

    async adminGetAllOrders(
        page = 1,
        limit = 20,
        status?: string,
        sellerId?: string,
        userId?: string,
    ): Promise<{
        items: OrderEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const qb = this.orderRepository.createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.address', 'address');

        if (status) {
            qb.andWhere('order.status = :status', { status });
        }
        if (userId) {
            qb.andWhere('order.userId = :userId', { userId });
        }
        if (sellerId) {
            qb.andWhere('items.sellerId = :sellerId', { sellerId });
        }

        qb.orderBy('order.createdAt', 'DESC');

        const totalItems = await qb.getCount();
        const items = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── SELLER: MY ORDERS ───────────────────

    async getSellerOrders(
        sellerId: string,
        page = 1,
        limit = 20,
        status?: string,
    ): Promise<{
        items: OrderItemEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const where: any = { sellerId };
        if (status) where.itemStatus = status;

        const [items, totalItems] = await this.orderItemRepository.findAndCount({
            where,
            relations: ['order', 'order.address'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }
}
