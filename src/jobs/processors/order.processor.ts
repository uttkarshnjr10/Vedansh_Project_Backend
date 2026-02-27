import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../../notifications/email.service';
import { NotificationService } from '../../notifications/notification.service';
import { OrderEntity } from '../../modules/orders/entities/order.entity';
import { OrderItemEntity } from '../../modules/orders/entities/order-item.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { ORDER_QUEUE } from '../queue.constants';
import { NOTIFICATION_TYPE } from '../../common/constants';

@Processor(ORDER_QUEUE)
export class OrderProcessor {
    private readonly logger = new Logger(OrderProcessor.name);

    constructor(
        private readonly emailService: EmailService,
        private readonly notificationService: NotificationService,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    @Process('order-confirmed')
    async handleOrderConfirmed(job: Job<{ orderId: string; userId: string }>) {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: job.data.orderId },
                relations: ['items', 'address'],
            });
            if (!order) return;

            const user = await this.userRepository.findOne({
                where: { id: job.data.userId },
            });
            if (!user) return;

            // Send buyer email
            if (user.email) {
                await this.emailService.sendEmail(user.email, `Order Confirmed - #${order.orderNumber}`, 'order-confirmed', {
                    customerName: user.fullName,
                    orderNumber: order.orderNumber,
                    items: order.items.map((i) => ({ name: i.productName, quantity: i.quantity, price: i.totalPrice })),
                    subtotal: order.subtotal,
                    deliveryCharge: order.deliveryCharge,
                    discountAmount: Number(order.discountAmount) > 0 ? order.discountAmount : null,
                    totalAmount: order.totalAmount,
                    estimatedDelivery: order.estimatedDeliveryDate ?? '3-5 business days',
                });
            }

            // Create seller notifications
            const sellerIds = [...new Set(order.items.map((i) => i.sellerId))];
            for (const sellerId of sellerIds) {
                const sellerItems = order.items.filter((i) => i.sellerId === sellerId);
                const sellerAmount = sellerItems.reduce((sum, i) => sum + Number(i.sellerPayoutAmount), 0);
                await this.notificationService.createNotification(
                    sellerId,
                    NOTIFICATION_TYPE.ORDER_CONFIRMED,
                    'New Order!',
                    `You have a new order #${order.orderNumber} with ${sellerItems.length} item(s). Earnings: ₹${sellerAmount}`,
                    { orderId: order.id, amount: sellerAmount },
                );
            }
        } catch (error: any) {
            this.logger.error(`order-confirmed job failed: ${error?.message}`);
        }
    }

    @Process('order-shipped')
    async handleOrderShipped(job: Job<{ orderId: string }>) {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: job.data.orderId },
            });
            if (!order) return;

            const user = await this.userRepository.findOne({ where: { id: order.userId } });
            if (user?.email) {
                await this.emailService.sendEmail(user.email, `Order Shipped - #${order.orderNumber}`, 'order-shipped', {
                    customerName: user.fullName,
                    orderNumber: order.orderNumber,
                    trackingId: order.trackingId ?? 'N/A',
                    logisticsPartner: order.logisticsPartner ?? 'N/A',
                    estimatedDelivery: order.estimatedDeliveryDate ?? '2-3 days',
                });
            }
        } catch (error: any) {
            this.logger.error(`order-shipped job failed: ${error?.message}`);
        }
    }

    @Process('order-cancelled')
    async handleOrderCancelled(job: Job<{ orderId: string }>) {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: job.data.orderId },
            });
            if (!order) return;

            const user = await this.userRepository.findOne({ where: { id: order.userId } });
            if (user?.email) {
                await this.emailService.sendEmail(user.email, `Order Cancelled - #${order.orderNumber}`, 'order-cancelled', {
                    customerName: user.fullName,
                    orderNumber: order.orderNumber,
                    cancellationReason: order.cancellationReason ?? 'N/A',
                    refundAmount: order.totalAmount,
                    refundMethod: 'wallet',
                });
            }
        } catch (error: any) {
            this.logger.error(`order-cancelled job failed: ${error?.message}`);
        }
    }
}
