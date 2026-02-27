import {
    IsString,
    IsEnum,
    IsOptional,
    Matches,
    MinLength,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ADDRESS_LABEL } from '../../../common/constants';

export class CreateAddressDto {
    @ApiPropertyOptional({ enum: ADDRESS_LABEL, default: ADDRESS_LABEL.HOME })
    @IsEnum(ADDRESS_LABEL)
    @IsOptional()
    label?: ADDRESS_LABEL;

    @ApiProperty({ example: 'Rahul Sharma' })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    fullName: string;

    @ApiProperty({ example: '9876543210' })
    @IsString()
    @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
    phone: string;

    @ApiProperty({ example: '42, Green Park Colony' })
    @IsString()
    @MinLength(5)
    @MaxLength(500)
    addressLine1: string;

    @ApiPropertyOptional({ example: 'Near SBI Bank' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    addressLine2?: string;

    @ApiPropertyOptional({ example: 'Opposite Main Market' })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    landmark?: string;

    @ApiProperty({ example: 'Jaipur' })
    @IsString()
    @MinLength(2)
    city: string;

    @ApiProperty({ example: 'Rajasthan' })
    @IsString()
    @MinLength(2)
    state: string;

    @ApiProperty({ example: '302001' })
    @IsString()
    @Matches(/^\d{6}$/, { message: 'Pincode must be exactly 6 digits' })
    pincode: string;
}

export class UpdateAddressDto {
    @ApiPropertyOptional({ enum: ADDRESS_LABEL })
    @IsEnum(ADDRESS_LABEL)
    @IsOptional()
    label?: ADDRESS_LABEL;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(255)
    fullName?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(500)
    addressLine1?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(500)
    addressLine2?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @MaxLength(255)
    landmark?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    state?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    @Matches(/^\d{6}$/)
    pincode?: string;
}
