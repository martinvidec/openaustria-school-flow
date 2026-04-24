import { Module } from '@nestjs/common';
import { PermissionOverrideService } from './permission-override.service';
import { PermissionOverrideController } from './permission-override.controller';

@Module({
  controllers: [PermissionOverrideController],
  providers: [PermissionOverrideService],
  exports: [PermissionOverrideService],
})
export class PermissionOverrideModule {}
