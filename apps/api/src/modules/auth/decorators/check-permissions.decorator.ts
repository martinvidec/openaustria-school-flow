import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  action: string;
  subject: string;
}

export const CHECK_PERMISSIONS_KEY = 'check_permissions';
export const CheckPermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(CHECK_PERMISSIONS_KEY, permissions);
