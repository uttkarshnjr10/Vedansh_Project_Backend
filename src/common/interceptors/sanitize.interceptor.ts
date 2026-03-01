import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

const SENSITIVE_KEYS = new Set([
    'passwordHash',
    'otpHash',
    'tokenHash',
    'razorpaySignature',
    'bankAccountNumber',
    'panNumber',
    '__v',
]);

function sanitize(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj instanceof Date) return obj;
    if (typeof obj === 'object') {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (SENSITIVE_KEYS.has(key)) continue;
            result[key] = sanitize(value);
        }
        return result;
    }
    return obj;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map((data) => sanitize(data)));
    }
}
