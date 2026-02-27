import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';

import { SellersService } from './sellers.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { BankDetailsDto } from './dto/bank-details.dto';
import { AdminApproveSellerDto } from './dto/admin-approve-seller.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES, DOCUMENT_TYPE } from '../../common/constants';

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
    constructor(private readonly sellersService: SellersService) { }

    // ─── PUBLIC ───────────────────────────────

    @Public()
    @Get(':id/profile')
    @ApiOperation({ summary: 'Get public seller storefront' })
    async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
        return this.sellersService.getPublicProfile(id);
    }

    @Public()
    @Get(':id/products')
    @ApiOperation({ summary: 'Get seller approved products (public)' })
    async getSellerProducts(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.sellersService.getSellerPublicProducts(id, +page, +limit);
    }

    // ─── SELLER-ONLY ──────────────────────────

    @Post('register')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Register as a seller (converts buyer to seller role)' })
    @ApiResponse({ status: 201, description: 'Seller profile created' })
    async register(
        @CurrentUser('id') userId: string,
        @Body() registerDto: RegisterSellerDto,
    ) {
        return this.sellersService.registerSeller(userId, registerDto);
    }

    @Get('my/profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get own seller profile' })
    async getMyProfile(@CurrentUser('id') userId: string) {
        return this.sellersService.getSellerByUserId(userId);
    }

    @Patch('my/profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update own seller profile' })
    async updateMyProfile(
        @CurrentUser('id') userId: string,
        @Body() updateDto: UpdateSellerDto,
    ) {
        const seller = await this.sellersService.getSellerByUserId(userId);
        return this.sellersService.updateProfile(seller.id, updateDto);
    }

    @Patch('my/bank-details')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update bank account details' })
    async updateBankDetails(
        @CurrentUser('id') userId: string,
        @Body() bankDto: BankDetailsDto,
    ) {
        const seller = await this.sellersService.getSellerByUserId(userId);
        return this.sellersService.updateBankDetails(seller.id, bankDto);
    }

    @Post('my/documents')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                documentType: { type: 'string', enum: Object.values(DOCUMENT_TYPE) },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a KYC document' })
    async uploadDocument(
        @CurrentUser('id') userId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('documentType') documentType: DOCUMENT_TYPE,
    ) {
        const seller = await this.sellersService.getSellerByUserId(userId);
        return this.sellersService.uploadDocument(seller.id, file, documentType);
    }

    @Get('my/dashboard')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get seller dashboard stats' })
    async getDashboard(@CurrentUser('id') userId: string) {
        const seller = await this.sellersService.getSellerByUserId(userId);
        return this.sellersService.getSellerDashboard(seller.id);
    }

    @Get('my/orders')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get seller orders (paginated)' })
    async getMyOrders(
        @CurrentUser('id') _userId: string,
        @Query('page') _page = 1,
        @Query('limit') _limit = 20,
    ) {
        // TODO: Implement when Orders module is built (Phase 5)
        return { items: [], meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } };
    }

    @Get('my/products')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get my products (all statuses)' })
    async getMyProducts(
        @CurrentUser('id') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('status') status?: string,
    ) {
        const seller = await this.sellersService.getSellerByUserId(userId);
        return this.sellersService.getSellerProducts(seller.id, +page, +limit, status);
    }

    @Get('my/payouts')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(ROLES.SELLER)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get payout history' })
    async getMyPayouts(
        @CurrentUser('id') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        const seller = await this.sellersService.getSellerByUserId(userId);
        return this.sellersService.getSellerPayouts(seller.id, +page, +limit);
    }
}

// ─── ADMIN CONTROLLER ───────────────────────

@ApiTags('Admin - Sellers')
@Controller('admin/sellers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminSellersController {
    constructor(private readonly sellersService: SellersService) { }

    @Get()
    @ApiOperation({ summary: 'List all sellers (admin)' })
    async listSellers(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.sellersService.adminListSellers(+page, +limit, status, search);
    }

    @Get('pending')
    @ApiOperation({ summary: 'Pending approval sellers queue (admin)' })
    async getPending(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.sellersService.adminGetPendingSellers(+page, +limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Full seller profile with documents (admin)' })
    async getSellerDetails(@Param('id', ParseUUIDPipe) id: string) {
        return this.sellersService.adminGetSellerDetails(id);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve, reject, or suspend a seller (admin)' })
    async approveSeller(
        @CurrentUser('id') adminId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() approveDto: AdminApproveSellerDto,
    ) {
        return this.sellersService.adminApproveSeller(id, adminId, approveDto);
    }

    @Patch(':id/commission')
    @ApiOperation({ summary: 'Update seller commission rate (admin)' })
    async updateCommission(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { commissionRate: number },
    ) {
        return this.sellersService.adminUpdateCommission(id, body.commissionRate);
    }
}
