import { HttpStatus } from '@nestjs/common';

export function successResponse<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = HttpStatus.OK,
) {
    return {
        success: true,
        statusCode,
        message,
        data,
    };
}

export function errorResponse(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: any[],
) {
    return {
        success: false,
        statusCode,
        message,
        ...(details && { details }),
    };
}

export function paginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
) {
    const totalPages = Math.ceil(total / limit);

    return {
        success: true,
        message,
        data: {
            items,
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
