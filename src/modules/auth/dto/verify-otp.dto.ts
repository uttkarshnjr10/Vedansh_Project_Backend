import {
    IsString,
    Matches,
    Length,
    IsEnum,
    IsOptional,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../entities/otp.entity';

export class VerifyOtpDto {
    @ApiProperty({
        example: '9876543210',
        description: 'Indian mobile number (10 digits starting with 6-9)',
    })
    @IsString()
    @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
    phone: string;

    @ApiProperty({
        example: '123456',
        description: '6-digit OTP',
    })
    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
    otp: string;

    @ApiPropertyOptional({
        enum: OtpPurpose,
        default: OtpPurpose.LOGIN,
    })
    @IsEnum(OtpPurpose)
    @IsOptional()
    purpose: OtpPurpose = OtpPurpose.LOGIN;

    @ApiPropertyOptional({
        example: 'Mozilla/5.0 ...',
        description: 'Device/browser user agent string',
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    deviceInfo?: string;
}
