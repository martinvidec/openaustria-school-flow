import { Module } from '@nestjs/common';
import { UserDirectoryService } from './user-directory.service';
import { UserDirectoryController } from './user-directory.controller';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';
import { TeacherModule } from '../teacher/teacher.module';
import { StudentModule } from '../student/student.module';
import { ParentModule } from '../parent/parent.module';
import { EffectivePermissionsModule } from '../effective-permissions/effective-permissions.module';

/**
 * Phase 13-01 — admin user directory module.
 *
 * Imports KeycloakAdminModule + the three person-side modules
 * (TeacherModule, StudentModule, ParentModule) so the dispatcher in
 * UserDirectoryService can call their {link,unlink}KeycloakUser methods.
 *
 * Task 3 will add the Student/Parent linkKeycloakUser surface — this
 * module's imports are already wired.
 */
@Module({
  imports: [
    KeycloakAdminModule,
    TeacherModule,
    StudentModule,
    ParentModule,
    EffectivePermissionsModule,
  ],
  controllers: [UserDirectoryController],
  providers: [UserDirectoryService],
  exports: [UserDirectoryService],
})
export class UserDirectoryModule {}
