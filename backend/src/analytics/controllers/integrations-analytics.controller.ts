import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { RequireScopes } from '../../api-keys/decorators/require-scopes.decorator';
import { ApiKeyScope } from '../../api-keys/enums/api-key.enums';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';
import { ScopesGuard } from '../../api-keys/guards/scopes.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ProjectSummaryDto } from '../../projects/dto/response/project-summary.dto';
import { ProjectsService } from '../../projects/services/projects.service';
import { User } from '../../users/entities/user.entity';
import { GetAnalyticsRangeRequestDto } from '../dto/request/get-analytics-range-request.dto';
import { GetIntegrationSessionsRequestDto } from '../dto/request/get-integration-sessions-request.dto';
import { GetAnalyticsBranchesResponseDto } from '../dto/response/get-analytics-branches-response.dto';
import { GetAnalyticsCommandsResponseDto } from '../dto/response/get-analytics-commands-response.dto';
import { GetAnalyticsDashboardResponseDto } from '../dto/response/get-analytics-dashboard-response.dto';
import { GetAnalyticsHotFilesResponseDto } from '../dto/response/get-analytics-hot-files-response.dto';
import { GetAnalyticsTimeseriesResponseDto } from '../dto/response/get-analytics-timeseries-response.dto';
import { GetIntegrationAiRoiResponseDto } from '../dto/response/get-integration-ai-roi-response.dto';
import { GetIntegrationLanguagesResponseDto } from '../dto/response/get-integration-languages-response.dto';
import { GetIntegrationSessionItemDto } from '../dto/response/get-integration-sessions-response.dto';
import { GetIntegrationStatusResponseDto } from '../dto/response/get-integration-status-response.dto';
import { IntegrationPingResponseDto } from '../dto/response/integration-ping-response.dto';
import { AnalyticsService } from '../services/analytics.service';
import { IntegrationsAnalyticsService } from '../services/integrations-analytics.service';

@ApiTags('Integrations Analytics')
@ApiSecurity('ApiKeyAuth')
@Controller('integrations/analytics')
@UseGuards(ApiKeyGuard, ScopesGuard)
export class IntegrationsAnalyticsController {
  constructor(
    private readonly dashboardAnalyticsService: AnalyticsService,
    private readonly analyticsService: IntegrationsAnalyticsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get('ping')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify connection and API key scopes',
    description:
      'Use this endpoint as the first integration request. A successful response confirms that the API key is valid and includes the analytics:read scope.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: IntegrationPingResponseDto })
  public ping(@CurrentUser() user: User): IntegrationPingResponseDto {
    return { success: true, message: 'Integration access granted', userId: user.id };
  }

  @Get('sessions')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a list of recent work sessions',
    description:
      'Returns sessions newest first. durationSeconds contains confirmed active time and excludes recorded idle intervals.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of recent sessions (minimum 1, values above 50 are capped)',
    minimum: 1,
    maximum: 50,
    example: 10,
  })
  @ApiResponse({ status: HttpStatus.OK, type: [GetIntegrationSessionItemDto] })
  public async getSessions(
    @CurrentUser() user: User,
    @Query() query: GetIntegrationSessionsRequestDto,
  ): Promise<Array<GetIntegrationSessionItemDto>> {
    return this.analyticsService.getRecentSessions(
      user.id,
      Math.min(query.limit ?? 10, 50),
      query.projectId,
    );
  }

  @Get('summary')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get activity summary for a period',
    description:
      'Returns active time, earnings, weighted focus score, session count, and the top language. All filters are optional; omit them to query all recorded activity.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsDashboardResponseDto })
  public async getSummary(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsDashboardResponseDto> {
    return this.dashboardAnalyticsService.getDashboardStats(user.id, query);
  }

  @Get('timeseries')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily activity timeseries',
    description:
      'Groups active time and earnings by calendar day in the DevPulse user timezone. Results are ordered by date ascending.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsTimeseriesResponseDto })
  public async getTimeseries(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsTimeseriesResponseDto> {
    return this.dashboardAnalyticsService.getTimeseries(user, query);
  }

  @Get('branches')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get activity grouped by Git branch',
    description: 'Returns up to ten branches ordered by attributed active time descending.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsBranchesResponseDto })
  public async getBranches(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsBranchesResponseDto> {
    return this.dashboardAnalyticsService.getBranchesDistribution(user.id, query);
  }

  @Get('commands')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get terminal and task execution statistics',
    description:
      'Returns sanitized command or task labels with run count, failed runs, average duration, and success rate. Secrets are removed by the extension before upload.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsCommandsResponseDto })
  public async getCommands(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsCommandsResponseDto> {
    return this.dashboardAnalyticsService.getCommandsBreakdown(user.id, query);
  }

  @Get('status')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current tracker status',
    description:
      'Reports whether recent telemetry indicates active coding. When inactive, inactiveReason explains whether no data exists, the session closed, or the last signal became stale.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationStatusResponseDto })
  public async getLiveStatus(@CurrentUser() user: User): Promise<GetIntegrationStatusResponseDto> {
    return this.analyticsService.getLiveStatus(user.id);
  }

  @Get('languages')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get programming languages usage breakdown',
    description:
      'Returns language-attributed active time for the requested period and project. Percentages are calculated from language-attributed time.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationLanguagesResponseDto })
  public async getLanguages(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetIntegrationLanguagesResponseDto> {
    return this.analyticsService.getLanguagesBreakdown(user.id, query);
  }

  @Get('hot-files')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the most active files and folders',
    description:
      'Returns up to five workspace-relative file paths and immediate parent folders for the requested period. Time is estimated between active editor events, capped at five minutes per interval, and excludes idle periods. Percentages are based on file-attributed time, which can be lower than total session time. File contents and absolute paths are never collected.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetAnalyticsHotFilesResponseDto })
  public async getHotFiles(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsHotFilesResponseDto> {
    return this.analyticsService.getHotFiles(user.id, query);
  }

  @Get('ai-roi')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get estimated AI-assisted activity metrics',
    description:
      'Compares sessions with and without detected AI assistance. These values are estimates derived from telemetry signals and must not be treated as a measure of individual performance.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: GetIntegrationAiRoiResponseDto })
  public async getAiRoi(
    @CurrentUser() user: User,
    @Query() query: GetAnalyticsRangeRequestDto,
  ): Promise<GetIntegrationAiRoiResponseDto> {
    return this.analyticsService.getAiRoiMetrics(user.id, query);
  }

  @Get('projects')
  @RequireScopes(ApiKeyScope.ANALYTICS_READ)
  @ApiSecurity('ApiKeyAuth', [ApiKeyScope.ANALYTICS_READ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all-time statistics per project',
    description:
      'Returns all tracked projects with cumulative activity, branches, languages, commands, commits, and recent sessions. This endpoint currently returns all-time values.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [ProjectSummaryDto] })
  public async getProjects(@CurrentUser() user: User): Promise<Array<ProjectSummaryDto>> {
    return this.projectsService.getUserProjects(user.id);
  }
}
