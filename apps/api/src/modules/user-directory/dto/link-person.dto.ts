import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * Phase 13-01 USER-05 — POST /admin/users/:userId/link-person body.
 *
 * Tells UserDirectoryService.linkPerson which side-service to dispatch
 * to (teacher / student / parent) and which Person row (via the relation
 * id) to wire to the Keycloak user. See person-link.schema.ts in
 * @schoolflow/shared for the client-side (Zod) mirror.
 */
export class LinkPersonDto {
  @ApiProperty({ enum: ['TEACHER', 'STUDENT', 'PARENT'] })
  @IsIn(['TEACHER', 'STUDENT', 'PARENT'])
  personType!: 'TEACHER' | 'STUDENT' | 'PARENT';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  personId!: string;
}
