import {
    IsEnum,
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    Min,
    Max,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdminAction {
    APPROVE = 'approve',
    REJECT = 'reject',
}

export class AdminApproveProductDto {
    @ApiProperty({ enum: AdminAction })
    @IsEnum(AdminAction)
    action: AdminAction;

    @ApiPropertyOptional({ description: 'Required when action = reject' })
    @ValidateIf((o) => o.action === AdminAction.REJECT)
    @IsString()
    rejectionReason?: string;

    @ApiPropertyOptional({
        example: ['organic_certified', 'lab_tested'],
        description: 'Badges to assign on approval',
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    badgesToAssign?: string[];

    @ApiPropertyOptional({ example: 15, minimum: 10, maximum: 25 })
    @IsNumber()
    @Min(10)
    @Max(25)
    @IsOptional()
    commissionRate?: number;
}
