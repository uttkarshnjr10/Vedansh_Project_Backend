import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
    @ApiProperty({ example: 'order_ABC123' })
    @IsString()
    razorpayOrderId: string;

    @ApiProperty({ example: 'pay_XYZ789' })
    @IsString()
    razorpayPaymentId: string;

    @ApiProperty({ example: 'signature_hash_here' })
    @IsString()
    razorpaySignature: string;
}
