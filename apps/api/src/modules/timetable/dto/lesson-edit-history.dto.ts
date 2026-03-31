import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single edit history record for a timetable lesson.
 * Returned by GET /timetable/runs/:runId/edit-history.
 */
export class LessonEditHistoryDto {
  @ApiProperty({ description: 'Edit record ID' })
  id!: string;

  @ApiProperty({ description: 'ID of the lesson that was edited' })
  lessonId!: string;

  @ApiProperty({ description: 'Keycloak user ID of the editor' })
  editedBy!: string;

  @ApiPropertyOptional({ description: 'Display name of the editor (if resolvable)' })
  editedByName?: string;

  @ApiProperty({ description: 'Type of edit action', enum: ['move', 'swap', 'cancel', 'revert'] })
  editAction!: string;

  @ApiProperty({ description: 'State before the edit (JSON)' })
  previousState!: Record<string, unknown>;

  @ApiProperty({ description: 'State after the edit (JSON)' })
  newState!: Record<string, unknown>;

  @ApiProperty({ description: 'ISO timestamp of when the edit was made' })
  createdAt!: string;
}
