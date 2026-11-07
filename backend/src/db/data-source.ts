import { DataSource } from 'typeorm';

import { env } from '@devpulse/env/api';

import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Project } from '../projects/entities/project.entity';
import { TelemetryEvent } from '../telemetry/entities/telemetry-event.entity';
import { WorkSession } from '../telemetry/entities/work-session.entity';
import { User } from '../users/entities/user.entity';
import { UserEncryption } from '../users/entities/user-encryption.entity';
import { WorklogEntry } from '../worklog/entities/worklog-entry.entity';

export default new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: [User, UserEncryption, ApiKey, Project, TelemetryEvent, WorkSession, WorklogEntry],
  migrations: ['src/db/migrations/*.ts'],
  synchronize: false,
});
