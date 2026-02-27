import {
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsEmail,
    IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({
        example: 'Rahul Sharma',
        description: 'Full name (letters and spaces only)',
    })
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(100)
    @Matches(/^[a-zA-Z\s]+$/, {
        message: 'Full name can only contain letters and spaces',
    })
    fullName?: string;

    @ApiPropertyOptional({
        example: 'rahul@example.com',
        description: 'Email address',
    })
    @IsEmail()
    @IsOptional()
    @Transform(({ value }) => (value as string)?.toLowerCase().trim())
    email?: string;
}
