import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import {
  type ExecutionContext,
  type INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import request from 'supertest';

import { type TypeId } from '@devpulse/lib';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { type AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { AnalyticsUpdatesService } from '../../realtime/analytics-updates.service';
import { getHttpServer } from '../../test/get-http-server';
import { type GetAnalyticsRangeRequestDto } from '../dto/request/get-analytics-range-request.dto';
import { GetAnalyticsDashboardResponseDto } from '../dto/response/get-analytics-dashboard-response.dto';
import { GetAnalyticsHotFilesResponseDto } from '../dto/response/get-analytics-hot-files-response.dto';
import { GetIntegrationAiRoiResponseDto } from '../dto/response/get-integration-ai-roi-response.dto';
import { GetIntegrationStatusResponseDto } from '../dto/response/get-integration-status-response.dto';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsExportService } from '../services/analytics-export.service';
import { IntegrationsAnalyticsService } from '../services/integrations-analytics.service';

import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController (Integration)', () => {
  let app: INestApplication;

  const mockAuthUser: AuthenticatedUser = {
    id: 'u_user123',
    email: 'dev@devpulse.io',
    displayName: 'Dev User',
    timezone: 'Europe/Warsaw',
    hourlyRate: 60,
    currency: 'USD',
  };

  const mockDashboard = Object.assign(new GetAnalyticsDashboardResponseDto(), {
    totalActiveSeconds: 14_400,
    totalSessions: 4,
  });

  const mockLiveStatus = Object.assign(new GetIntegrationStatusResponseDto(), {
    isCodingNow: true,
    currentProject: 'DevPulse Core',
    currentBranch: 'main',
    currentLanguage: 'typescript',
    currentSessionDurationSeconds: 900,
    sessionStartedAt: new Date('2026-03-30T11:45:00.000Z'),
    inactiveReason: null,
    lastSignalAt: new Date('2026-03-30T12:00:00.000Z'),
  });

  const mockAiRoi = Object.assign(new GetIntegrationAiRoiResponseDto(), {
    aiSessionsCount: 2,
    manualSessionsCount: 3,
    totalAiInteractions: 8,
    aiActiveSeconds: 5400,
    manualActiveSeconds: 7200,
    minimumComparisonSeconds: 3600,
    comparisonReady: true,
    aiVelocityLinesPerHour: 400,
    manualVelocityLinesPerHour: 250,
    speedupPercentage: 60,
    estimatedHoursSaved: 1.2,
  });

  const mockHotFiles = Object.assign(new GetAnalyticsHotFilesResponseDto(), {
    totalAttributedSeconds: 7200,
    files: [{ path: 'src/main.ts', activeSeconds: 7200, percentage: 100 }],
    folders: [{ path: 'src', activeSeconds: 7200, percentage: 100 }],
  });

  const mockExportResult = {
    content: 'Session ID,Started At,Duration\nws_1,2026-03-30,3600',
    filename: 'sessions-export.csv',
    contentType: 'text/csv',
  };

  const mockAnalyticsService = {
    getDashboardStats: jest.fn(() => Promise.resolve(mockDashboard)),
  };

  const mockAnalyticsExportService = {
    exportSessions: jest.fn(() => Promise.resolve(mockExportResult)),
  };

  const mockIntegrationsService = {
    getLiveStatus: jest.fn(() => Promise.resolve(mockLiveStatus)),
    getAiRoiMetrics: jest.fn(() => Promise.resolve(mockAiRoi)),
    getHotFiles: jest.fn((_userId: TypeId<'users'>, _query: GetAnalyticsRangeRequestDto) =>
      Promise.resolve(mockHotFiles),
    ),
  };

  const mockAnalyticsUpdates = {
    streamForUser: jest.fn((_userId: TypeId<'users'>) =>
      of({ type: 'connected', data: { connectedAt: '2026-11-12T10:00:00.000Z' } }),
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: AnalyticsExportService,
          useValue: mockAnalyticsExportService,
        },
        {
          provide: IntegrationsAnalyticsService,
          useValue: mockIntegrationsService,
        },
        {
          provide: AnalyticsUpdatesService,
          useValue: mockAnalyticsUpdates,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: AuthenticatedUser;
          }>();

          if (req.headers.authorization === 'Bearer valid-jwt') {
            req.user = mockAuthUser;
            return true;
          }
          throw new UnauthorizedException();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 401 when requesting dashboard stats without token', async () => {
    const response = await request(getHttpServer(app)).get('/analytics/dashboard');

    expect(response.status).toBe(401);
  });

  it('should stream analytics updates for the authenticated user', async () => {
    const response = await request(getHttpServer(app))
      .get('/analytics/stream')
      .set('Authorization', 'Bearer valid-jwt')
      .set('Accept', 'text/event-stream');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('event: connected');
    expect(mockAnalyticsUpdates.streamForUser).toHaveBeenCalledWith(mockAuthUser.id);
  });

  it('should return dashboard summary statistics for authenticated user', async () => {
    const response = await request(getHttpServer(app))
      .get('/analytics/dashboard')
      .set('Authorization', 'Bearer valid-jwt');

    const body = response.body as GetAnalyticsDashboardResponseDto;

    expect(response.status).toBe(200);
    expect(body).toBeDefined();
    expect(mockAnalyticsService.getDashboardStats).toHaveBeenCalled();
  });

  it('should return live coding status for authenticated user', async () => {
    const response = await request(getHttpServer(app))
      .get('/analytics/status')
      .set('Authorization', 'Bearer valid-jwt');

    const body = response.body as GetIntegrationStatusResponseDto;

    expect(response.status).toBe(200);
    expect(body).toBeDefined();
    expect(mockIntegrationsService.getLiveStatus).toHaveBeenCalled();
  });

  it('should export sessions as downloadable CSV stream', async () => {
    const response = await request(getHttpServer(app))
      .get('/analytics/export')
      .set('Authorization', 'Bearer valid-jwt');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="sessions-export.csv"',
    );
    expect(response.text).toContain('Session ID,Started At,Duration');
  });

  it('should return AI productivity and ROI metrics for authenticated user', async () => {
    const response = await request(getHttpServer(app))
      .get('/analytics/ai-roi')
      .set('Authorization', 'Bearer valid-jwt');

    const body = response.body as GetIntegrationAiRoiResponseDto;

    expect(response.status).toBe(200);
    expect(body).toBeDefined();
    expect(mockIntegrationsService.getAiRoiMetrics).toHaveBeenCalled();
  });

  it('should return hot files for authenticated user', async () => {
    const response = await request(getHttpServer(app))
      .get('/analytics/hot-files?startDate=2026-11-01T00:00:00.000Z')
      .set('Authorization', 'Bearer valid-jwt');

    const body = response.body as GetAnalyticsHotFilesResponseDto;

    expect(response.status).toBe(200);
    expect(body.files[0]?.path).toBe('src/main.ts');
    expect(mockIntegrationsService.getHotFiles).toHaveBeenCalledWith(
      mockAuthUser.id,
      expect.objectContaining({ startDate: '2026-11-01T00:00:00.000Z' }),
    );
  });
});
