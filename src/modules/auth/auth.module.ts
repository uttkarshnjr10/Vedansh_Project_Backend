import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from '../users/entities/user.entity';
import { OtpEntity } from './entities/otp.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, OtpEntity, RefreshTokenEntity]),
        PassportModule.register({ defaultStrategy: 'jwt-access' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_ACCESS_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any,
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
    exports: [AuthService, JwtModule],
})
export class AuthModule { }
