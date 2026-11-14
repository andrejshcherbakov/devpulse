import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, ValueTransformer } from 'typeorm';

import { type WorkingTreeChange } from '@devpulse/lib';
import { type TypeId } from '@devpulse/lib/ids';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';

import { TelemetryEvent } from './telemetry-event.entity';

const decimalTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number | null => (value === null ? null : Number.parseFloat(value)),
};

export enum WorkSessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('work_sessions')
@Index(['userId', 'startedAt'])
@Index(['userId', 'gitBranch', 'status'])
@Index(['projectId', 'gitBranch'])
export class WorkSession extends AppBaseEntity<'workSessions'> {
  @Column({
    type: 'enum',
    enum: WorkSessionStatus,
    default: WorkSessionStatus.ACTIVE,
  })
  public status!: WorkSessionStatus;

  @Column({ type: 'varchar', name: 'git_branch', length: 255, nullable: true })
  public gitBranch!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  public startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  public endedAt!: Date | null;

  @Column({ name: 'active_seconds', type: 'int', default: 0 })
  public activeSeconds!: number;

  @Column({ name: 'idle_seconds', type: 'int', default: 0 })
  public idleSeconds!: number;

  @Column({
    name: 'focus_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  public focusScore!: number;

  @Column({
    name: 'earned_money',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  public earnedMoney!: number;

  @Column({ type: 'varchar', name: 'primary_language', length: 50, nullable: true })
  public primaryLanguage!: string | null;

  @Column({ name: 'language_seconds', type: 'jsonb', nullable: true, default: () => "'{}'::jsonb" })
  public languageSeconds!: Record<string, number> | null;

  @Column({ name: 'current_language', type: 'varchar', length: 50, nullable: true })
  public currentLanguage!: string | null;

  @Column({ name: 'file_seconds', type: 'jsonb', default: () => "'{}'::jsonb" })
  public fileSeconds!: Record<string, number>;

  @Column({ name: 'current_file_path', type: 'varchar', length: 512, nullable: true })
  public currentFilePath!: string | null;

  @Column({ name: 'machine_id', type: 'varchar', length: 64, nullable: true })
  public machineId!: string | null;

  @Column({ name: 'commands_run', type: 'int', default: 0 })
  public commandsRun!: number;

  @Column({ name: 'failed_commands', type: 'int', default: 0 })
  public failedCommands!: number;

  @Column({ name: 'terminal_commands', type: 'jsonb', default: () => "'[]'::jsonb" })
  public terminalCommands!: Array<{
    command: string;
    cwd: string | null;
    exitCode: number | null;
    durationMs: number;
    kind: string;
    timestamp: string;
  }>;

  @Column({ name: 'commits_count', type: 'int', default: 0 })
  public commitsCount!: number;

  @Column({ name: 'commits', type: 'jsonb', default: () => "'[]'::jsonb" })
  public commits!: Array<{
    hash: string;
    message: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
    filesList: Array<string>;
    timestamp: string;
  }>;

  @Column({ name: 'working_tree_changes', type: 'jsonb', nullable: true })
  public workingTreeChanges!: Array<WorkingTreeChange> | null;

  @Column({ name: 'touched_symbols', type: 'jsonb', default: () => "'{}'::jsonb" })
  public touchedSymbols!: Record<string, Array<string>>;

  @ManyToOne(() => User, (user) => user.workSessions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  public user!: User;

  @Column({ name: 'user_id', type: 'varchar', length: 40 })
  public userId!: TypeId<'users'>;

  @ManyToOne(() => Project, (project) => project.workSessions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'project_id' })
  public project!: Project | null;

  @Column({ name: 'project_id', type: 'varchar', length: 40, nullable: true })
  public projectId!: TypeId<'projects'> | null;

  @OneToMany(() => TelemetryEvent, (event) => event.session)
  public events!: Array<TelemetryEvent>;

  @Column({ name: 'ai_assisted', type: 'boolean', default: false })
  public aiAssisted!: boolean;

  @Column({ name: 'ai_interactions_count', type: 'int', default: 0 })
  public aiInteractionsCount!: number;
}
