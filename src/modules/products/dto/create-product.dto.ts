import {
    IsString,
    IsUUID,
    IsOptional,
    IsNumber,
    IsInt,
    IsBoolean,
    IsArray,
    MinLength,
    MaxLength,
    Min,
    Max,
    ValidateNested,
    Validate,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Ingredient nested DTO
export class IngredientDto {
    @ApiProperty({ example: 'Turmeric' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: '500' })
    @IsString()
    @IsOptional()
    quantity?: string;

    @ApiPropertyOptional({ example: 'mg' })
    @IsString()
    @IsOptional()
    unit?: string;
}

// Custom validator: sellingPrice <= mrp
@ValidatorConstraint({ name: 'priceLessThanMrp', async: false })
export class PriceLessThanMrpConstraint implements ValidatorConstraintInterface {
    validate(_value: any, args: ValidationArguments): boolean {
        const obj = args.object as any;
        if (obj.sellingPrice != null && obj.mrp != null) {
            return Number(obj.sellingPrice) <= Number(obj.mrp);
        }
        return true;
    }
    defaultMessage(): string {
        return 'Selling price cannot exceed MRP';
    }
}

export class CreateProductDto {
    @ApiProperty({ example: 'Organic Turmeric Powder 200g' })
    @IsString()
    @MinLength(3)
    @MaxLength(500)
    name: string;

    @ApiProperty({ example: 'uuid' })
    @IsUUID()
    categoryId: string;

    @ApiPropertyOptional({ example: 'uuid' })
    @IsUUID()
    @IsOptional()
    subcategoryId?: string;

    @ApiPropertyOptional({ example: 'Premium organic turmeric from Kerala' })
    @IsString()
    @MaxLength(1000)
    @IsOptional()
    shortDescription?: string;

    @ApiProperty({ example: '<p>Our turmeric is 100% organic...</p>' })
    @IsString()
    @MinLength(10)
    description: string;

    @ApiPropertyOptional({ type: [IngredientDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => IngredientDto)
    ingredients?: IngredientDto[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    usageInstructions?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(500)
    storageInstructions?: string;

    @ApiProperty({ example: 299 })
    @IsNumber()
    @Min(1)
    @Max(1000000)
    mrp: number;

    @ApiProperty({ example: 249 })
    @IsNumber()
    @Min(1)
    @Validate(PriceLessThanMrpConstraint)
    sellingPrice: number;

    @ApiProperty({ example: 100 })
    @IsInt()
    @Min(0)
    stockQuantity: number;

    @ApiPropertyOptional({ example: 200 })
    @IsInt()
    @Min(1)
    @IsOptional()
    weightGrams?: number;

    @ApiPropertyOptional({ example: 'TUR-ORG-200' })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    sku?: string;

    @ApiPropertyOptional({ example: ['turmeric', 'organic', 'spice'] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    isOrganicCertified?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsBoolean()
    @IsOptional()
    isLabTested?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    isFssaiLicensed?: boolean;
}
