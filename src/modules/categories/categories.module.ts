import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryEntity } from './entities/category.entity';
import { SubcategoryEntity } from './entities/subcategory.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CategoryEntity, SubcategoryEntity])],
    controllers: [CategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule { }
