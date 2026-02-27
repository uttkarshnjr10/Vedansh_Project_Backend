import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
    // Application
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    APP_NAME: Joi.string().default('VanaAushadhi'),
    APP_URL: Joi.string().uri().default('http://localhost:3000'),
    FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),
    ADMIN_URL: Joi.string().uri().default('http://localhost:3002'),

    // PostgreSQL
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required().allow(''),
    DB_NAME: Joi.string().required(),
    DB_SSL: Joi.string().default('false'),

    // Redis
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().optional().allow(''),
    REDIS_DB: Joi.number().default(0),

    // JWT
    JWT_ACCESS_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

    // OTP
    OTP_EXPIRY_MINUTES: Joi.number().default(5),
    OTP_MAX_ATTEMPTS: Joi.number().default(3),
    OTP_LOCKOUT_MINUTES: Joi.number().default(10),

    // AWS S3
    AWS_REGION: Joi.string().optional(),
    AWS_ACCESS_KEY_ID: Joi.string().optional(),
    AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
    AWS_S3_BUCKET: Joi.string().optional(),
    AWS_CLOUDFRONT_URL: Joi.string().optional(),

    // Razorpay
    RAZORPAY_KEY_ID: Joi.string().optional(),
    RAZORPAY_KEY_SECRET: Joi.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: Joi.string().optional(),

    // SMS
    MSG91_AUTH_KEY: Joi.string().optional(),
    MSG91_SENDER_ID: Joi.string().optional(),
    MSG91_OTP_TEMPLATE_ID: Joi.string().optional(),

    // Email
    SES_REGION: Joi.string().optional(),
    SES_FROM_EMAIL: Joi.string().optional(),
    SES_FROM_NAME: Joi.string().optional(),

    // Commission
    DEFAULT_COMMISSION_RATE: Joi.number().default(15),
    MIN_COMMISSION_RATE: Joi.number().default(10),
    MAX_COMMISSION_RATE: Joi.number().default(25),

    // Loyalty Points
    POINTS_PER_RUPEE: Joi.number().default(1),
    RUPEE_PER_POINT: Joi.number().default(0.25),
    MIN_POINTS_REDEEM: Joi.number().default(100),

    // Pagination
    DEFAULT_PAGE_SIZE: Joi.number().default(24),
    MAX_PAGE_SIZE: Joi.number().default(100),
});
