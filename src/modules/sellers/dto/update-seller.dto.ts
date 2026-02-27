import { PartialType, OmitType } from '@nestjs/swagger';
import { RegisterSellerDto } from './register-seller.dto';

export class UpdateSellerDto extends PartialType(
    OmitType(RegisterSellerDto, ['gstNumber', 'panNumber'] as const),
) { }
