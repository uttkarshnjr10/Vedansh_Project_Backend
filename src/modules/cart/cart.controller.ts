import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { LoyaltyService } from './loyalty.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
    constructor(
        private readonly cartService: CartService,
        private readonly loyaltyService: LoyaltyService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get current cart with product details' })
    @ApiResponse({ status: 200, description: 'Cart summary with items, totals, availability' })
    async getCart(@CurrentUser('id') userId: string) {
        return this.cartService.getCart(userId);
    }

    @Post('items')
    @ApiOperation({ summary: 'Add item to cart' })
    @ApiResponse({ status: 201, description: 'Item added, returns updated cart' })
    async addToCart(
        @CurrentUser('id') userId: string,
        @Body() dto: AddToCartDto,
    ) {
        return this.cartService.addToCart(userId, dto);
    }

    @Patch('items/:id')
    @ApiOperation({ summary: 'Update cart item quantity (0 to remove)' })
    async updateCartItem(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) cartItemId: string,
        @Body() dto: UpdateCartItemDto,
    ) {
        return this.cartService.updateCartItem(userId, cartItemId, dto);
    }

    @Delete('items/:id')
    @ApiOperation({ summary: 'Remove item from cart' })
    async removeFromCart(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) cartItemId: string,
    ) {
        return this.cartService.removeFromCart(userId, cartItemId);
    }

    @Delete()
    @ApiOperation({ summary: 'Clear entire cart' })
    async clearCart(@CurrentUser('id') userId: string) {
        await this.cartService.clearCart(userId);
        return { message: 'Cart cleared' };
    }

    @Get('validate')
    @ApiOperation({ summary: 'Validate cart before checkout (checks stock, prices)' })
    @ApiResponse({ status: 200, description: 'Validation result with errors if any' })
    async validateCart(@CurrentUser('id') userId: string) {
        return this.cartService.validateCart(userId);
    }

    @Post('validate-coupon')
    @ApiOperation({ summary: 'Validate a coupon code against cart total' })
    async validateCoupon(
        @CurrentUser('id') userId: string,
        @Body() dto: ValidateCouponDto,
    ) {
        return this.cartService.validateAndApplyCoupon(userId, dto);
    }

    // ─── LOYALTY POINTS ─────────────────────

    @Get('loyalty')
    @ApiOperation({ summary: 'Get wallet balance and loyalty points' })
    async getWalletAndPoints(@CurrentUser('id') userId: string) {
        return this.loyaltyService.getWalletAndPoints(userId);
    }

    @Post('loyalty/calculate')
    @ApiOperation({ summary: 'Calculate loyalty points discount' })
    async calculateLoyaltyDiscount(
        @CurrentUser('id') userId: string,
        @Body() body: { pointsToRedeem: number; cartTotal: number },
    ) {
        return this.loyaltyService.calculateLoyaltyDiscount(
            userId,
            body.pointsToRedeem,
            body.cartTotal,
        );
    }
}
