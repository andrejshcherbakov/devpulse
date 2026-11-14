import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  type TelemetryEventDto,
  WORKING_TREE_STATUSES,
  type WorkingTreeChange,
  type WorkingTreeStatus,
} from '@devpulse/lib';

class WorkingTreeChangeItemDto implements WorkingTreeChange {
  @ApiProperty({ description: 'Workspace-relative path' })
  @IsString()
  @MaxLength(512)
  public path!: string;

  @ApiProperty({ description: 'Observed Git working-tree status', enum: WORKING_TREE_STATUSES })
  @IsIn(WORKING_TREE_STATUSES)
  public status!: WorkingTreeStatus;
}

export class TelemetryEventItemDto implements TelemetryEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: [
      'heartbeat',
      'file_save',
      'file_switch',
      'idle_start',
      'idle_end',
      'session_end',
      'terminal_command',
      'task_run',
      'git_commit',
      'ai_interaction',
      'working_tree',
      'symbol_touch',
    ],
  })
  @IsIn([
    'heartbeat',
    'file_save',
    'file_switch',
    'idle_start',
    'idle_end',
    'session_end',
    'terminal_command',
    'task_run',
    'git_commit',
    'ai_interaction',
    'working_tree',
    'symbol_touch',
  ])
  public type!: TelemetryEventDto['type'];

  @ApiProperty({ description: 'Git branch name (e.g., main, develop)' })
  @IsString()
  @IsOptional()
  public gitBranch!: string | null;

  @ApiProperty({ description: 'Git remote origin URL (e.g. github.com/org/repo.git)' })
  @IsString()
  @IsOptional()
  public gitRemoteUrl?: string;

  @ApiProperty({
    description: 'Workspace-relative file path; null clears the active editor',
    nullable: true,
    required: false,
  })
  @IsString()
  @MaxLength(512)
  @IsOptional()
  public filePath?: string | null;

  @ApiProperty({ description: 'Programming language' })
  @IsString()
  @IsOptional()
  public language?: string;

  @ApiProperty({ description: 'Duration in milliseconds' })
  @IsInt()
  @Min(0)
  @IsOptional()
  public durationMs?: number | null;

  @ApiProperty({ description: 'Client timestamp' })
  @IsDateString()
  @IsOptional()
  public clientTimestamp?: string;

  @ApiProperty({
    description: 'Actual activity-state boundary when it differs from event delivery time',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  public activityChangedAt?: string;

  @ApiProperty({ description: 'VS Code machine identifier', required: false })
  @IsString()
  @IsOptional()
  public machineId?: string;

  @ApiProperty({ description: 'VS Code session identifier', required: false })
  @IsString()
  @IsOptional()
  public sessionId?: string;

  @ApiProperty({ description: 'Sanitized terminal command text', required: false })
  @IsString()
  @IsOptional()
  public command?: string;

  @ApiProperty({ description: 'Working directory of the command', required: false })
  @IsString()
  @IsOptional()
  public commandCwd?: string | null;

  @ApiProperty({ description: 'Exit code (0 = success)', required: false })
  @IsInt()
  @IsOptional()
  public exitCode?: number | null;

  @ApiProperty({ description: 'Task name from Tasks API', required: false })
  @IsString()
  @IsOptional()
  public taskName?: string;

  @ApiProperty({ description: 'Task source (npm, typescript, gulp, shell, ...)', required: false })
  @IsString()
  @IsOptional()
  public taskSource?: string;

  @ApiProperty({ description: 'Commit SHA', required: false })
  @IsString()
  @IsOptional()
  public commitHash?: string;

  @ApiProperty({ description: 'Commit message subject', required: false })
  @IsString()
  @IsOptional()
  public commitMessage?: string;

  @ApiProperty({ description: 'Files changed in commit', required: false })
  @IsInt()
  @IsOptional()
  public filesChanged?: number;

  @ApiProperty({ description: 'Lines inserted', required: false })
  @IsInt()
  @IsOptional()
  public insertions?: number;

  @ApiProperty({ description: 'Lines deleted', required: false })
  @IsInt()
  @IsOptional()
  public deletions?: number;

  @ApiProperty({ description: 'List of changed files', required: false })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  @IsOptional()
  public filesList?: Array<string>;

  @ApiProperty({ description: 'Specific AI tool used (copilot, claude, etc.)', required: false })
  @IsString()
  @IsOptional()
  public aiTool?: string;

  @ApiProperty({
    description: 'Whether AI interaction is estimated (heuristic-based)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  public aiEstimated?: boolean;

  @ApiProperty({
    description: 'Latest observed uncommitted Git changes; an empty list means a clean tree',
    type: [WorkingTreeChangeItemDto],
    required: false,
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => WorkingTreeChangeItemDto)
  @IsOptional()
  public workingTreeChanges?: Array<WorkingTreeChangeItemDto>;

  @ApiProperty({
    description: 'Names of touched classes and functions; source code is not included',
    type: [String],
    required: false,
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  @IsOptional()
  public symbols?: Array<string>;
}

export class IngestTelemetryBatchRequestDto {
  @ApiProperty({ type: [TelemetryEventItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryEventItemDto)
  public events!: Array<TelemetryEventItemDto>;

  @ApiProperty({ description: 'Stable batch id for idempotent retries', required: false })
  @IsString()
  @IsOptional()
  public batchId?: string;
}
