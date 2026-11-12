import { Module, type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core/constants';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { env } from '@devpulse/env/api';

import { AnalyticsModule } from './analytics/analytics.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiKey } from './api-keys/entities/api-key.entity';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { Project } from './projects/entities/project.entity';
import { ProjectsModule } from './projects/projects.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { TelemetryEvent } from './telemetry/entities/telemetry-event.entity';
import { WorkSession } from './telemetry/entities/work-session.entity';
import { TelemetryModule } from './telemetry/telemetry.module';
import { User } from './users/entities/user.entity';
import { UserEncryption } from './users/entities/user-encryption.entity';
import { WorklogEntry } from './worklog/entities/worklog-entry.entity';
import { WorklogModule } from './worklog/worklog.module';

const throttlerProvider: Provider = {
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    HealthModule,

    ThrottlerModule.forRoot([
      {
        name: 'burst',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'sustained',
        ttl: 60_000,
        limit: 200,
      },
    ]),

    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: env.DATABASE_URL,
        entities: [
          User,
          UserEncryption,
          ApiKey,
          Project,
          TelemetryEvent,
          WorkSession,
          WorklogEntry,
        ],
        synchronize: env.NODE_ENV !== 'production',
        migrations: [__dirname + '/db/migrations/*{.ts,.js}'],
        migrationsRun: env.NODE_ENV === 'production',
      }),
    }),

    RedisModule,
    RealtimeModule,
    AuthModule,
    ApiKeysModule,
    TelemetryModule,
    ProjectsModule,
    AnalyticsModule,
    EmailModule,
    WorklogModule,
  ],
  providers: [throttlerProvider],
})
export class AppModule {}
