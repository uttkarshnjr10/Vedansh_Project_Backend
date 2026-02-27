import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { envValidationSchema } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { SharedModule } from './shared/shared.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    // Global configuration with Joi validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: '.env',
    }),

    // TypeORM PostgreSQL connection
    TypeOrmModule.forRootAsync(databaseConfig),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Health checks
    TerminusModule,

    // Winston structured logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';

        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: isProduction
              ? winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              )
              : winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? `\n${JSON.stringify(meta, null, 2)}`
                    : '';
                  return `${timestamp} [${level}]: ${message}${metaStr}`;
                }),
              ),
          }),
        ];

        if (isProduction) {
          transports.push(
            new winston.transports.DailyRotateFile({
              filename: 'logs/error-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              level: 'error',
              maxSize: '20m',
              maxFiles: '14d',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
            new winston.transports.DailyRotateFile({
              filename: 'logs/combined-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxSize: '20m',
              maxFiles: '14d',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          );
        }

        return {
          level: isProduction ? 'info' : 'debug',
          transports,
        };
      },
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    SellersModule,
    SharedModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global throttler guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global JWT auth guard (secure-by-default: all routes require auth unless @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global response interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: createValidationPipe(),
    },
  ],
})
export class AppModule { }
