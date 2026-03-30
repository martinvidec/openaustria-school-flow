import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  DSGVO_DELETION_QUEUE,
  DSGVO_EXPORT_QUEUE,
  DSGVO_RETENTION_QUEUE,
  SOLVER_QUEUE,
} from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: DSGVO_DELETION_QUEUE },
      { name: DSGVO_EXPORT_QUEUE },
      { name: DSGVO_RETENTION_QUEUE },
      { name: SOLVER_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
