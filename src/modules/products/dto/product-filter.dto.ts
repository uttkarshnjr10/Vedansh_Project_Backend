import {
    IsOptional,
    IsUUID,
    IsNumber,
    IsBoolean,
    IsString,
    IsEnum,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductSortBy {
    PRICE_ASC = 'price_asc',
    PRICE_DESC = 'price_desc',
    NEWEST = 'newest',
    POPULARITY = 'popularity',
    RATING = 'rating',
}

export class ProductFilterDto {
    @ApiPropertyOptional()
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsUUID()
    @IsOptional()
    subcategoryId?: string;

    @ApiPropertyOptional({ example: 100 })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    minPrice?: number;

    @ApiPropertyOptional({ example: 1000 })
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    maxPrice?: number;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isOrganicCertified?: boolean;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isLabTested?: boolean;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isFssaiLicensed?: boolean;

    @ApiPropertyOptional({ minimum: 1, maximum: 5 })
    @IsNumber()
    @Min(1)
    @Max(5)
    @IsOptional()
    @Type(() => Number)
    minRating?: number;

    @ApiPropertyOptional()
    @IsUUID()
    @IsOptional()
    sellerId?: string;

    @ApiPropertyOptional({ description: 'Full-text search query' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ enum: ProductSortBy, default: ProductSortBy.POPULARITY })
    @IsEnum(ProductSortBy)
    @IsOptional()
    sortBy?: ProductSortBy = ProductSortBy.POPULARITY;

    @ApiPropertyOptional({ description: 'Product status (admin only)' })
    @IsString()
    @IsOptional()
    status?: string;

    // Pagination
    @ApiPropertyOptional({ default: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;
}
