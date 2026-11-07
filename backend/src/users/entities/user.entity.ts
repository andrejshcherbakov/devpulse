import { Column, Entity, OneToMany, OneToOne } from 'typeorm';

import { ApiKey } from '../../api-keys/entities/api-key.entity';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkSession } from '../../telemetry/entities/work-session.entity';

import { UserEncryption } from './user-encryption.entity';

@Entity('users')
export class User extends AppBaseEntity<'users'> {
  @Column({
    unique: true,
    type: 'varchar',
    length: 255,
  })
  public email!: string;

  @OneToOne(() => UserEncryption, (encryption) => encryption.user, { cascade: true })
  public encryption!: UserEncryption;

  @Column({
    type: 'varchar',
    name: 'display_name',
    length: 100,
    nullable: true,
    unique: true,
  })
  public displayName!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  public isActive!: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'UTC',
  })
  public timezone!: string;

  @Column({
    name: 'openai_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  public openaiKey!: string | null;

  @Column({
    name: 'llm_provider',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  public llmProvider!: 'openrouter' | 'openai' | 'custom' | null;

  @Column({
    name: 'llm_model',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  public llmModel!: string | null;

  @Column({
    name: 'llm_base_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  public llmBaseUrl!: string | null;

  @Column({ name: 'hourly_rate', type: 'real', default: 0 })
  public hourlyRate = 0;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  public currency = 'USD';

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user, { cascade: true })
  public apiKeys!: Array<ApiKey>;

  @OneToMany(() => Project, (project) => project.user, { cascade: true })
  public projects!: Array<Project>;

  @OneToMany(() => WorkSession, (session) => session.user, { cascade: true })
  public workSessions!: Array<WorkSession>;
}
