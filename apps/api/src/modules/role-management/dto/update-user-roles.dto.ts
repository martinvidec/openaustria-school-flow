import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

/**
 * Phase 13-01 USER-02 — PUT /admin/users/:userId/roles body.
 *
 * Mirrors `updateUserRolesSchema` (packages/shared) at the HTTP layer.
 * Empty array is legal (clears all roles, subject to the min-1-admin
 * guard server-side which surfaces as RFC 9457 409).
 */
export class UpdateUserRolesDto {
  @ApiProperty({ type: [String], maxItems: 5 })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  roleNames!: string[];
}
