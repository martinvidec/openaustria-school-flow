import { Module } from '@nestjs/common';
import { UserContextController } from './user-context.controller';
import { UserContextService } from './user-context.service';

@Module({
  controllers: [UserContextController],
  providers: [UserContextService],
})
export class UserContextModule {}
