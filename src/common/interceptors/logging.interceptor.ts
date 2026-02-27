import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Inject,
    LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url, ip } = request;
        const userId = (request as any).user?.id || 'anonymous';
        const userAgent = request.get('user-agent') || 'unknown';
        const now = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const response = context.switchToHttp().getResponse();
                    const statusCode = response.statusCode;
                    const responseTime = Date.now() - now;

                    this.logger.log(
                        `${method} ${url} ${statusCode} ${responseTime}ms`,
                        {
                            method,
                            url,
                            statusCode,
                            responseTime,
                            userId,
                            ip,
                            userAgent,
                        },
                    );
                },
                error: (error) => {
                    const responseTime = Date.now() - now;
                    this.logger.error(
                        `${method} ${url} ERROR ${responseTime}ms`,
                        {
                            method,
                            url,
                            responseTime,
                            userId,
                            ip,
                            userAgent,
                            error: error.message,
                        },
                    );
                },
            }),
        );
    }
}
