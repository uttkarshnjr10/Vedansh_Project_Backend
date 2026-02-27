import {
    IsUUID,
    IsEnum,
    IsOptional,
    IsString,
    IsInt,
    Min,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENT_METHOD } from '../../../common/constants';

export class CreateOrderDto {
    @ApiProperty({ description: 'ID of user address to deliver to' })
    @IsUUID()
    addressId: string;

    @ApiPropertyOptional({ example: '2025-01-20_9-13' })
    @IsString()
    @IsOptional()
    deliverySlot?: string;

    @ApiProperty({ enum: PAYMENT_METHOD })
    @IsEnum(PAYMENT_METHOD)
    paymentMethod: PAYMENT_METHOD;

    @ApiPropertyOptional({ example: 'WELCOME10' })
    @IsString()
    @IsOptional()
    couponCode?: string;

    @ApiPropertyOptional({ example: 0, minimum: 0 })
    @IsInt()
    @Min(0)
    @IsOptional()
    loyaltyPointsToRedeem?: number;

    @ApiPropertyOptional({ example: 'Please leave at door' })
    @IsString()
    @MaxLength(500)
    @IsOptional()
    notes?: string;
}
