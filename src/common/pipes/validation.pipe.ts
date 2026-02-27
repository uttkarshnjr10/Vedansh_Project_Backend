import {
    ValidationPipe,
    UnprocessableEntityException,
    ValidationError,
} from '@nestjs/common';

export function createValidationPipe(): ValidationPipe {
    return new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        exceptionFactory: (errors: ValidationError[]) => {
            const formattedErrors = flattenValidationErrors(errors);
            return new UnprocessableEntityException({
                statusCode: 422,
                message: formattedErrors,
                error: 'Validation Failed',
            });
        },
    });
}

function flattenValidationErrors(
    errors: ValidationError[],
    parentField = '',
): { field: string; message: string; value: any }[] {
    const result: { field: string; message: string; value: any }[] = [];

    for (const error of errors) {
        const fieldName = parentField
            ? `${parentField}.${error.property}`
            : error.property;

        if (error.constraints) {
            const messages = Object.values(error.constraints);
            for (const message of messages) {
                result.push({
                    field: fieldName,
                    message,
                    value: error.value,
                });
            }
        }

        if (error.children && error.children.length > 0) {
            result.push(...flattenValidationErrors(error.children, fieldName));
        }
    }

    return result;
}
