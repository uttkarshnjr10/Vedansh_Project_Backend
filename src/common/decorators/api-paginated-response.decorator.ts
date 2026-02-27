import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
    model: TModel,
) => {
    return applyDecorators(
        ApiExtraModels(model),
        ApiOkResponse({
            schema: {
                allOf: [
                    {
                        properties: {
                            success: { type: 'boolean', example: true },
                            data: {
                                type: 'array',
                                items: { $ref: getSchemaPath(model) },
                            },
                            meta: {
                                type: 'object',
                                properties: {
                                    timestamp: { type: 'string', format: 'date-time' },
                                    path: { type: 'string' },
                                    version: { type: 'string' },
                                    pagination: {
                                        type: 'object',
                                        properties: {
                                            total: { type: 'number' },
                                            page: { type: 'number' },
                                            limit: { type: 'number' },
                                            totalPages: { type: 'number' },
                                            hasNext: { type: 'boolean' },
                                            hasPrev: { type: 'boolean' },
                                        },
                                    },
                                },
                            },
                            message: { type: 'string' },
                        },
                    },
                ],
            },
        }),
    );
};
