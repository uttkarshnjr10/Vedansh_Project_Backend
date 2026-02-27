import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentEntity } from './entities/payment.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { RefundEntity } from './entities/refund.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PaymentEntity,
            WalletTransactionEntity,
            RefundEntity,
            OrderEntity,
            OrderItemEntity,
            ProductEntity,
            UserEntity,
        ]),
        forwardRef(() => OrdersModule),
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
