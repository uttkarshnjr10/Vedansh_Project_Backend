import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { AnalyticsDailySnapshotEntity } from './entities/analytics-daily-snapshot.entity';
import {
    ORDER_STATUS,
    PAYMENT_STATUS,
    SELLER_STATUS,
    PRODUCT_STATUS,
} from '../../common/constants';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(SellerEntity)
        private readonly sellerRepository: Repository<SellerEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(AnalyticsDailySnapshotEntity)
        private readonly snapshotRepository: Repository<AnalyticsDailySnapshotEntity>,
    ) { }

    async getAdminDashboardStats(): Promise<Record<string, any>> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Today
        const todayOrders = await this.orderRepository.count({
            where: { createdAt: MoreThanOrEqual(todayStart), paymentStatus: PAYMENT_STATUS.CAPTURED },
        });
        const todayRevenue = await this.orderRepository
            .createQueryBuilder('o')
            .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
            .where('o.createdAt >= :start', { start: todayStart })
            .andWhere('o.paymentStatus = :status', { status: PAYMENT_STATUS.CAPTURED })
            .getRawOne();

        // This month
        const monthOrders = await this.orderRepository.count({
            where: { createdAt: MoreThanOrEqual(monthStart), paymentStatus: PAYMENT_STATUS.CAPTURED },
        });
        const monthRevenue = await this.orderRepository
            .createQueryBuilder('o')
            .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
            .where('o.createdAt >= :start', { start: monthStart })
            .andWhere('o.paymentStatus = :status', { status: PAYMENT_STATUS.CAPTURED })
            .getRawOne();

        // All time
        const totalOrders = await this.orderRepository.count({
            where: { paymentStatus: PAYMENT_STATUS.CAPTURED },
        });
        const totalRevenue = await this.orderRepository
            .createQueryBuilder('o')
            .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
            .where('o.paymentStatus = :status', { status: PAYMENT_STATUS.CAPTURED })
            .getRawOne();

        const totalSellers = await this.sellerRepository.count({
            where: { status: SELLER_STATUS.APPROVED },
        });
        const totalBuyers = await this.userRepository.count();
        const totalProducts = await this.productRepository.count({
            where: { status: PRODUCT_STATUS.APPROVED },
        });

        // Revenue chart (last 30 days)
        const revenueChart = await this.orderRepository
            .createQueryBuilder('o')
            .select("DATE(o.createdAt)", 'date')
            .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
            .addSelect('COUNT(o.id)', 'orders')
            .where('o.createdAt >= :start', { start: thirtyDaysAgo })
            .andWhere('o.paymentStatus = :status', { status: PAYMENT_STATUS.CAPTURED })
            .groupBy("DATE(o.createdAt)")
            .orderBy("DATE(o.createdAt)", 'ASC')
            .getRawMany();

        // Top selling products
        const topSellingProducts = await this.orderItemRepository
            .createQueryBuilder('item')
            .select('item.productName', 'name')
            .addSelect('SUM(item.quantity)', 'totalSold')
            .addSelect('SUM(item.totalPrice)', 'totalRevenue')
            .groupBy('item.productName')
            .orderBy('SUM(item.quantity)', 'DESC')
            .limit(10)
            .getRawMany();

        // Pending approvals
        const pendingSellers = await this.sellerRepository.count({
            where: { status: SELLER_STATUS.PENDING_VERIFICATION },
        });
        const pendingProducts = await this.productRepository.count({
            where: { status: PRODUCT_STATUS.PENDING },
        });

        // Recent orders
        const recentOrders = await this.orderRepository.find({
            order: { createdAt: 'DESC' },
            take: 10,
            select: ['id', 'orderNumber', 'totalAmount', 'status', 'paymentStatus', 'createdAt'],
        });

        return {
            today: { revenue: Number(todayRevenue?.revenue ?? 0), orders: todayOrders },
            thisMonth: { revenue: Number(monthRevenue?.revenue ?? 0), orders: monthOrders },
            allTime: {
                totalRevenue: Number(totalRevenue?.revenue ?? 0),
                totalOrders,
                totalSellers,
                totalBuyers,
                totalProducts,
            },
            revenueChart,
            topSellingProducts,
            pendingApprovals: { sellers: pendingSellers, products: pendingProducts },
            recentOrders,
        };
    }

    async getSellerAnalytics(
        sellerId: string,
        period: 'week' | 'month' | 'year' = 'month',
    ): Promise<Record<string, any>> {
        const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
        const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

        const revenue = await this.orderItemRepository
            .createQueryBuilder('item')
            .select('COALESCE(SUM(item.sellerPayoutAmount), 0)', 'revenue')
            .addSelect('COUNT(item.id)', 'orders')
            .addSelect('SUM(item.quantity)', 'unitsSold')
            .where('item.sellerId = :sellerId', { sellerId })
            .andWhere('item.createdAt >= :start', { start: startDate })
            .getRawOne();

        const topProducts = await this.orderItemRepository
            .createQueryBuilder('item')
            .select('item.productName', 'name')
            .addSelect('SUM(item.quantity)', 'sold')
            .addSelect('SUM(item.sellerPayoutAmount)', 'revenue')
            .where('item.sellerId = :sellerId', { sellerId })
            .andWhere('item.createdAt >= :start', { start: startDate })
            .groupBy('item.productName')
            .orderBy('SUM(item.quantity)', 'DESC')
            .limit(10)
            .getRawMany();

        return {
            period,
            revenue: Number(revenue?.revenue ?? 0),
            totalOrders: Number(revenue?.orders ?? 0),
            unitsSold: Number(revenue?.unitsSold ?? 0),
            topProducts,
        };
    }
}
