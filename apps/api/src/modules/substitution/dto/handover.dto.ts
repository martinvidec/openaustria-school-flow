import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Phase 6 -- SUBST-04 handover note DTOs.
 */
export class CreateHandoverNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;
}

export class HandoverNoteParamsDto {
  @IsString()
  @IsNotEmpty()
  substitutionId!: string;
}
