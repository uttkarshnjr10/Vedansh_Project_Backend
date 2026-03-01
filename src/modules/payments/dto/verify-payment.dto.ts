import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
    @ApiProperty({ description: 'Razorpay order ID returned from /orders', example: 'order_ABC123' })
    @IsString()
    razorpayOrderId: string;

    @ApiProperty({ description: 'Razorpay payment ID from modal handler callback', example: 'pay_XYZ789' })
    @IsString()
    razorpayPaymentId: string;

    @ApiProperty({ description: 'HMAC SHA256 signature from Razorpay for verification', example: 'signature_hash_here' })
    @IsString()
    razorpaySignature: string;
}
