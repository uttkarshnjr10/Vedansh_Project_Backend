import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { CouponEntity } from '../cart/entities/coupon.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { OrdersService } from '../orders/orders.service';
import {
    SELLER_STATUS,
    PRODUCT_STATUS,
    ORDER_STATUS,
    ROLES,
    PAYMENT_STATUS,
} from '../../common/constants';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(SellerEntity)
        private readonly sellerRepository: Repository<SellerEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(CouponEntity)
        private readonly couponRepository: Repository<CouponEntity>,
        private readonly analyticsService: AnalyticsService,
        private readonly ordersService: OrdersService,
    ) { }

    // ─── DASHBOARD ───────────────────────────

    async getDashboard() {
        return this.analyticsService.getAdminDashboardStats();
    }

    // ─── SELLER MANAGEMENT ───────────────────

    async getPendingSellers(page = 1, limit = 20) {
        const [items, total] = await this.sellerRepository.findAndCount({
            where: { status: SELLER_STATUS.PENDING_VERIFICATION },
            relations: ['user', 'documents'],
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: Math.min(limit, 50),
        });
        return { items, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) } };
    }

    async getPendingSellersCount(): Promise<number> {
        return this.sellerRepository.count({ where: { status: SELLER_STATUS.PENDING_VERIFICATION } });
    }

    async getAllSellers(page = 1, limit = 20, status?: string, search?: string) {
        const qb = this.sellerRepository.createQueryBuilder('seller')
            .leftJoinAndSelect('seller.user', 'user');
        if (status) qb.andWhere('seller.status = :status', { status });
        if (search) qb.andWhere('seller.brandName ILIKE :search', { search: `%${search}%` });
        qb.orderBy('seller.createdAt', 'DESC').skip((page - 1) * limit).take(Math.min(limit, 50));
        const [items, total] = await qb.getManyAndCount();
        return { items, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) } };
    }

    async getSellerDetail(sellerId: string) {
        const seller = await this.sellerRepository.findOne({
            where: { id: sellerId },
            relations: ['user', 'documents'],
        });
        if (!seller) throw new NotFoundException('Seller not found');
        return seller;
    }

    // ─── PRODUCT MANAGEMENT ──────────────────

    async getPendingProducts(page = 1, limit = 20) {
        const [items, total] = await this.productRepository.findAndCount({
            where: { status: PRODUCT_STATUS.PENDING },
            relations: ['seller', 'category'],
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: Math.min(limit, 50),
        });
        return { items, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) } };
    }

    async getPendingProductsCount(): Promise<number> {
        return this.productRepository.count({ where: { status: PRODUCT_STATUS.PENDING } });
    }

    async getAllProducts(page = 1, limit = 20, status?: string, search?: string, sellerId?: string) {
        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.seller', 'seller')
            .leftJoinAndSelect('product.category', 'category');
        if (status) qb.andWhere('product.status = :status', { status });
        if (search) qb.andWhere('product.name ILIKE :search', { search: `%${search}%` });
        if (sellerId) qb.andWhere('product.sellerId = :sellerId', { sellerId });
        qb.orderBy('product.createdAt', 'DESC').skip((page - 1) * limit).take(Math.min(limit, 50));
        const [items, total] = await qb.getManyAndCount();
        return { items, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) } };
    }

    async getProductDetail(productId: string) {
        const product = await this.productRepository.findOne({
            where: { id: productId },
            relations: ['seller', 'category', 'images', 'certificates'],
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    // ─── ORDER MANAGEMENT ────────────────────

    async getAllOrders(page = 1, limit = 20, status?: string, dateFrom?: string, dateTo?: string, sellerId?: string) {
        return this.ordersService.adminGetAllOrders(page, Math.min(limit, 50), status, sellerId);
    }

    async getOrderDetail(orderId: string) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'address', 'user'],
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    async updateOrderStatus(orderId: string, status: ORDER_STATUS, adminId: string) {
        this.logger.log(`Admin ${adminId} updating order ${orderId} to ${status}`);
        return this.ordersService.updateOrderStatus(orderId, status);
    }

    // ─── USER MANAGEMENT ─────────────────────

    async getAllUsers(page = 1, limit = 20, search?: string, role?: string) {
        const qb = this.userRepository.createQueryBuilder('user')
            .select(['user.id', 'user.phone', 'user.email', 'user.fullName', 'user.role', 'user.isActive', 'user.createdAt']);
        if (search) qb.andWhere('(user.fullName ILIKE :s OR user.phone ILIKE :s)', { s: `%${search}%` });
        if (role) qb.andWhere('user.role = :role', { role });
        qb.orderBy('user.createdAt', 'DESC').skip((page - 1) * limit).take(Math.min(limit, 50));
        const [items, total] = await qb.getManyAndCount();
        return { items, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) } };
    }

    async suspendUser(userId: string, reason: string, adminId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        if (user.role === ROLES.ADMIN) throw new BadRequestException('Cannot suspend admin');
        await this.userRepository.update(userId, { isActive: false } as any);
        this.logger.warn(`Admin ${adminId} suspended user ${userId}: ${reason}`);
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async unsuspendUser(userId: string, adminId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        await this.userRepository.update(userId, { isActive: true } as any);
        this.logger.log(`Admin ${adminId} unsuspended user ${userId}`);
        return this.userRepository.findOne({ where: { id: userId } });
    }

    // ─── ANALYTICS ───────────────────────────

    async getRevenueSummary(dateFrom: string, dateTo: string) {
        const from = new Date(dateFrom);
        const to = new Date(dateTo);

        const revenue = await this.orderRepository
            .createQueryBuilder('o')
            .select('COALESCE(SUM(o.totalAmount), 0)', 'totalRevenue')
            .addSelect('COUNT(o.id)', 'totalOrders')
            .where('o.createdAt BETWEEN :from AND :to', { from, to })
            .andWhere('o.paymentStatus = :status', { status: PAYMENT_STATUS.CAPTURED })
            .getRawOne();

        const commissions = await this.orderItemRepository
            .createQueryBuilder('item')
            .select('COALESCE(SUM(item.commissionAmount), 0)', 'totalCommission')
            .addSelect('COALESCE(SUM(item.sellerPayoutAmount), 0)', 'totalSellerPayouts')
            .innerJoin('item.order', 'order')
            .where('order.createdAt BETWEEN :from AND :to', { from, to })
            .andWhere('order.paymentStatus = :status', { status: PAYMENT_STATUS.CAPTURED })
            .getRawOne();

        return {
            dateFrom,
            dateTo,
            totalRevenue: Number(revenue?.totalRevenue ?? 0),
            totalOrders: Number(revenue?.totalOrders ?? 0),
            totalCommission: Number(commissions?.totalCommission ?? 0),
            totalSellerPayouts: Number(commissions?.totalSellerPayouts ?? 0),
        };
    }

    // ─── COUPON MANAGEMENT ───────────────────

    async getAllCoupons(page = 1, limit = 20, isActive?: boolean) {
        const qb = this.couponRepository.createQueryBuilder('coupon');
        if (isActive !== undefined) qb.andWhere('coupon.isActive = :isActive', { isActive });
        qb.orderBy('coupon.createdAt', 'DESC').skip((page - 1) * limit).take(Math.min(limit, 50));
        const [items, total] = await qb.getManyAndCount();
        return { items, meta: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) } };
    }

    async createCoupon(dto: Partial<CouponEntity>, adminId: string) {
        const existing = await this.couponRepository.findOne({ where: { code: dto.code } });
        if (existing) throw new BadRequestException('Coupon code already exists');
        const coupon = this.couponRepository.create(dto);
        this.logger.log(`Admin ${adminId} created coupon ${dto.code}`);
        return this.couponRepository.save(coupon);
    }

    async updateCoupon(couponId: string, dto: Partial<CouponEntity>) {
        const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
        if (!coupon) throw new NotFoundException('Coupon not found');
        Object.assign(coupon, dto);
        return this.couponRepository.save(coupon);
    }

    async deactivateCoupon(couponId: string, adminId: string) {
        const coupon = await this.couponRepository.findOne({ where: { id: couponId } });
        if (!coupon) throw new NotFoundException('Coupon not found');
        coupon.isActive = false;
        this.logger.log(`Admin ${adminId} deactivated coupon ${coupon.code}`);
        return this.couponRepository.save(coupon);
    }

    // ─── PAYOUT TRIGGER ─────────────────────

    async triggerWeeklyPayouts(adminId: string) {
        this.logger.warn(`Admin ${adminId} manually triggered weekly payouts`);
        // TODO: call cronService.weeklyPayoutCron() when injected
        return { message: 'Weekly payout job queued', triggeredBy: adminId, triggeredAt: new Date() };
    }
}
