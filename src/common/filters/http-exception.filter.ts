import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Inject,
    LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const isProduction = process.env.NODE_ENV === 'production';

        let status: number;
        let message: string;
        let details: any[] | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const resp = exceptionResponse as any;
                message = resp.message || exception.message;

                // Handle class-validator errors
                if (Array.isArray(resp.message)) {
                    details = resp.message.map((msg: any) => {
                        if (typeof msg === 'string') {
                            return { field: 'unknown', message: msg, value: null };
                        }
                        return msg;
                    });
                    message = 'Validation failed';
                }
            } else {
                message = exception.message;
            }
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = isProduction
                ? 'Internal server error'
                : (exception as Error)?.message || 'Internal server error';
        }

        // Log 5xx errors with full context
        if (status >= 500) {
            const sanitizedHeaders = { ...request.headers };
            delete sanitizedHeaders.authorization;
            delete sanitizedHeaders.cookie;

            const sanitizedBody = { ...request.body };
            if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
            if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';

            this.logger.error(
                `${status} ${request.method} ${request.url}`,
                {
                    statusCode: status,
                    method: request.method,
                    url: request.url,
                    userId: (request as any).user?.id || 'anonymous',
                    body: sanitizedBody,
                    headers: sanitizedHeaders,
                    stack: isProduction ? undefined : (exception as Error)?.stack,
                    timestamp: new Date().toISOString(),
                },
            );
        }

        const errorResponse = {
            success: false,
            error: {
                code: status,
                message,
                ...(details && { details }),
            },
            meta: {
                timestamp: new Date().toISOString(),
                path: request.url,
                requestId: request.headers['x-request-id'] || undefined,
            },
        };

        response.status(status).json(errorResponse);
    }
}
