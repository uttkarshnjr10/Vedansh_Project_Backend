import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { PaymentEntity } from './entities/payment.entity';
import {
    WalletTransactionEntity,
    WalletTransactionType,
    WalletReferenceType,
} from './entities/wallet-transaction.entity';
import { RefundEntity, RefundStatus, RefundMethod } from './entities/refund.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrdersService } from '../orders/orders.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import {
    PAYMENT_STATUS,
    PAYMENT_METHOD,
    ORDER_STATUS,
    ORDER_ITEM_STATUS,
} from '../../common/constants';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private razorpay: any;

    constructor(
        @InjectRepository(PaymentEntity)
        private readonly paymentRepository: Repository<PaymentEntity>,
        @InjectRepository(WalletTransactionEntity)
        private readonly walletTxRepository: Repository<WalletTransactionEntity>,
        @InjectRepository(RefundEntity)
        private readonly refundRepository: Repository<RefundEntity>,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderItemEntity)
        private readonly orderItemRepository: Repository<OrderItemEntity>,
        @InjectRepository(ProductEntity)
        private readonly productRepository: Repository<ProductEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @Inject(forwardRef(() => OrdersService))
        private readonly ordersService: OrdersService,
        private readonly configService: ConfigService,
    ) {
        // Initialize Razorpay (lazy — only if keys are configured)
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (keyId && keySecret) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const Razorpay = require('razorpay');
                this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
                this.logger.log('Razorpay initialized');
            } catch (e) {
                this.logger.warn('Razorpay SDK not available, using stubs');
            }
        } else {
            this.logger.warn('Razorpay keys not configured — payment stubs active');
        }
    }

    // ─── CREATE RAZORPAY ORDER ───────────────

    async createRazorpayOrder(order: OrderEntity): Promise<string> {
        const amountPaise = Math.round(Number(order.totalAmount) * 100);

        if (this.razorpay) {
            try {
                const razorpayOrder = await this.razorpay.orders.create({
                    amount: amountPaise,
                    currency: 'INR',
                    receipt: order.orderNumber,
                    notes: { orderId: order.id, userId: order.userId },
                });

                // Save payment record
                const payment = this.paymentRepository.create({
                    orderId: order.id,
                    userId: order.userId,
                    amount: Number(order.totalAmount),
                    amountPaise,
                    paymentMethod: order.paymentMethod,
                    status: PAYMENT_STATUS.PENDING,
                    razorpayOrderId: razorpayOrder.id,
                });
                await this.paymentRepository.save(payment);

                // Update order with Razorpay order ID
                await this.orderRepository.update(order.id, {
                    razorpayOrderId: razorpayOrder.id,
                });

                this.logger.log(`Razorpay order created: ${razorpayOrder.id} for order ${order.orderNumber}`);
                return razorpayOrder.id;
            } catch (error: any) {
                this.logger.error('Razorpay order creation failed', error?.message);
                throw new BadRequestException('Failed to create payment order');
            }
        }

        // Stub mode — no Razorpay keys
        const stubId = `stub_${order.id.slice(0, 8)}`;
        const payment = this.paymentRepository.create({
            orderId: order.id,
            userId: order.userId,
            amount: Number(order.totalAmount),
            amountPaise,
            paymentMethod: order.paymentMethod,
            status: PAYMENT_STATUS.PENDING,
            razorpayOrderId: stubId,
        });
        await this.paymentRepository.save(payment);
        await this.orderRepository.update(order.id, { razorpayOrderId: stubId });

        this.logger.warn(`Stub Razorpay order: ${stubId}`);
        return stubId;
    }

    // ─── VERIFY PAYMENT (client-side) ────────

    async verifyPayment(
        dto: VerifyPaymentDto,
    ): Promise<{ success: boolean; order: OrderEntity }> {
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (keySecret) {
            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
                .digest('hex');

            if (expectedSignature !== dto.razorpaySignature) {
                this.logger.warn(
                    `Invalid payment signature for order ${dto.razorpayOrderId}`,
                );
                throw new UnauthorizedException('Payment signature invalid');
            }
        }

        // Find payment
        const payment = await this.paymentRepository.findOne({
            where: { razorpayOrderId: dto.razorpayOrderId },
        });
        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        // Update payment
        payment.status = PAYMENT_STATUS.CAPTURED;
        payment.razorpayPaymentId = dto.razorpayPaymentId;
        payment.razorpaySignature = dto.razorpaySignature;
        payment.paidAt = new Date();
        await this.paymentRepository.save(payment);

        // Confirm order
        const order = await this.ordersService.confirmOrder(payment.orderId, {
            razorpayPaymentId: dto.razorpayPaymentId,
            razorpayOrderId: dto.razorpayOrderId,
        });

        this.logger.log(
            `Payment verified: ${dto.razorpayPaymentId} for order ${payment.orderId}`,
        );

        return { success: true, order };
    }

    // ─── WEBHOOK HANDLER ─────────────────────

    async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
        const webhookSecret = this.configService.get<string>(
            'RAZORPAY_WEBHOOK_SECRET',
        );

        // Verify signature
        if (webhookSecret) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (expectedSignature !== signature) {
                this.logger.error('Invalid webhook signature — potential attack');
                throw new UnauthorizedException('Webhook signature invalid');
            }
        }

        const event = JSON.parse(rawBody.toString());
        const eventType: string = event.event;

        this.logger.log(`Webhook received: ${eventType}`);

        try {
            switch (eventType) {
                case 'payment.captured':
                    await this.handlePaymentCaptured(event.payload?.payment?.entity);
                    break;
                case 'payment.failed':
                    await this.handlePaymentFailed(event.payload?.payment?.entity);
                    break;
                case 'refund.processed':
                    await this.handleRefundProcessed(event.payload?.refund?.entity);
                    break;
                case 'refund.failed':
                    await this.handleRefundFailed(event.payload?.refund?.entity);
                    break;
                default:
                    this.logger.log(`Unhandled webhook event: ${eventType}`);
            }
        } catch (error: any) {
            // Never throw from webhook — Razorpay needs 200 always
            this.logger.error(
                `Webhook handler error for ${eventType}: ${error?.message}`,
            );
        }
    }

    private async handlePaymentCaptured(paymentData: any): Promise<void> {
        if (!paymentData?.order_id) return;

        const payment = await this.paymentRepository.findOne({
            where: { razorpayOrderId: paymentData.order_id },
        });
        if (!payment) {
            this.logger.warn(`Payment not found for Razorpay order: ${paymentData.order_id}`);
            return;
        }
        if (payment.status === PAYMENT_STATUS.CAPTURED) {
            this.logger.log('Payment already captured (idempotent)');
            return;
        }

        payment.status = PAYMENT_STATUS.CAPTURED;
        payment.razorpayPaymentId = paymentData.id;
        payment.paidAt = new Date();
        payment.gatewayResponse = paymentData;
        await this.paymentRepository.save(payment);

        // Confirm order
        await this.ordersService.confirmOrder(payment.orderId, {
            razorpayPaymentId: paymentData.id,
            razorpayOrderId: paymentData.order_id,
        });
    }

    private async handlePaymentFailed(paymentData: any): Promise<void> {
        if (!paymentData?.order_id) return;

        const payment = await this.paymentRepository.findOne({
            where: { razorpayOrderId: paymentData.order_id },
        });
        if (!payment) return;

        payment.status = PAYMENT_STATUS.FAILED;
        payment.failureReason = paymentData.error_description ?? 'Payment failed';
        payment.gatewayResponse = paymentData;
        await this.paymentRepository.save(payment);

        // Restock: get order items and restock
        const items = await this.orderItemRepository.find({
            where: { orderId: payment.orderId },
        });
        for (const item of items) {
            await this.productRepository
                .createQueryBuilder()
                .update(ProductEntity)
                .set({ stockQuantity: () => `"stockQuantity" + ${item.quantity}` })
                .where('id = :id', { id: item.productId })
                .execute();
        }

        await this.orderRepository.update(payment.orderId, {
            status: ORDER_STATUS.FAILED,
            paymentStatus: PAYMENT_STATUS.FAILED,
        });
        await this.orderItemRepository.update(
            { orderId: payment.orderId },
            { itemStatus: ORDER_ITEM_STATUS.CANCELLED },
        );

        this.logger.log(`Payment failed for order ${payment.orderId}: ${payment.failureReason}`);
    }

    private async handleRefundProcessed(refundData: any): Promise<void> {
        if (!refundData?.id) return;
        const refund = await this.refundRepository.findOne({
            where: { razorpayRefundId: refundData.id },
        });
        if (!refund) return;

        refund.status = RefundStatus.COMPLETED;
        refund.processedAt = new Date();
        await this.refundRepository.save(refund);

        this.logger.log(`Refund completed: ${refundData.id}`);
    }

    private async handleRefundFailed(refundData: any): Promise<void> {
        if (!refundData?.id) return;
        const refund = await this.refundRepository.findOne({
            where: { razorpayRefundId: refundData.id },
        });
        if (!refund) return;

        refund.status = RefundStatus.FAILED;
        refund.failureReason = 'Refund failed via Razorpay';
        await this.refundRepository.save(refund);

        this.logger.error(`Refund FAILED: ${refundData.id} — needs manual intervention`);
    }

    // ─── WALLET PAYMENT ──────────────────────

    async processWalletPayment(
        userId: string,
        orderId: string,
        amount: number,
    ): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'walletBalance'],
        });
        if (!user) throw new NotFoundException('User not found');

        const balance = Number(user.walletBalance);
        if (balance < amount) {
            throw new BadRequestException(
                `Insufficient wallet balance. Available: ₹${balance}`,
            );
        }

        // Record transaction
        const tx = this.walletTxRepository.create({
            userId,
            type: WalletTransactionType.DEBIT,
            amount,
            balanceBefore: balance,
            balanceAfter: balance - amount,
            referenceType: WalletReferenceType.ORDER_PAYMENT,
            referenceId: orderId,
            description: `Payment for order`,
        });
        await this.walletTxRepository.save(tx);

        // Atomic deduct
        const result = await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({ walletBalance: () => `"walletBalance" - ${amount}` })
            .where('id = :id AND "walletBalance" >= :amount', { id: userId, amount })
            .execute();

        if (result.affected === 0) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        // Save payment record
        const payment = this.paymentRepository.create({
            orderId,
            userId,
            amount,
            amountPaise: Math.round(amount * 100),
            paymentMethod: PAYMENT_METHOD.WALLET,
            status: PAYMENT_STATUS.CAPTURED,
            paidAt: new Date(),
        });
        await this.paymentRepository.save(payment);

        // Confirm order immediately
        await this.ordersService.confirmOrder(orderId, {
            razorpayPaymentId: `wallet_${orderId}`,
            razorpayOrderId: `wallet_${orderId}`,
        });

        this.logger.log(`Wallet payment ₹${amount} for order ${orderId}`);
    }

    // ─── PROCESS REFUND ──────────────────────

    async processRefund(
        orderId: string,
        amount: number,
        method: 'wallet' | 'original_payment_method',
        reason: string,
        orderItemId?: string,
    ): Promise<RefundEntity> {
        const payment = await this.paymentRepository.findOne({
            where: { orderId },
        });

        const order = await this.orderRepository.findOne({
            where: { id: orderId },
        });
        if (!order) throw new NotFoundException('Order not found');

        const refund = this.refundRepository.create({
            orderId,
            orderItemId: orderItemId ?? null,
            userId: order.userId,
            amount,
            reason,
            refundMethod: method === 'wallet' ? RefundMethod.WALLET : RefundMethod.ORIGINAL_PAYMENT_METHOD,
            status: RefundStatus.PENDING,
        });

        if (method === 'wallet') {
            // Credit to wallet
            const user = await this.userRepository.findOne({
                where: { id: order.userId },
                select: ['id', 'walletBalance'],
            });
            if (!user) throw new NotFoundException('User not found');

            const balance = Number(user.walletBalance);
            const tx = this.walletTxRepository.create({
                userId: order.userId,
                type: WalletTransactionType.CREDIT,
                amount,
                balanceBefore: balance,
                balanceAfter: balance + amount,
                referenceType: WalletReferenceType.REFUND,
                referenceId: orderId,
                description: `Refund for order ${order.orderNumber}`,
            });
            await this.walletTxRepository.save(tx);

            await this.userRepository
                .createQueryBuilder()
                .update(UserEntity)
                .set({ walletBalance: () => `"walletBalance" + ${amount}` })
                .where('id = :id', { id: order.userId })
                .execute();

            refund.status = RefundStatus.COMPLETED;
            refund.processedAt = new Date();

            this.logger.log(`Wallet refund ₹${amount} for order ${orderId}`);
        } else {
            // Razorpay refund
            if (this.razorpay && payment?.razorpayPaymentId) {
                try {
                    const razorpayRefund = await this.razorpay.payments.refund(
                        payment.razorpayPaymentId,
                        { amount: Math.round(amount * 100) },
                    );
                    refund.razorpayRefundId = razorpayRefund.id;
                    refund.status = RefundStatus.PROCESSING;
                    this.logger.log(`Razorpay refund initiated: ${razorpayRefund.id}`);
                } catch (error: any) {
                    this.logger.error(`Razorpay refund failed: ${error?.message}`);
                    refund.status = RefundStatus.FAILED;
                    refund.failureReason = error?.message;
                }
            } else {
                refund.status = RefundStatus.PROCESSING;
                this.logger.warn(`Razorpay refund stub for order ${orderId}`);
            }
        }

        return this.refundRepository.save(refund);
    }

    // ─── WALLET HISTORY ──────────────────────

    async getWalletHistory(
        userId: string,
        page = 1,
        limit = 20,
    ): Promise<{
        items: WalletTransactionEntity[];
        meta: { page: number; limit: number; totalItems: number; totalPages: number };
    }> {
        const [items, totalItems] = await this.walletTxRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items,
            meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
        };
    }

    // ─── GET PAYMENT DETAILS ─────────────────

    async getPaymentDetails(orderId: string, userId: string): Promise<PaymentEntity> {
        const payment = await this.paymentRepository.findOne({
            where: { orderId, userId },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }
}
