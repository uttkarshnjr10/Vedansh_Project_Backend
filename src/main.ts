import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Get services
  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  // Use Winston as the app logger
  app.useLogger(logger);

  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  const adminUrl = configService.get<string>('ADMIN_URL', 'http://localhost:3002');

  // CORS configuration
  app.enableCors({
    origin: [frontendUrl, adminUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Gzip compression
  app.use(compression());

  // Cookie parser (for refresh token cookies)
  app.use(cookieParser());

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation (non-production only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VanaAushadhi API')
      .setDescription(
        'API documentation for VanaAushadhi — Herbal, Ayurvedic & Organic Products Marketplace',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer('http://localhost:3000', 'Development Server')
      .addServer('https://api.vanaaushadhi.com', 'Production Server')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received. Starting graceful shutdown...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received. Starting graceful shutdown...');
    await app.close();
    process.exit(0);
  });

  await app.listen(port);

  logger.log(
    `🚀 VanaAushadhi API is running on: http://localhost:${port}/api/v1`,
  );
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap().catch((err) => {
  const message = err?.message || String(err);
  console.error('\n❌ Failed to start VanaAushadhi API:\n');

  if (message.includes('password authentication failed') || message.includes('ECONNREFUSED')) {
    console.error('  Database connection failed. Please check:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD in .env are correct');
    console.error('  3. The database specified in DB_NAME exists\n');
  } else {
    console.error(`  ${message}\n`);
  }

  process.exit(1);
});
