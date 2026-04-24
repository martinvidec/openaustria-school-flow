import { Module } from '@nestjs/common';
import { EffectivePermissionsService } from './effective-permissions.service';

@Module({
  providers: [EffectivePermissionsService],
  exports: [EffectivePermissionsService],
})
export class EffectivePermissionsModule {}
