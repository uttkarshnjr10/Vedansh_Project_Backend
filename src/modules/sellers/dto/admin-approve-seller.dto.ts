import {
    IsEnum,
    IsString,
    IsOptional,
    IsNumber,
    IsBoolean,
    Min,
    Max,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdminSellerAction {
    APPROVE = 'approve',
    REJECT = 'reject',
    SUSPEND = 'suspend',
}

export class AdminApproveSellerDto {
    @ApiProperty({ enum: AdminSellerAction })
    @IsEnum(AdminSellerAction)
    action: AdminSellerAction;

    @ApiPropertyOptional({ description: 'Required when action = reject or suspend' })
    @ValidateIf((o) => o.action === AdminSellerAction.REJECT || o.action === AdminSellerAction.SUSPEND)
    @IsString()
    rejectionReason?: string;

    @ApiPropertyOptional({ example: 12, minimum: 10, maximum: 25 })
    @IsNumber()
    @Min(10)
    @Max(25)
    @IsOptional()
    commissionRate?: number;

    @ApiPropertyOptional({ example: true })
    @IsBoolean()
    @IsOptional()
    assignVerifiedBadge?: boolean;
}
