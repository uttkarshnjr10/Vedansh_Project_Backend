import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
    @ApiProperty({ example: 'Changed my mind about the purchase' })
    @IsString()
    @MinLength(5)
    @MaxLength(500)
    reason: string;
}
