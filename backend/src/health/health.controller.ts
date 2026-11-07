import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RedisService } from '../redis/services/redis.service';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  public async getHealth(): Promise<HealthResponse> {
    await Promise.all([this.dataSource.query('SELECT 1'), this.redisService.getClient().ping()]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
