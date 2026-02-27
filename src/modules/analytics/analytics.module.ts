import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AdminAnalyticsController, SellerAnalyticsController } from './analytics.controller';
import { AnalyticsDailySnapshotEntity } from './entities/analytics-daily-snapshot.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';
import { ProductEntity } from '../products/entities/product.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AnalyticsDailySnapshotEntity,
            OrderEntity,
            OrderItemEntity,
            UserEntity,
            SellerEntity,
            ProductEntity,
        ]),
    ],
    controllers: [AdminAnalyticsController, SellerAnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
