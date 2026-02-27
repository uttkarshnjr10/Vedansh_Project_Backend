import {
    IsUUID,
    IsString,
    IsArray,
    IsOptional,
    MinLength,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnItemDto {
    @ApiProperty()
    @IsUUID()
    orderItemId: string;

    @ApiProperty({ example: 'Product arrived damaged — broken seal on container' })
    @IsString()
    @MinLength(10)
    @MaxLength(500)
    reason: string;

    @ApiPropertyOptional({ description: 'S3 URLs of return evidence photos' })
    @IsArray()
    @IsOptional()
    images?: string[];
}
