import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor(configService: ConfigService) {
        const options: StrategyOptionsWithRequest = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return (req as any)?.cookies?.refreshToken ?? null;
                },
                ExtractJwt.fromBodyField('refreshToken'),
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
            passReqToCallback: true as const,
        };
        super(options);
    }

    async validate(req: Request, payload: JwtPayload) {
        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid token type');
        }

        // Extract raw token for comparison
        const refreshToken =
            (req as any).cookies?.refreshToken || req.body?.refreshToken;

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not provided');
        }

        return { ...payload, refreshToken };
    }
}
