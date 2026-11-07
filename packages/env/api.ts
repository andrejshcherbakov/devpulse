import path from 'node:path';

import { createEnv } from '@t3-oss/env-core';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: path.resolve(process.cwd(), '../.env') });

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    PORT: z.coerce.number().default(3000),

    // PostgreSQL
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().url(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),

    CORS_ORIGIN: z.string().default('http://localhost:3001'),
    COOKIE_DOMAIN: z.string().trim().min(1).optional(),

    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(3),
  },

  runtimeEnv: process.env,
});
