import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ReturnItemDto } from './dto/return-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES, ORDER_STATUS, CANCELLED_BY } from '../../common/constants';

// ─── BUYER CONTROLLER ───────────────────────

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create order from cart (checkout)' })
    @ApiResponse({ status: 201, description: 'Order created with Razorpay order ID' })
    async createOrder(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateOrderDto,
    ) {
        return this.ordersService.createOrder(userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get my orders (paginated)' })
    async getMyOrders(
        @CurrentUser('id') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('status') status?: string,
    ) {
        return this.ordersService.getUserOrders(userId, +page, +limit, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order detail' })
    async getOrderDetail(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.ordersService.getOrderDetail(userId, id);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Cancel order' })
    async cancelOrder(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelOrderDto,
    ) {
        return this.ordersService.cancelOrder(userId, id, dto, CANCELLED_BY.USER);
    }

    @Post('return-item')
    @ApiOperation({ summary: 'Request item return (within 7 days of delivery)' })
    async requestReturn(
        @CurrentUser('id') userId: string,
        @Body() dto: ReturnItemDto,
    ) {
        return this.ordersService.requestReturn(userId, dto);
    }
}

// ─── ADMIN ORDERS CONTROLLER ────────────────

@ApiTags('Admin - Orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminOrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    @ApiOperation({ summary: 'All orders (admin)' })
    async getAllOrders(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('status') status?: string,
        @Query('sellerId') sellerId?: string,
        @Query('userId') userId?: string,
    ) {
        return this.ordersService.adminGetAllOrders(+page, +limit, status, sellerId, userId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update order status (admin)' })
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { status: ORDER_STATUS; trackingId?: string; logisticsPartner?: string },
    ) {
        return this.ordersService.updateOrderStatus(id, body.status, {
            trackingId: body.trackingId,
            logisticsPartner: body.logisticsPartner,
        });
    }

    @Post('return-items/:id/process')
    @ApiOperation({ summary: 'Process return request (approve/reject)' })
    async processReturn(
        @CurrentUser('id') adminId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { action: 'approve' | 'reject' },
    ) {
        return this.ordersService.processAdminReturn(id, body.action, adminId);
    }
}
