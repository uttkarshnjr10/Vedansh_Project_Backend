import {
    IsString,
    IsOptional,
    IsEnum,
    Matches,
    MinLength,
    MaxLength,
    Length,
    IsIn,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '../entities/seller.entity';

// Indian states for GST compliance
export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export class BusinessAddressDto {
    @ApiProperty({ example: '123 Market Road' })
    @IsString()
    @MinLength(5)
    street: string;

    @ApiProperty({ example: 'Jaipur' })
    @IsString()
    @MinLength(2)
    city: string;

    @ApiProperty({ example: 'Rajasthan' })
    @IsString()
    state: string;

    @ApiProperty({ example: '302001' })
    @IsString()
    @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid pincode format' })
    pincode: string;

    @ApiPropertyOptional({ example: 'India', default: 'India' })
    @IsString()
    @IsOptional()
    country?: string;
}

export class RegisterSellerDto {
    @ApiProperty({ example: 'Organic Valley Farm' })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    brandName: string;

    @ApiProperty({ enum: BusinessType })
    @IsEnum(BusinessType)
    businessType: BusinessType;

    @ApiPropertyOptional({ example: '27AAPFU0939F1ZV' })
    @IsOptional()
    @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
        message: 'Invalid GST number format',
    })
    gstNumber?: string;

    @ApiPropertyOptional({ example: 'ABCDE1234F' })
    @IsOptional()
    @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
        message: 'Invalid PAN number format',
    })
    panNumber?: string;

    @ApiPropertyOptional({ example: '12345678901234' })
    @IsOptional()
    @Length(14, 14, { message: 'FSSAI license number must be exactly 14 characters' })
    fssaiLicenseNumber?: string;

    @ApiProperty({ type: BusinessAddressDto })
    @ValidateNested()
    @Type(() => BusinessAddressDto)
    businessAddress: BusinessAddressDto;

    @ApiProperty({ example: 'Rajasthan' })
    @IsString()
    @IsIn(INDIAN_STATES, { message: 'Invalid state name' })
    state: string;

    @ApiPropertyOptional({ example: 'We are a certified organic farm in Rajasthan...' })
    @IsString()
    @IsOptional()
    @MaxLength(2000)
    aboutBrand?: string;
}
