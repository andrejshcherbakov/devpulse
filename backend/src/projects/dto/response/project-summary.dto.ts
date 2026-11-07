import { ApiProperty } from '@nestjs/swagger';

import { type TypeId } from '@devpulse/lib';

export class ProjectLanguageDto {
  @ApiProperty({ description: 'Programming language name', example: 'typescript' })
  public name!: string;

  @ApiProperty({ description: 'Time spent on this language in seconds', example: 12_600 })
  public seconds!: number;

  @ApiProperty({ description: 'Percentage of total project time (0-100)', example: 85 })
  public percentage!: number;
}

export class ProjectBranchDto {
  @ApiProperty({ description: 'Git branch name', example: 'feat/auth-flow' })
  public name!: string;

  @ApiProperty({ description: 'Active time on this branch in seconds', example: 4500 })
  public seconds!: number;
}

export class ProjectRecentSessionDto {
  @ApiProperty({ description: 'Unique session identifier', example: 'ws_abc123def456' })
  public id!: TypeId<'workSessions'>;

  @ApiProperty({
    description: 'Session start timestamp (ISO 8601)',
    example: '2026-10-18T15:45:00.000Z',
  })
  public startedAt!: string;

  @ApiProperty({ description: 'Active duration in seconds', example: 3600 })
  public durationSeconds!: number;

  @ApiProperty({
    description: 'Git branch used during the session',
    nullable: true,
    example: 'feat/auth-flow',
  })
  public gitBranch!: string | null;

  @ApiProperty({
    description: 'Primary programming language of the session',
    nullable: true,
    example: 'typescript',
  })
  public primaryLanguage!: string | null;
}

export class ProjectSummaryDto {
  @ApiProperty({ description: 'Unique project identifier', example: 'p_123456789' })
  public id!: TypeId<'projects'>;

  @ApiProperty({
    description: 'Project name (usually derived from repository name)',
    example: 'DevPulse',
  })
  public name!: string;

  @ApiProperty({
    description: 'Git remote origin URL. Null for local repositories.',
    nullable: true,
    example: 'https://github.com/andrejshcherbakov/devpulse.git',
  })
  public remote!: string | null;

  @ApiProperty({ description: 'Total active time formatted as "Xh Ym"', example: '12h 30m' })
  public activeTime!: string;

  @ApiProperty({
    description: 'Weighted average focus score across all sessions (0-100)',
    example: 85,
  })
  public focusScore!: number;

  @ApiProperty({ description: 'Total number of closed work sessions in this project', example: 42 })
  public sessions!: number;

  @ApiProperty({
    description: 'Timestamp of the most recent activity',
    nullable: true,
    example: '2026-10-18T15:45:00.000Z',
  })
  public lastActive!: string | null;

  @ApiProperty({ description: 'Total number of git commits tracked in this project', example: 128 })
  public totalCommits!: number;

  @ApiProperty({ description: 'Total number of terminal commands executed', example: 342 })
  public totalCommands!: number;

  @ApiProperty({
    description: 'Programming languages breakdown, sorted by time descending',
    type: [ProjectLanguageDto],
  })
  public languages!: Array<ProjectLanguageDto>;

  @ApiProperty({
    description: 'Git branches breakdown, sorted by time descending',
    type: [ProjectBranchDto],
  })
  public branches!: Array<ProjectBranchDto>;

  @ApiProperty({
    description: 'Five most recent closed sessions',
    type: [ProjectRecentSessionDto],
  })
  public recentSessions!: Array<ProjectRecentSessionDto>;
}
