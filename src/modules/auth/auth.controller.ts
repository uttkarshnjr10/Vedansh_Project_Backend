import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

    // ── SEND OTP ──────────────────────────────

    @Public()
    @Post('send-otp')
    @Throttle({ default: { ttl: 900000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send OTP to phone number' })
    @ApiBody({ type: SendOtpDto })
    @ApiResponse({
        status: 200,
        description: 'OTP sent successfully',
        schema: {
            example: {
                success: true,
                data: { message: 'OTP sent successfully', expiresIn: 300 },
            },
        },
    })
    @ApiResponse({ status: 429, description: 'Too many requests' })
    async sendOtp(@Body() sendOtpDto: SendOtpDto, @Req() req: Request) {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return this.authService.sendOtp(sendOtpDto, ip);
    }

    // ── VERIFY OTP ────────────────────────────

    @Public()
    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify OTP and login/register' })
    @ApiBody({ type: VerifyOtpDto })
    @ApiResponse({
        status: 200,
        description: 'OTP verified, tokens issued',
        schema: {
            example: {
                success: true,
                data: {
                    accessToken: 'eyJhbGciOi...',
                    isNewUser: true,
                    user: {
                        id: 'uuid',
                        phone: '9876543210',
                        fullName: 'New User',
                        role: 'buyer',
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
    async verifyOtp(
        @Body() verifyOtpDto: VerifyOtpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const result = await this.authService.verifyOtp(verifyOtpDto, ip);

        // Set refresh token as httpOnly cookie
        this.setRefreshTokenCookie(res, result.refreshToken);

        // Return access token in body (not the refresh token)
        const { refreshToken: _rt, user, ...rest } = result;

        // Exclude sensitive fields from user object
        const { passwordHash: _ph, ...safeUser } = user;

        return {
            ...rest,
            user: safeUser,
        };
    }

    // ── REFRESH TOKENS ────────────────────────

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiBody({ type: RefreshTokenDto, required: false })
    @ApiResponse({
        status: 200,
        description: 'Tokens refreshed',
        schema: {
            example: {
                success: true,
                data: { accessToken: 'eyJhbGciOi...' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() body: RefreshTokenDto,
    ) {
        // Get refresh token from cookie or body
        const refreshToken =
            req.cookies?.refreshToken || body?.refreshToken;

        if (!refreshToken) {
            return { message: 'Refresh token required' };
        }

        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const result = await this.authService.refreshTokens(refreshToken, ip);

        // Set new refresh token cookie
        this.setRefreshTokenCookie(res, result.refreshToken);

        return { accessToken: result.accessToken };
    }

    // ── LOGOUT ────────────────────────────────

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout current session' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken =
            req.cookies?.refreshToken || req.body?.refreshToken;

        if (refreshToken) {
            await this.authService.revokeToken(refreshToken);
        }

        // Clear cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'strict',
            path: '/',
        });

        return { message: 'Logged out successfully' };
    }

    // ── LOGOUT ALL ────────────────────────────

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout all sessions (all devices)' })
    @ApiResponse({ status: 200, description: 'All sessions revoked' })
    async logoutAll(
        @CurrentUser('id') userId: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.authService.revokeAllUserTokens(userId);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'strict',
            path: '/',
        });

        return { message: 'All sessions revoked' };
    }

    // ── GET ME ────────────────────────────────

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: 'Current user profile',
    })
    async getMe(@CurrentUser() user: UserEntity) {
        const { passwordHash: _ph, ...safeUser } = user;
        return safeUser;
    }

    // ── HELPERS ───────────────────────────────

    private setRefreshTokenCookie(res: Response, token: string): void {
        const isProduction =
            this.configService.get('NODE_ENV') === 'production';

        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
        });
    }
}
