import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { UserEntity, UserStatus } from '../users/entities/user.entity';
import { OtpEntity, OtpPurpose } from './entities/otp.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { ROLES } from '../../common/constants';

const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
});

describe('AuthService', () => {
    let service: AuthService;
    let userRepo: jest.Mocked<Repository<UserEntity>>;
    let otpRepo: jest.Mocked<Repository<OtpEntity>>;
    let refreshTokenRepo: jest.Mocked<Repository<RefreshTokenEntity>>;
    let jwtService: jest.Mocked<JwtService>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(UserEntity), useFactory: mockRepository },
                { provide: getRepositoryToken(OtpEntity), useFactory: mockRepository },
                {
                    provide: getRepositoryToken(RefreshTokenEntity),
                    useFactory: mockRepository,
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('mock-jwt-token'),
                        verify: jest.fn(),
                        decode: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue?: any) => {
                            const config: Record<string, any> = {
                                NODE_ENV: 'test',
                                OTP_EXPIRY_MINUTES: 5,
                                OTP_MAX_ATTEMPTS: 3,
                                JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars-long',
                                JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-long',
                                JWT_ACCESS_EXPIRES_IN: '15m',
                                JWT_REFRESH_EXPIRES_IN: '30d',
                            };
                            return config[key] ?? defaultValue;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userRepo = module.get(getRepositoryToken(UserEntity));
        otpRepo = module.get(getRepositoryToken(OtpEntity));
        refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
        jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
        configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ──────────────────────────────────────────
    // SEND OTP
    // ──────────────────────────────────────────

    describe('sendOtp', () => {
        const dto = { phone: '9876543210', purpose: OtpPurpose.LOGIN };

        it('should throw rate limit error when >= 5 OTPs in 10 minutes', async () => {
            otpRepo.count.mockResolvedValue(5);

            await expect(service.sendOtp(dto, '127.0.0.1')).rejects.toThrow(
                HttpException,
            );
            await expect(service.sendOtp(dto, '127.0.0.1')).rejects.toThrow(
                'Too many OTP requests',
            );
        });

        it('should return existing OTP expiry (idempotency) if recent unused OTP exists', async () => {
            otpRepo.count.mockResolvedValue(1);
            otpRepo.findOne.mockResolvedValue({
                id: '1',
                phone: '9876543210',
                expiresAt: new Date(Date.now() + 4 * 60 * 1000),
                createdAt: new Date(),
                isUsed: false,
            } as OtpEntity);

            const result = await service.sendOtp(dto, '127.0.0.1');
            expect(result.message).toBe('OTP sent successfully');
            expect(result.expiresIn).toBeGreaterThan(0);
            // Should NOT create a new OTP
            expect(otpRepo.create).not.toHaveBeenCalled();
        });

        it('should create and hash OTP when no recent one exists', async () => {
            otpRepo.count.mockResolvedValue(0);
            otpRepo.findOne.mockResolvedValue(null);
            otpRepo.create.mockImplementation((dto: any) => dto as OtpEntity);
            otpRepo.save.mockResolvedValue({} as OtpEntity);

            const result = await service.sendOtp(dto, '127.0.0.1');
            expect(result.message).toBe('OTP sent successfully');
            expect(result.expiresIn).toBe(300); // 5 min = 300 sec
            expect(otpRepo.create).toHaveBeenCalled();

            // Verify OTP is stored as hash (not plain)
            const createCall = otpRepo.create.mock.calls[0][0] as any;
            expect(createCall.otpHash).toBeDefined();
            expect(createCall.otpHash).not.toMatch(/^\d{6}$/); // Should not be plain 6 digits
        });
    });

    // ──────────────────────────────────────────
    // VERIFY OTP
    // ──────────────────────────────────────────

    describe('verifyOtp', () => {
        const verifyDto = {
            phone: '9876543210',
            otp: '123456',
            purpose: OtpPurpose.LOGIN,
        };

        it('should throw if no valid OTP found', async () => {
            otpRepo.findOne.mockResolvedValue(null);

            await expect(service.verifyOtp(verifyDto, '127.0.0.1')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw if OTP is locked (max attempts reached)', async () => {
            otpRepo.findOne.mockResolvedValue({
                id: '1',
                phone: '9876543210',
                otpHash: 'hash',
                attempts: 3,
                isUsed: false,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            } as OtpEntity);

            await expect(service.verifyOtp(verifyDto, '127.0.0.1')).rejects.toThrow(
                'OTP locked',
            );
        });

        it('should increment attempts before comparing OTP hash', async () => {
            const otpRecord = {
                id: '1',
                phone: '9876543210',
                otpHash: await bcrypt.hash('999999', 10), // Different from provided OTP
                attempts: 0,
                isUsed: false,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            } as OtpEntity;

            otpRepo.findOne.mockResolvedValue(otpRecord);
            otpRepo.save.mockResolvedValue(otpRecord);

            await expect(service.verifyOtp(verifyDto, '127.0.0.1')).rejects.toThrow(
                'Invalid OTP',
            );

            // Verify attempts was incremented
            expect(otpRepo.save).toHaveBeenCalled();
            expect(otpRecord.attempts).toBe(1);
        });

        it('should create new user on first login', async () => {
            const hashedOtp = await bcrypt.hash('123456', 10);
            const otpRecord = {
                id: '1',
                phone: '9876543210',
                otpHash: hashedOtp,
                attempts: 0,
                isUsed: false,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            } as OtpEntity;

            otpRepo.findOne.mockResolvedValue(otpRecord);
            otpRepo.save.mockResolvedValue(otpRecord);

            // No existing user
            userRepo.findOne.mockResolvedValue(null);
            const newUser = {
                id: 'new-uuid',
                phone: '9876543210',
                fullName: 'New User',
                role: ROLES.BUYER,
                status: UserStatus.ACTIVE,
                loginCount: 1,
            } as UserEntity;
            userRepo.create.mockReturnValue(newUser);
            userRepo.save.mockResolvedValue(newUser);

            // Mock token generation
            refreshTokenRepo.create.mockReturnValue({} as RefreshTokenEntity);
            refreshTokenRepo.save.mockResolvedValue({} as RefreshTokenEntity);

            const result = await service.verifyOtp(verifyDto, '127.0.0.1');
            expect(result.isNewUser).toBe(true);
            expect(result.accessToken).toBeDefined();
            expect(userRepo.create).toHaveBeenCalled();
        });

        it('should return existing user on subsequent login', async () => {
            const hashedOtp = await bcrypt.hash('123456', 10);
            const otpRecord = {
                id: '1',
                phone: '9876543210',
                otpHash: hashedOtp,
                attempts: 0,
                isUsed: false,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            } as OtpEntity;

            otpRepo.findOne.mockResolvedValue(otpRecord);
            otpRepo.save.mockResolvedValue(otpRecord);

            const existingUser = {
                id: 'existing-uuid',
                phone: '9876543210',
                fullName: 'Existing User',
                role: ROLES.BUYER,
                status: UserStatus.ACTIVE,
                loginCount: 5,
            } as UserEntity;
            userRepo.findOne.mockResolvedValue(existingUser);
            userRepo.save.mockResolvedValue(existingUser);

            refreshTokenRepo.create.mockReturnValue({} as RefreshTokenEntity);
            refreshTokenRepo.save.mockResolvedValue({} as RefreshTokenEntity);

            const result = await service.verifyOtp(verifyDto, '127.0.0.1');
            expect(result.isNewUser).toBe(false);
            expect(result.user.id).toBe('existing-uuid');
        });
    });

    // ──────────────────────────────────────────
    // REFRESH TOKENS
    // ──────────────────────────────────────────

    describe('refreshTokens', () => {
        it('should throw on invalid JWT signature', async () => {
            jwtService.verify.mockImplementation(() => {
                throw new Error('invalid');
            });

            await expect(
                service.refreshTokens('bad-token', '127.0.0.1'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw if no matching stored token found', async () => {
            jwtService.verify.mockReturnValue({
                sub: 'user-1',
                type: 'refresh',
                jti: 'jti-1',
            });

            refreshTokenRepo.find.mockResolvedValue([]);

            await expect(
                service.refreshTokens('valid-token', '127.0.0.1'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should revoke old token and issue new pair (token rotation)', async () => {
            const tokenHash = await bcrypt.hash('valid-refresh-token', 10);

            jwtService.verify.mockReturnValue({
                sub: 'user-1',
                type: 'refresh',
                jti: 'jti-1',
            });

            const storedToken = {
                id: 'token-1',
                userId: 'user-1',
                tokenHash,
                isRevoked: false,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                lastUsedAt: null,
                deviceInfo: 'Chrome',
            } as RefreshTokenEntity;

            refreshTokenRepo.find.mockResolvedValue([storedToken]);
            refreshTokenRepo.save.mockResolvedValue(storedToken);

            const user = {
                id: 'user-1',
                phone: '9876543210',
                role: ROLES.BUYER,
                status: UserStatus.ACTIVE,
                canLogin: () => true,
            } as UserEntity;
            userRepo.findOne.mockResolvedValue(user);

            refreshTokenRepo.create.mockReturnValue({} as RefreshTokenEntity);

            const result = await service.refreshTokens(
                'valid-refresh-token',
                '127.0.0.1',
            );

            // Old token should be revoked
            expect(storedToken.isRevoked).toBe(true);
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
        });
    });

    // ──────────────────────────────────────────
    // REVOKE ALL TOKENS
    // ──────────────────────────────────────────

    describe('revokeAllUserTokens', () => {
        it('should update all non-revoked tokens to revoked', async () => {
            refreshTokenRepo.update.mockResolvedValue({ affected: 3 } as any);

            await service.revokeAllUserTokens('user-1');

            expect(refreshTokenRepo.update).toHaveBeenCalledWith(
                { userId: 'user-1', isRevoked: false },
                { isRevoked: true },
            );
        });
    });
});
