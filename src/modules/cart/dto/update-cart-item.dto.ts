import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
    @ApiProperty({ example: 2, minimum: 0, maximum: 100, description: 'Set to 0 to remove item' })
    @IsInt()
    @Min(0)
    @Max(100)
    quantity: number;
}
