import { Module } from '@nestjs/common';
import { KeycloakAdminController } from './keycloak-admin.controller';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  controllers: [KeycloakAdminController],
  providers: [KeycloakAdminService],
  exports: [KeycloakAdminService],
})
export class KeycloakAdminModule {}
