import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import { env } from '@devpulse/env/api';
import { typeIdGenerator } from '@devpulse/lib';

import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Project } from '../projects/entities/project.entity';
import { TelemetryEvent } from '../telemetry/entities/telemetry-event.entity';
import { WorkSession, WorkSessionStatus } from '../telemetry/entities/work-session.entity';
import { User } from '../users/entities/user.entity';
import { UserEncryption } from '../users/entities/user-encryption.entity';

import 'reflect-metadata';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: [User, UserEncryption, WorkSession, Project, ApiKey, TelemetryEvent],
  synchronize: true,
  logging: false,
});

async function runSeed(): Promise<void> {
  console.log('🌱 Starting Database Seeder...');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established.');

    const userRepo = AppDataSource.getRepository(User);
    const projectRepo = AppDataSource.getRepository(Project);
    const sessionRepo = AppDataSource.getRepository(WorkSession);

    console.log('🧹 Cleaning up old data...');

    await sessionRepo.createQueryBuilder().delete().execute();
    await projectRepo.createQueryBuilder().delete().execute();
    await userRepo.delete({ email: 'demo@devpulse.com' });

    console.log('✨ Cleaned up successfully.');

    const demoUser = new User();
    demoUser.id = typeIdGenerator('users');
    demoUser.email = 'demo@devpulse.com';
    demoUser.displayName = 'Demo User';
    demoUser.isActive = true;

    const savedUser = await userRepo.save(demoUser);
    console.log(`👤 Created Demo User: ${savedUser.email}`);

    const demoProject = new Project();
    demoProject.id = typeIdGenerator('projects');
    demoProject.name = 'DevPulse Core';
    demoProject.gitRemoteUrl = 'github.com:andrejshcherbakov/devpulse.git';
    demoProject.user = savedUser;
    demoProject.userId = savedUser.id;

    const savedProject = await projectRepo.save(demoProject);
    console.log(`📁 Created Demo Project: ${savedProject.name}`);

    const sessionsToInsert: Array<WorkSession> = [];
    const branches = ['feat/login', 'fix/bug-123', 'chore/update-deps'];
    const languages = ['TypeScript', 'Python', 'Go'];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const randomDate = faker.date.recent({ days: 30, refDate: now });
      const durationMinutes = faker.number.int({ min: 5, max: 120 });
      const endDate = new Date(randomDate.getTime() + durationMinutes * 60_000);

      const totalSeconds = durationMinutes * 60;
      const activePercentage = faker.number.float({ min: 0.3, max: 0.9 });
      const activeSeconds = Math.floor(totalSeconds * activePercentage);
      const idleSeconds = totalSeconds - activeSeconds;

      const focusScore = (activeSeconds / totalSeconds) * 100;
      const earnedMoney = activeSeconds * (5000 / 160 / 3600);

      const session = new WorkSession();
      session.id = typeIdGenerator('workSessions');
      session.user = savedUser;
      session.userId = savedUser.id;
      session.project = savedProject;
      session.projectId = savedProject.id;
      session.gitBranch = faker.helpers.arrayElement(branches);
      session.primaryLanguage = faker.helpers.arrayElement(languages);
      session.startedAt = randomDate;
      session.endedAt = endDate;
      session.activeSeconds = activeSeconds;
      session.idleSeconds = idleSeconds;
      session.focusScore = focusScore;
      session.earnedMoney = earnedMoney;
      session.status = WorkSessionStatus.CLOSED;

      sessionsToInsert.push(session);
    }

    await sessionRepo.save(sessionsToInsert);
    console.log(`📊 Inserted 100 Work Sessions.`);
    console.log('✅ Seeding completed successfully!');
  } catch (error: unknown) {
    console.error('❌ Seeder Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    throw new Error(`Seeding failed: ${errorMessage}`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

async function main(): Promise<void> {
  try {
    await runSeed();
  } catch (error: unknown) {
    console.error('❌ Fatal error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`Error details: ${errorMessage}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('❌ Unhandled error:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error details: ${errorMessage}`);
  process.exitCode = 1;
});
