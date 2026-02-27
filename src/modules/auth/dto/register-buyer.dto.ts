import {
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsEmail,
    IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBuyerDto {
    @ApiProperty({
        example: 'Rahul Sharma',
        description: 'Full name (letters and spaces only)',
    })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @Matches(/^[a-zA-Z\s]+$/, {
        message: 'Full name can only contain letters and spaces',
    })
    fullName: string;

    @ApiPropertyOptional({
        example: 'rahul@example.com',
        description: 'Email address (optional)',
    })
    @IsEmail()
    @IsOptional()
    @Transform(({ value }) => (value as string)?.toLowerCase().trim())
    email?: string;
}
