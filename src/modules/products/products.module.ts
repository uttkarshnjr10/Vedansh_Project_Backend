import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductEntity } from './entities/product.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductCertificateEntity } from './entities/product-certificate.entity';
import { ProductReviewEntity } from './entities/product-review.entity';
import { WishlistEntity } from './entities/wishlist.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { SubcategoryEntity } from '../categories/entities/subcategory.entity';
import { SellerEntity } from '../sellers/entities/seller.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProductEntity,
            ProductImageEntity,
            ProductCertificateEntity,
            ProductReviewEntity,
            WishlistEntity,
            CategoryEntity,
            SubcategoryEntity,
            SellerEntity,
        ]),
    ],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService],
})
export class ProductsModule { }
