import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt-access') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest<TUser = any>(
        _err: any,
        user: TUser,
    ): TUser {
        // If no token or invalid token: set user to null, don't block
        return user || (null as any);
    }
}
