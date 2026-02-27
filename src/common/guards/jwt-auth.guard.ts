import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        // Check for @Public() decorator
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest<TUser = any>(
        err: any,
        user: TUser,
        info: any,
    ): TUser {
        if (err || !user) {
            throw (
                err ||
                new UnauthorizedException(
                    info?.message || 'Authentication required',
                )
            );
        }
        return user;
    }
}
