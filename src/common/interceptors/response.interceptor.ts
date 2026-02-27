import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ResponseEnvelope<T> {
    success: boolean;
    data: T;
    meta: {
        timestamp: string;
        path: string;
        version: string;
        pagination?: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    };
    message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ResponseEnvelope<T>> {
        const request = context.switchToHttp().getRequest<Request>();

        return next.handle().pipe(
            map((data) => {
                const meta: ResponseEnvelope<T>['meta'] = {
                    timestamp: new Date().toISOString(),
                    path: request.url,
                    version: 'v1',
                };

                // Detect paginated responses
                if (
                    data &&
                    typeof data === 'object' &&
                    'items' in data &&
                    'total' in data &&
                    'page' in data &&
                    'limit' in data
                ) {
                    const paginatedData = data as any;
                    meta.pagination = {
                        total: paginatedData.total,
                        page: paginatedData.page,
                        limit: paginatedData.limit,
                        totalPages: paginatedData.totalPages ?? Math.ceil(paginatedData.total / paginatedData.limit),
                        hasNext: paginatedData.hasNext ?? paginatedData.page < Math.ceil(paginatedData.total / paginatedData.limit),
                        hasPrev: paginatedData.hasPrev ?? paginatedData.page > 1,
                    };

                    return {
                        success: true,
                        data: paginatedData.items,
                        meta,
                        message: (data as any).message || 'Success',
                    };
                }

                return {
                    success: true,
                    data,
                    meta,
                    message: 'Success',
                };
            }),
        );
    }
}
