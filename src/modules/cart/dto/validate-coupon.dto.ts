import { IsString, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
    @ApiProperty({ example: 'WELCOME10' })
    @IsString()
    @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
    couponCode: string;

    @ApiProperty({ example: 500, description: 'Cart subtotal before discount' })
    @IsNumber()
    @Min(0)
    cartTotal: number;
}
