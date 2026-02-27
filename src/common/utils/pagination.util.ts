import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export class PaginationDto {
    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 24 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 24;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export async function paginate<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    paginationDto: PaginationDto,
): Promise<PaginatedResult<T>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [items, total] = await query.skip(skip).take(limit).getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

export class CursorPaginationDto {
    @ApiPropertyOptional({ description: 'Base64 encoded cursor for pagination' })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 24 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 24;
}

export interface CursorPaginatedResult<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

export function encodeCursor(timestamp: Date, id: string): string {
    const payload = JSON.stringify({ t: timestamp.toISOString(), i: id });
    return Buffer.from(payload).toString('base64');
}

export function decodeCursor(cursor: string): { timestamp: Date; id: string } {
    const payload = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return { timestamp: new Date(payload.t), id: payload.i };
}

export async function cursorPaginate<T extends ObjectLiteral & { id: string; createdAt: Date }>(
    query: SelectQueryBuilder<T>,
    dto: CursorPaginationDto,
    alias: string,
): Promise<CursorPaginatedResult<T>> {
    const { cursor, limit } = dto;

    if (cursor) {
        const { timestamp, id } = decodeCursor(cursor);
        query.andWhere(
            `(${alias}.createdAt < :timestamp OR (${alias}.createdAt = :timestamp AND ${alias}.id < :id))`,
            { timestamp, id },
        );
    }

    query.orderBy(`${alias}.createdAt`, 'DESC').addOrderBy(`${alias}.id`, 'DESC');

    const items = await query.take(limit + 1).getMany();
    const hasMore = items.length > limit;

    if (hasMore) {
        items.pop();
    }

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
        ? encodeCursor(lastItem.createdAt, lastItem.id)
        : null;

    return {
        items,
        nextCursor,
        hasMore,
    };
}
