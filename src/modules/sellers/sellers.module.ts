import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellersService } from './sellers.service';
import { SellersController, AdminSellersController } from './sellers.controller';
import { SellerEntity } from './entities/seller.entity';
import { SellerDocumentEntity } from './entities/seller-document.entity';
import { PayoutEntity } from './entities/payout.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SellerEntity,
            SellerDocumentEntity,
            PayoutEntity,
            UserEntity,
            ProductEntity,
        ]),
        SharedModule,
    ],
    controllers: [SellersController, AdminSellersController],
    providers: [SellersService],
    exports: [SellersService],
})
export class SellersModule { }
