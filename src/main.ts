import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  dotenv.config();

  // Create Winston logger instance
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  });

  // Pass Winston logger to Nest app
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('CRL Pay API Documentation')
    .setDescription('API documentation for CRL Pay Buy Now Pay Later (BNPL) System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Merchants', 'Merchant onboarding and management')
    .addTag('Customers', 'Customer onboarding and profile management')
    .addTag('Credit', 'Credit assessment and decisioning')
    .addTag('Loans', 'Loan management and lifecycle')
    .addTag('Payments', 'Payment processing and collection')
    .addTag('Webhooks', 'Webhook management')
    .addTag('Analytics', 'Merchant analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/swagger-ui', app, document);

  // Apply global HTTP request logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3007', 'http://localhost:3008', 'http://localhost:3009'],
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3006;
  await app.listen(port);

  logger.log(`Application started on port ${port}`);
  logger.log(`Swagger UI available at http://localhost:${port}/api/v1/swagger-ui`);
}

bootstrap();
