import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { Project } from '../projects/entities/project.entity';
import { ProjectsService } from '../projects/services/projects.service';
import { WorkSession } from '../telemetry/entities/work-session.entity';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { User } from '../users/entities/user.entity';

import { AnalyticsController } from './controllers/analytics.controller';
import { IntegrationsAnalyticsController } from './controllers/integrations-analytics.controller';
import { CsvExportFormatterService } from './formatters/csv-export-formatter.service';
import { EXPORT_FORMATTER } from './interfaces/export-formatter.interface';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { IntegrationsAnalyticsService } from './services/integrations-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkSession, Project, User]),
    ApiKeysModule,
    forwardRef(() => TelemetryModule),
  ],
  controllers: [AnalyticsController, IntegrationsAnalyticsController],
  providers: [
    AnalyticsService,
    { provide: EXPORT_FORMATTER, useClass: CsvExportFormatterService },
    AnalyticsExportService,
    IntegrationsAnalyticsService,
    ProjectsService,
  ],
  exports: [IntegrationsAnalyticsService],
})
export class AnalyticsModule {}
