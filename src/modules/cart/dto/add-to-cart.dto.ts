import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
    @ApiProperty({ example: 'product-uuid-here' })
    @IsUUID()
    productId: string;

    @ApiProperty({ example: 1, minimum: 1, maximum: 100 })
    @IsInt()
    @Min(1)
    @Max(100)
    quantity: number;
}
