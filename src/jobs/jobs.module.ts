import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { NotificationProcessor } from './processors/notification.processor';
import { OrderProcessor } from './processors/order.processor';
import { PayoutProcessor } from './processors/payout.processor';
import {
    NOTIFICATION_QUEUE,
    ORDER_QUEUE,
    PAYOUT_QUEUE,
} from './queue.constants';
import { OrderEntity } from '../modules/orders/entities/order.entity';
import { OrderItemEntity } from '../modules/orders/entities/order-item.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { ProductEntity } from '../modules/products/entities/product.entity';
import { SellerEntity } from '../modules/sellers/entities/seller.entity';
import { CartItemEntity } from '../modules/cart/entities/cart-item.entity';

@Module({
    imports: [
        BullModule.registerQueue(
            { name: NOTIFICATION_QUEUE },
            { name: ORDER_QUEUE },
            { name: PAYOUT_QUEUE },
        ),
        TypeOrmModule.forFeature([
            OrderEntity,
            OrderItemEntity,
            UserEntity,
            ProductEntity,
            SellerEntity,
            CartItemEntity,
        ]),
    ],
    providers: [
        CronService,
        NotificationProcessor,
        OrderProcessor,
        PayoutProcessor,
    ],
    exports: [CronService],
})
export class JobsModule { }
