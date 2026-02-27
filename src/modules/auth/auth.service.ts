import {
    Injectable,
    UnauthorizedException,
    Logger,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

import { UserEntity, UserStatus } from '../users/entities/user.entity';
import { OtpEntity, OtpPurpose } from './entities/otp.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ROLES } from '../../common/constants';

export interface JwtPayload {
    sub: string;
    phone?: string;
    role?: ROLES;
    type: 'access' | 'refresh';
    jti?: string;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(OtpEntity)
        private readonly otpRepository: Repository<OtpEntity>,
        @InjectRepository(RefreshTokenEntity)
        private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    // ──────────────────────────────────────────
    // SEND OTP
    // ──────────────────────────────────────────

    async sendOtp(
        sendOtpDto: SendOtpDto,
        ip: string,
    ): Promise<{ message: string; expiresIn: number }> {
        const { phone, purpose } = sendOtpDto;
        const otpExpiryMinutes = this.configService.get<number>(
            'OTP_EXPIRY_MINUTES',
            5,
        );

        // 1. Rate limit: max 5 OTPs per phone in 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentOtpCount = await this.otpRepository.count({
            where: {
                phone,
                createdAt: MoreThan(tenMinutesAgo),
            },
        });

        if (recentOtpCount >= 5) {
            throw new HttpException(
                'Too many OTP requests. Try after 10 minutes.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // 2. Idempotency: if unexpired, unused OTP exists (created < 1 min ago), return it
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const existingOtp = await this.otpRepository.findOne({
            where: {
                phone,
                purpose,
                isUsed: false,
                expiresAt: MoreThan(new Date()),
                createdAt: MoreThan(oneMinuteAgo),
            },
            order: { createdAt: 'DESC' },
        });

        if (existingOtp) {
            const remainingSeconds = Math.floor(
                (existingOtp.expiresAt.getTime() - Date.now()) / 1000,
            );
            return {
                message: 'OTP sent successfully',
                expiresIn: remainingSeconds,
            };
        }

        // 3. Generate 6-digit OTP
        const otpPlain = crypto.randomInt(100000, 999999).toString();

        // 4. Hash the OTP
        const otpHash = await bcrypt.hash(otpPlain, 10);

        // 5. Save OTP entity
        const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
        const otpEntity = this.otpRepository.create({
            phone,
            otpHash,
            purpose,
            expiresAt,
            ip,
        });
        await this.otpRepository.save(otpEntity);

        // 6. In development: log OTP (NEVER in production)
        if (this.configService.get<string>('NODE_ENV') !== 'production') {
            this.logger.warn(`[DEV] OTP for ${phone}: ${otpPlain}`);
        }

        // 7. In production: send SMS (stubbed for now)
        // TODO: Implement SMS service in Phase 10

        return {
            message: 'OTP sent successfully',
            expiresIn: otpExpiryMinutes * 60,
        };
    }

    // ──────────────────────────────────────────
    // VERIFY OTP
    // ──────────────────────────────────────────

    async verifyOtp(
        verifyOtpDto: VerifyOtpDto,
        ip: string,
    ): Promise<{
        user: UserEntity;
        isNewUser: boolean;
        accessToken: string;
        refreshToken: string;
    }> {
        const { phone, otp, purpose, deviceInfo } = verifyOtpDto;
        const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 3);

        // 1. Find most recent unexpired, unused OTP
        const otpRecord = await this.otpRepository.findOne({
            where: {
                phone,
                purpose: purpose ?? OtpPurpose.LOGIN,
                isUsed: false,
                expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
        });

        if (!otpRecord) {
            throw new UnauthorizedException('OTP expired or invalid');
        }

        // 2. Check attempt limit
        if (otpRecord.attempts >= maxAttempts) {
            throw new UnauthorizedException('OTP locked. Request new OTP.');
        }

        // 3. Increment attempts BEFORE checking (prevent timing attacks)
        otpRecord.attempts += 1;
        await this.otpRepository.save(otpRecord);

        // 4. Compare OTP hash
        const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
        if (!isValid) {
            throw new UnauthorizedException('Invalid OTP');
        }

        // 5. Mark OTP as used
        otpRecord.isUsed = true;
        await this.otpRepository.save(otpRecord);

        // 6. Find or create user
        let isNewUser = false;
        let user = await this.userRepository.findOne({ where: { phone } });

        if (!user) {
            isNewUser = true;
            user = this.userRepository.create({
                phone,
                fullName: 'New User',
                role: ROLES.BUYER,
                status: UserStatus.PENDING_VERIFICATION,
            });
            user = await this.userRepository.save(user);
        }

        // 7. Update user verification status
        user.phoneVerifiedAt = new Date();
        user.status = UserStatus.ACTIVE;
        user.lastLoginAt = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await this.userRepository.save(user);

        // 8. Generate tokens
        const tokens = await this.generateTokens(user, deviceInfo, ip);

        return {
            user,
            isNewUser,
            ...tokens,
        };
    }

    // ──────────────────────────────────────────
    // GENERATE TOKENS
    // ──────────────────────────────────────────

    async generateTokens(
        user: UserEntity,
        deviceInfo?: string,
        ip?: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        // 1. Access token
        const accessPayload: JwtPayload = {
            sub: user.id,
            phone: user.phone,
            role: user.role,
            type: 'access',
        };
        const accessToken = this.jwtService.sign(accessPayload as any, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any,
        });

        // 2. Refresh token
        const jti = uuidv4();
        const refreshPayload: JwtPayload = {
            sub: user.id,
            jti,
            type: 'refresh',
        };
        const refreshToken = this.jwtService.sign(refreshPayload as any, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>(
                'JWT_REFRESH_EXPIRES_IN',
                '30d',
            ) as any,
        });

        // 3. Hash and store refresh token
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        const refreshExpiresIn =
            this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
        const expiresAt = this.calculateExpiry(refreshExpiresIn);

        const tokenEntity = this.refreshTokenRepository.create({
            userId: user.id,
            tokenHash,
            deviceInfo: deviceInfo ?? null,
            ip: ip ?? null,
            expiresAt,
        });
        await this.refreshTokenRepository.save(tokenEntity);

        return { accessToken, refreshToken };
    }

    // ──────────────────────────────────────────
    // REFRESH TOKENS
    // ──────────────────────────────────────────

    async refreshTokens(
        refreshToken: string,
        ip: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        // 1. Verify JWT signature
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid token type');
        }

        // 2. Find non-revoked tokens for this user
        const storedTokens = await this.refreshTokenRepository.find({
            where: {
                userId: payload.sub,
                isRevoked: false,
            },
        });

        // 3. Find the matching token by bcrypt comparison
        let matchedToken: RefreshTokenEntity | null = null;
        for (const token of storedTokens) {
            const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
            if (isMatch) {
                matchedToken = token;
                break;
            }
        }

        if (!matchedToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // 4. Check expiry
        if (matchedToken.expiresAt < new Date()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        // 5. Revoke old token (rolling refresh — one-time use)
        matchedToken.isRevoked = true;
        matchedToken.lastUsedAt = new Date();
        await this.refreshTokenRepository.save(matchedToken);

        // 6. Get user and generate new pair
        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
        });
        if (!user || !user.canLogin()) {
            throw new UnauthorizedException('User account is suspended');
        }

        return this.generateTokens(user, matchedToken.deviceInfo ?? undefined, ip);
    }

    // ──────────────────────────────────────────
    // REVOKE TOKENS
    // ──────────────────────────────────────────

    async revokeToken(refreshToken: string): Promise<void> {
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            // Token might be expired but we still want to revoke it
            try {
                payload = this.jwtService.decode(refreshToken) as JwtPayload;
            } catch {
                return; // Invalid token entirely — nothing to revoke
            }
        }

        if (!payload?.sub) return;

        const storedTokens = await this.refreshTokenRepository.find({
            where: {
                userId: payload.sub,
                isRevoked: false,
            },
        });

        for (const token of storedTokens) {
            const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
            if (isMatch) {
                token.isRevoked = true;
                await this.refreshTokenRepository.save(token);
                break;
            }
        }
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        await this.refreshTokenRepository.update(
            { userId, isRevoked: false },
            { isRevoked: true },
        );
    }

    async revokeTokenById(tokenId: string, userId: string): Promise<void> {
        await this.refreshTokenRepository.update(
            { id: tokenId, userId },
            { isRevoked: true },
        );
    }

    // ──────────────────────────────────────────
    // VALIDATE JWT PAYLOAD (used by Passport strategy)
    // ──────────────────────────────────────────

    async validateJwtPayload(payload: JwtPayload): Promise<UserEntity> {
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }

        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.isActive()) {
            throw new UnauthorizedException('User account is not active');
        }

        return user;
    }

    // ──────────────────────────────────────────
    // GET ACTIVE SESSIONS
    // ──────────────────────────────────────────

    async getActiveSessions(
        userId: string,
    ): Promise<
        Pick<
            RefreshTokenEntity,
            'id' | 'deviceInfo' | 'ip' | 'lastUsedAt' | 'createdAt'
        >[]
    > {
        const tokens = await this.refreshTokenRepository.find({
            where: {
                userId,
                isRevoked: false,
                expiresAt: MoreThan(new Date()),
            },
            select: ['id', 'deviceInfo', 'ip', 'lastUsedAt', 'createdAt'],
            order: { createdAt: 'DESC' },
        });

        return tokens;
    }

    // ──────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────

    private calculateExpiry(expiresIn: string): Date {
        const now = Date.now();
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) {
            // Default 30 days
            return new Date(now + 30 * 24 * 60 * 60 * 1000);
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];
        const multipliers: Record<string, number> = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        return new Date(now + value * multipliers[unit]);
    }
}
