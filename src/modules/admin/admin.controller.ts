import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ROLES, ORDER_STATUS } from '../../common/constants';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // ── Dashboard
    @Get('dashboard')
    @ApiOperation({ summary: 'Admin dashboard overview' })
    async getDashboard() {
        return this.adminService.getDashboard();
    }

    // ── Sellers
    @Get('sellers/pending')
    @ApiOperation({ summary: 'Pending seller approvals' })
    async getPendingSellers(@Query('page') page = 1, @Query('limit') limit = 20) {
        return this.adminService.getPendingSellers(+page, +limit);
    }

    @Get('sellers/pending/count')
    @ApiOperation({ summary: 'Pending sellers count (badge)' })
    async getPendingSellersCount() {
        return { count: await this.adminService.getPendingSellersCount() };
    }

    @Get('sellers')
    @ApiOperation({ summary: 'All sellers with filters' })
    async getAllSellers(
        @Query('page') page = 1, @Query('limit') limit = 20,
        @Query('status') status?: string, @Query('search') search?: string,
    ) {
        return this.adminService.getAllSellers(+page, +limit, status, search);
    }

    @Get('sellers/:id')
    @ApiOperation({ summary: 'Seller detail' })
    async getSellerDetail(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.getSellerDetail(id);
    }

    // ── Products
    @Get('products/pending')
    @ApiOperation({ summary: 'Pending product approvals' })
    async getPendingProducts(@Query('page') page = 1, @Query('limit') limit = 20) {
        return this.adminService.getPendingProducts(+page, +limit);
    }

    @Get('products/pending/count')
    @ApiOperation({ summary: 'Pending products count' })
    async getPendingProductsCount() {
        return { count: await this.adminService.getPendingProductsCount() };
    }

    @Get('products')
    @ApiOperation({ summary: 'All products with filters' })
    async getAllProducts(
        @Query('page') page = 1, @Query('limit') limit = 20,
        @Query('status') status?: string, @Query('search') search?: string,
        @Query('sellerId') sellerId?: string,
    ) {
        return this.adminService.getAllProducts(+page, +limit, status, search, sellerId);
    }

    @Get('products/:id')
    @ApiOperation({ summary: 'Product detail' })
    async getProductDetail(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.getProductDetail(id);
    }

    // ── Orders
    @Get('orders')
    @ApiOperation({ summary: 'All orders with filters' })
    async getAllOrders(
        @Query('page') page = 1, @Query('limit') limit = 20,
        @Query('status') status?: string, @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string, @Query('sellerId') sellerId?: string,
    ) {
        return this.adminService.getAllOrders(+page, +limit, status, dateFrom, dateTo, sellerId);
    }

    @Get('orders/:id')
    @ApiOperation({ summary: 'Order detail' })
    async getOrderDetail(@Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.getOrderDetail(id);
    }

    @Patch('orders/:id/status')
    @ApiOperation({ summary: 'Update order status' })
    async updateOrderStatus(
        @CurrentUser('id') adminId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { status: ORDER_STATUS; trackingId?: string; logisticsPartner?: string },
    ) {
        return this.adminService.updateOrderStatus(id, body.status, adminId);
    }

    // ── Users
    @Get('users')
    @ApiOperation({ summary: 'All users with search' })
    async getAllUsers(
        @Query('page') page = 1, @Query('limit') limit = 20,
        @Query('search') search?: string, @Query('role') role?: string,
    ) {
        return this.adminService.getAllUsers(+page, +limit, search, role);
    }

    @Patch('users/:id/suspend')
    @ApiOperation({ summary: 'Suspend user' })
    async suspendUser(
        @CurrentUser('id') adminId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { reason: string },
    ) {
        return this.adminService.suspendUser(id, body.reason, adminId);
    }

    @Patch('users/:id/unsuspend')
    @ApiOperation({ summary: 'Unsuspend user' })
    async unsuspendUser(
        @CurrentUser('id') adminId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.adminService.unsuspendUser(id, adminId);
    }

    // ── Analytics
    @Get('analytics/revenue')
    @ApiOperation({ summary: 'Revenue summary by date range' })
    async getRevenueSummary(
        @Query('dateFrom') dateFrom: string,
        @Query('dateTo') dateTo: string,
    ) {
        return this.adminService.getRevenueSummary(dateFrom, dateTo);
    }

    // ── Coupons
    @Get('coupons')
    @ApiOperation({ summary: 'All coupons' })
    async getAllCoupons(
        @Query('page') page = 1, @Query('limit') limit = 20,
        @Query('isActive') isActive?: string,
    ) {
        return this.adminService.getAllCoupons(+page, +limit, isActive === 'true' ? true : isActive === 'false' ? false : undefined);
    }

    @Post('coupons')
    @ApiOperation({ summary: 'Create coupon' })
    async createCoupon(@CurrentUser('id') adminId: string, @Body() body: any) {
        return this.adminService.createCoupon(body, adminId);
    }

    @Patch('coupons/:id')
    @ApiOperation({ summary: 'Update coupon' })
    async updateCoupon(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
        return this.adminService.updateCoupon(id, body);
    }

    @Delete('coupons/:id')
    @ApiOperation({ summary: 'Deactivate coupon' })
    async deactivateCoupon(@CurrentUser('id') adminId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.adminService.deactivateCoupon(id, adminId);
    }

    // ── Payouts
    @Post('payouts/trigger-weekly')
    @ApiOperation({ summary: 'Manually trigger weekly payout job (emergency)' })
    async triggerPayouts(@CurrentUser('id') adminId: string) {
        return this.adminService.triggerWeeklyPayouts(adminId);
    }
}
