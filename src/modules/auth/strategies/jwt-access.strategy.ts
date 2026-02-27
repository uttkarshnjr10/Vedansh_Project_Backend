import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
    constructor(
        configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        const options: StrategyOptionsWithoutRequest = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
        };
        super(options);
    }

    async validate(payload: JwtPayload) {
        if (payload.type !== 'access') {
            throw new UnauthorizedException('Invalid token type');
        }
        return this.authService.validateJwtPayload(payload);
    }
}
