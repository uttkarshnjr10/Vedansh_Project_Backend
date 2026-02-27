import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ProductEntity } from '../modules/products/entities/product.entity';
import { SellerEntity } from '../modules/sellers/entities/seller.entity';
import { OrderItemEntity } from '../modules/orders/entities/order-item.entity';
import { CartItemEntity } from '../modules/cart/entities/cart-item.entity';
import { NotificationService } from '../notifications/notification.service';
import { NOTIFICATION_TYPE, PRODUCT_STATUS, PAYOUT_ITEM_STATUS, ORDER_ITEM_STATUS } from '../common/constants';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(SellerEntity)
        private readonly sellerRepository: Repository<SellerEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(CartItemEntity)
        private readonly cartItemRepository: Repository<CartItemEntity>,
        private readonly notificationService: NotificationService,
    ) { }

    // Every Monday 9AM IST
    @Cron('0 9 * * 1')
    async weeklyPayoutCron(): Promise<void> {
        this.logger.log('Starting weekly payout calculation...');
        try {
            // Query pending payouts grouped by seller
            const pendingPayouts = await this.orderItemRepository
                .createQueryBuilder('item')
                .select('item.sellerId', 'sellerId')
                .addSelect('SUM(item.sellerPayoutAmount)', 'totalAmount')
                .addSelect('COUNT(item.id)', 'itemCount')
                .where('item.payoutStatus = :status', { status: PAYOUT_ITEM_STATUS.PENDING })
                .andWhere('item.itemStatus = :delivered', { delivered: ORDER_ITEM_STATUS.DELIVERED })
                .groupBy('item.sellerId')
                .getRawMany();

            this.logger.log(`Found ${pendingPayouts.length} sellers with pending payouts`);

            for (const payout of pendingPayouts) {
                this.logger.log(
                    `Seller ${payout.sellerId}: ₹${payout.totalAmount} (${payout.itemCount} items)`,
                );
                // TODO: create PayoutEntity and queue to PAYOUT_QUEUE
            }
        } catch (error: any) {
            this.logger.error(`Weekly payout cron failed: ${error?.message}`);
        }
    }

    // Nightly 2AM — recalculate seller stats
    @Cron('0 2 * * *')
    async recalculateSellerStats(): Promise<void> {
        this.logger.log('Recalculating seller stats...');
        try {
            const sellers = await this.sellerRepository.find({ select: ['id'] });
            let updated = 0;

            for (const seller of sellers) {
                const stats = await this.orderItemRepository
                    .createQueryBuilder('item')
                    .select('SUM(item.quantity)', 'totalSold')
                    .where('item.sellerId = :id', { id: seller.id })
                    .andWhere('item.itemStatus = :delivered', { delivered: ORDER_ITEM_STATUS.DELIVERED })
                    .getRawOne();

                await this.sellerRepository.update(seller.id, {
                    totalProductsSold: Number(stats?.totalSold ?? 0),
                });
                updated++;
            }

            this.logger.log(`Seller stats recalculated for ${updated} sellers`);
        } catch (error: any) {
            this.logger.error(`Seller stats cron failed: ${error?.message}`);
        }
    }

    // Every hour — low stock alerts
    @Cron('0 * * * *')
    async lowStockAlerts(): Promise<void> {
        try {
            const lowStockProducts = await this.productRepository.find({
                where: {
                    status: PRODUCT_STATUS.APPROVED,
                    stockQuantity: LessThanOrEqual(5),
                },
                select: ['id', 'name', 'stockQuantity', 'sellerId'],
            });

            for (const product of lowStockProducts) {
                await this.notificationService.createNotification(
                    product.sellerId,
                    NOTIFICATION_TYPE.LOW_STOCK,
                    'Low Stock Alert',
                    `"${product.name}" has only ${product.stockQuantity} units left. Restock soon!`,
                    { productId: product.id, stockQuantity: product.stockQuantity },
                );
            }

            if (lowStockProducts.length > 0) {
                this.logger.log(`Low stock alerts sent for ${lowStockProducts.length} products`);
            }
        } catch (error: any) {
            this.logger.error(`Low stock cron failed: ${error?.message}`);
        }
    }

    // Nightly 3AM — abandoned cart reminders
    @Cron('0 3 * * *')
    async abandonedCartReminders(): Promise<void> {
        try {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

            const abandonedCarts = await this.cartItemRepository
                .createQueryBuilder('cart')
                .select('DISTINCT cart.userId', 'userId')
                .where('cart.addedAt < :twoHoursAgo', { twoHoursAgo })
                .getRawMany();

            for (const { userId } of abandonedCarts) {
                await this.notificationService.createNotification(
                    userId,
                    NOTIFICATION_TYPE.LOW_STOCK, // reuse type
                    'You left something in your cart! 🛒',
                    'Complete your purchase before items sell out.',
                    { type: 'abandoned_cart' },
                );
            }

            if (abandonedCarts.length > 0) {
                this.logger.log(`Abandoned cart reminders sent to ${abandonedCarts.length} users`);
            }
        } catch (error: any) {
            this.logger.error(`Abandoned cart cron failed: ${error?.message}`);
        }
    }
}
