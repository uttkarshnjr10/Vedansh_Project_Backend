import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController, AdminOrdersController } from './orders.controller';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderAddressEntity } from './entities/order-address.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { UserEntity } from '../users/entities/user.entity';
import { UserAddressEntity } from '../users/entities/user-address.entity';
import { CouponEntity } from '../cart/entities/coupon.entity';
import { CouponUsageEntity } from '../cart/entities/coupon-usage.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { CartModule } from '../cart/cart.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OrderEntity,
            OrderItemEntity,
            OrderAddressEntity,
            ProductEntity,
            UserEntity,
            UserAddressEntity,
            CouponEntity,
            CouponUsageEntity,
            SellerEntity,
        ]),
        CartModule,
    ],
    controllers: [OrdersController, AdminOrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
