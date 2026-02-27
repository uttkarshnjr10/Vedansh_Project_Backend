import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    Req,
    Headers,
    UseGuards,
    ParseUUIDPipe,
    RawBodyRequest,
    HttpCode,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';

import { PaymentsService } from './payments.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    // ─── AUTHENTICATED ───────────────────────

    @Post('verify')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Verify payment after Razorpay modal closes' })
    @ApiResponse({ status: 200, description: 'Payment verified and order confirmed' })
    async verifyPayment(@Body() dto: VerifyPaymentDto) {
        return this.paymentsService.verifyPayment(dto);
    }

    @Get('orders/:orderId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get payment details for an order' })
    async getPaymentDetails(
        @CurrentUser('id') userId: string,
        @Param('orderId', ParseUUIDPipe) orderId: string,
    ) {
        return this.paymentsService.getPaymentDetails(orderId, userId);
    }

    @Get('wallet/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Wallet transaction history' })
    async getWalletHistory(
        @CurrentUser('id') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
    ) {
        return this.paymentsService.getWalletHistory(userId, +page, +limit);
    }

    // ─── WEBHOOK (PUBLIC — raw body) ─────────

    @Post('webhook/razorpay')
    @Public()
    @HttpCode(200)
    @ApiExcludeEndpoint()
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
        await this.paymentsService.handleWebhook(rawBody, signature);
        return { status: 'ok' };
    }
}
