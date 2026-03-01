import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserEntity } from '../users/entities/user.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { CouponEntity } from '../cart/entities/coupon.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserEntity,
            SellerEntity,
            ProductEntity,
            OrderEntity,
            OrderItemEntity,
            CouponEntity,
        ]),
        AnalyticsModule,
        forwardRef(() => OrdersModule),
    ],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }
