import { Module } from '@nestjs/common';
import { RoleManagementService } from './role-management.service';
import { RoleManagementController } from './role-management.controller';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';

@Module({
  imports: [KeycloakAdminModule],
  controllers: [RoleManagementController],
  providers: [RoleManagementService],
  exports: [RoleManagementService],
})
export class RoleManagementModule {}
