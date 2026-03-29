import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakJwtStrategy } from './strategies/keycloak-jwt.strategy';
import { CaslModule } from './casl/casl.module';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'keycloak-jwt' }),
    CaslModule,
  ],
  providers: [
    KeycloakJwtStrategy,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [PassportModule, CaslModule],
})
export class AuthModule {}
