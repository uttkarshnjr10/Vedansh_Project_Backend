import {
    IsInt,
    IsString,
    IsOptional,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductReviewDto {
    @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ example: 'Great product!' })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    title?: string;

    @ApiPropertyOptional({ example: 'This turmeric powder is really pure and authentic...' })
    @IsString()
    @IsOptional()
    @MaxLength(2000)
    body?: string;
}
