import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { env } from '@devpulse/env/api';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupApiDocs } from './docs/setup-api-docs';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());

  const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  for (const origin of corsOrigins) {
    const parsedOrigin = new URL(origin);
    const isOriginOnly = parsedOrigin.href === `${parsedOrigin.origin}/`;
    const isSecure = parsedOrigin.protocol === 'https:';
    const isLocalDevelopment =
      env.NODE_ENV !== 'production' &&
      parsedOrigin.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);

    if (!isOriginOnly || (!isSecure && !isLocalDevelopment)) {
      throw new Error(`Invalid CORS_ORIGIN entry: ${origin}`);
    }
  }

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        return new BadRequestException(errors);
      },
    }),
  );

  setupApiDocs(app, { exposeDevelopmentDocs: env.NODE_ENV !== 'production' });

  app.enableShutdownHooks();
  await app.listen(env.PORT);
}

void bootstrap();
