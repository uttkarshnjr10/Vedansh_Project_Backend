import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = (request as any).requestId ?? request.headers['x-request-id'] ?? 'unknown';
        const isProduction = process.env.NODE_ENV === 'production';

        let status: number;
        let message: string;
        let errors: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const responseBody = exception.getResponse();
            if (typeof responseBody === 'object' && responseBody !== null) {
                message = (responseBody as any).message || exception.message;
                errors = (responseBody as any).errors;
                if (Array.isArray(message)) message = message[0];
            } else {
                message = String(responseBody);
            }
        } else if (exception instanceof QueryFailedError) {
            status = HttpStatus.BAD_REQUEST;
            const driverError = (exception as any).driverError;
            const code = driverError?.code;

            if (code === '23505') {
                // Unique constraint violation
                const detail: string = driverError?.detail ?? '';
                const match = detail.match(/\((.+?)\)/);
                message = match ? `The value for "${match[1]}" already exists` : 'This value already exists';
            } else if (code === '23503') {
                message = 'Referenced resource not found';
            } else if (code === '23502') {
                message = 'A required field is missing';
            } else {
                message = isProduction ? 'Database error occurred' : (exception as any).message;
                status = HttpStatus.INTERNAL_SERVER_ERROR;
            }
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = isProduction ? 'Internal server error' : (exception as any)?.message ?? 'Unknown error';
        }

        // Always log full error
        this.logger.error(
            `[${requestId}] ${request.method} ${request.url} → ${status}: ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        const responseBody: Record<string, any> = {
            success: false,
            statusCode: status,
            message,
            requestId,
            timestamp: new Date().toISOString(),
        };

        if (errors) responseBody.errors = errors;

        // In dev, include stack trace
        if (!isProduction && exception instanceof Error) {
            responseBody.stack = exception.stack;
        }

        response.status(status).json(responseBody);
    }
}
