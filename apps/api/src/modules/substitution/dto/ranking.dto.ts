import { IsUUID } from 'class-validator';

/**
 * Phase 6 -- SUBST-02 ranking endpoint params.
 *
 * The POST /substitutions/:substitutionId/candidates endpoint takes no body:
 * it reads the absent teacher, lesson identity, subject, class, date, and
 * slot directly from the Substitution row, so only :substitutionId is needed.
 */
export class RankingQueryDto {
  @IsUUID()
  substitutionId!: string;
}
