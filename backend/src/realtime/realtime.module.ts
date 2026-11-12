import { Global, Module } from '@nestjs/common';

import { AnalyticsUpdatesService } from './analytics-updates.service';

@Global()
@Module({
  providers: [AnalyticsUpdatesService],
  exports: [AnalyticsUpdatesService],
})
export class RealtimeModule {}
