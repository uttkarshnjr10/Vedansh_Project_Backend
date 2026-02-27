import { IsString, Matches, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../entities/otp.entity';

export class SendOtpDto {
    @ApiProperty({
        example: '9876543210',
        description: 'Indian mobile number (10 digits starting with 6-9)',
    })
    @IsString()
    @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
    phone: string;

    @ApiPropertyOptional({
        enum: OtpPurpose,
        default: OtpPurpose.LOGIN,
        description: 'Purpose of OTP',
    })
    @IsEnum(OtpPurpose)
    @IsOptional()
    purpose: OtpPurpose = OtpPurpose.LOGIN;
}
