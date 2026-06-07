import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Issue #177-C — body for
 * `POST runs/:runId/conflicts/:conflictId/resolve`.
 *
 * Three resolution actions for a dropped-lesson conflict:
 *   - `cancel`            — drop the lesson permanently (no row created).
 *   - `reassign-resource` — re-place the lesson at its ORIGINAL slot with a
 *                           different free resource: `newTeacherId` for a
 *                           TEACHER conflict, `newRoomId` for a ROOM conflict.
 *   - `move-slot`         — re-place the lesson with its ORIGINAL teacher+room
 *                           at a different free slot (`dayOfWeek` +
 *                           `periodNumber`, optional `weekType`).
 *
 * class-validator decorators are mandatory: the global ValidationPipe runs
 * `whitelist + forbidNonWhitelisted`, so undecorated props are rejected.
 */
export class ResolveConflictDto {
  @IsIn(['reassign-resource', 'move-slot', 'cancel'])
  action!: 'reassign-resource' | 'move-slot' | 'cancel';

  /** reassign-resource on a TEACHER conflict: the replacement teacher id. */
  @IsOptional()
  @IsString()
  newTeacherId?: string;

  /** reassign-resource on a ROOM conflict: the replacement room id. */
  @IsOptional()
  @IsString()
  newRoomId?: string;

  /** move-slot: target day (DayOfWeek enum value, e.g. "TUESDAY"). */
  @IsOptional()
  @IsString()
  dayOfWeek?: string;

  /** move-slot: target period number. */
  @IsOptional()
  @IsInt()
  @Min(1)
  periodNumber?: number;

  /** move-slot: target week type ("BOTH" | "A" | "B"); defaults to the conflict's. */
  @IsOptional()
  @IsString()
  weekType?: string;
}
