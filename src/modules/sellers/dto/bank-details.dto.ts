import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BankDetailsDto {
    @ApiProperty({ example: 'Organic Valley Farm' })
    @IsString()
    @MinLength(2)
    bankAccountName: string;

    @ApiProperty({ example: '123456789012' })
    @IsString()
    @Matches(/^\d{9,18}$/, { message: 'Bank account number must be 9-18 digits' })
    bankAccountNumber: string;

    @ApiProperty({ example: 'SBIN0001234' })
    @IsString()
    @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
    bankIfscCode: string;

    @ApiProperty({ example: 'State Bank of India' })
    @IsString()
    bankName: string;
}
