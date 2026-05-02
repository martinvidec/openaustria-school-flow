import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './config/database/prisma.module';
import { QueueModule } from './config/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { HealthModule } from './modules/health/health.module';
import { SchoolModule } from './modules/school/school.module';
import { EncryptionModule } from './modules/dsgvo/encryption/encryption.module';
import { DsgvoModule } from './modules/dsgvo/dsgvo.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { KeycloakAdminModule } from './modules/keycloak-admin/keycloak-admin.module';
import { StudentModule } from './modules/student/student.module';
import { ParentModule } from './modules/parent/parent.module';
import { SubstitutionModule } from './modules/substitution/substitution.module';
import { ClassModule } from './modules/class/class.module';
import { SubjectModule } from './modules/subject/subject.module';
import { RoomModule } from './modules/room/room.module';
import { ResourceModule } from './modules/resource/resource.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { UserContextModule } from './modules/user-context/user-context.module';
import { ClassBookModule } from './modules/classbook/classbook.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { ImportModule } from './modules/import/import.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { PushModule } from './modules/push/push.module';
import { UserDirectoryModule } from './modules/user-directory/user-directory.module';
import { RoleManagementModule } from './modules/role-management/role-management.module';
import { PermissionOverrideModule } from './modules/permission-override/permission-override.module';
import { EffectivePermissionsModule } from './modules/effective-permissions/effective-permissions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    QueueModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    HealthModule,
    SchoolModule,
    EncryptionModule,
    DsgvoModule,
    TeacherModule,
    KeycloakAdminModule,
    StudentModule,
    ParentModule,
    SubstitutionModule,
    ClassModule,
    SubjectModule,
    RoomModule,
    ResourceModule,
    TimetableModule,
    UserContextModule,
    ClassBookModule,
    CommunicationModule,
    HomeworkModule,
    ImportModule,
    CalendarModule,
    PushModule,
    UserDirectoryModule,
    RoleManagementModule,
    PermissionOverrideModule,
    EffectivePermissionsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
