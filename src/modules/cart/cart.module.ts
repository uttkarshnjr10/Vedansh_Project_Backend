import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { LoyaltyService } from './loyalty.service';
import { CartController } from './cart.controller';
import { CartItemEntity } from './entities/cart-item.entity';
import { CouponEntity } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CartItemEntity,
            CouponEntity,
            CouponUsageEntity,
            ProductEntity,
            UserEntity,
        ]),
    ],
    controllers: [CartController],
    providers: [CartService, LoyaltyService],
    exports: [CartService, LoyaltyService],
})
export class CartModule { }
