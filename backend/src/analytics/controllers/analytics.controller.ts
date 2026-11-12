import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  type MessageEvent,
  Query,
  Res,
  Sse,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Observable } from 'rxjs';

import { type PipelineHealth } from '@devpulse/lib';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { type AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { AnalyticsUpdatesService } from '../../realtime/analytics-updates.service';
import { GetAnalyticsRangeRequestDto } from '../dto/request/get-analytics-range-request.dto';
import { GetAnalyticsBranchesResponseDto } from '../dto/response/get-analytics-branches-response.dto';
import { GetAnalyticsCommandsResponseDto } from '../dto/response/get-analytics-commands-response.dto';
import { GetAnalyticsDashboardResponseDto } from '../dto/response/get-analytics-dashboard-response.dto';
import { GetAnalyticsHotFilesResponseDto } from '../dto/response/get-analytics-hot-files-response.dto';
import { GetAnalyticsTimeseriesResponseDto } from '../dto/response/get-analytics-timeseries-response.dto';
import { GetIntegrationAiRoiResponseDto } from '../dto/response/get-integration-ai-roi-response.dto';
import { GetIntegrationLanguagesResponseDto } from '../dto/response/get-integration-languages-response.dto';
import { GetIntegrationStatusResponseDto } from '../dto/response/get-integration-status-response.dto';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsExportService } from '../services/analytics-export.service';
import { IntegrationsAnalyticsService } from '../services/integrations-analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly analyticsExportService: AnalyticsExportService,
    private readonly integrationsService: IntegrationsAnalyticsService,
    private readonly analyticsUpdates: AnalyticsUpdatesService,
  ) {}

  @Sse('stream')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({ summary: 'Stream authenticated analytics update notifications' })
  public streamUpdates(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.analyticsUpdates.streamForUser(user.id);
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard summary stats' })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsDashboardResponseDto })
  public async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsDashboardResponseDto> {
    return this.analyticsService.getDashboardStats(user.id, query);
  }

  @Get('timeseries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get activity timeseries for chart' })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsTimeseriesResponseDto })
  public async getTimeseries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsTimeseriesResponseDto> {
    return this.analyticsService.getTimeseries(user, query);
  }

  @Get('branches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get branches distribution' })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsBranchesResponseDto })
  public async getBranches(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsBranchesResponseDto> {
    return this.analyticsService.getBranchesDistribution(user.id, query);
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get live coding status' })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationStatusResponseDto })
  public async getLiveStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GetIntegrationStatusResponseDto> {
    return this.integrationsService.getLiveStatus(user.id);
  }

  @Get('languages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get programming languages breakdown' })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationLanguagesResponseDto })
  public async getLanguages(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetIntegrationLanguagesResponseDto> {
    return this.integrationsService.getLanguagesBreakdown(user.id, query);
  }

  @Get('commands')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get terminal commands breakdown' })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsCommandsResponseDto })
  public async getCommands(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsCommandsResponseDto> {
    return this.analyticsService.getCommandsBreakdown(user.id, query);
  }

  @Get('hot-files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get files and folders with the most active editor time',
    description:
      'Returns the top five workspace-relative file paths and immediate parent folders. Percentages use only time attributable to an active editor; idle time and file contents are never included.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsHotFilesResponseDto })
  public async getHotFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsHotFilesResponseDto> {
    return this.integrationsService.getHotFiles(user.id, query);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export sessions to CSV' })
  public async exportSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.analyticsExportService.exportSessions(user.id, user.timezone, query);

    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });

    return new StreamableFile(Buffer.from(file.content, 'utf8'));
  }

  @Get('ai-roi')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI productivity speedup and ROI metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  public async getAiRoi(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetIntegrationAiRoiResponseDto> {
    return this.integrationsService.getAiRoiMetrics(user.id, query);
  }

  @Get('pipeline-health')
  @ApiOperation({ summary: 'Real-time status of telemetry pipeline components' })
  public async getPipelineHealth(@CurrentUser() user: AuthenticatedUser): Promise<PipelineHealth> {
    return this.analyticsService.getPipelineHealth(user.id);
  }
}
