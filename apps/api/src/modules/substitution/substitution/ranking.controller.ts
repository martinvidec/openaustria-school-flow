import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../../../modules/auth/decorators/check-permissions.decorator';
import { PrismaService } from '../../../config/database/prisma.service';
import { RankingService } from './ranking.service';
import { SubstitutionStatsService } from './substitution-stats.service';

/**
 * SUBST-02 -- Ranking REST API.
 *
 * Exposes the deterministic RankingService via
 *   GET /schools/:schoolId/substitutions/:id/candidates
 * so the admin UI can fetch a ranked candidate list for an open substitution
 * without re-implementing the ranking logic client-side.
 *
 * The ranking window defaults to the current Austrian semester via
 * SubstitutionStatsService (reuses the Phase 5 getSemesterDateRange utility).
 */
@ApiTags('Substitution')
@ApiBearerAuth()
@Controller('schools/:schoolId/substitutions')
export class RankingController {
  constructor(
    private readonly rankingService: RankingService,
    private readonly statsService: SubstitutionStatsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id/candidates')
  @CheckPermissions({ action: 'manage', subject: 'substitution' })
  @ApiOperation({
    summary: 'Get ranked substitute candidates for an open substitution (SUBST-02)',
  })
  async getCandidates(
    @Param('schoolId') schoolId: string,
    @Param('id') substitutionId: string,
  ) {
    const sub = await this.prisma.substitution.findUniqueOrThrow({
      where: { id: substitutionId },
      include: {
        absence: { select: { schoolId: true, teacherId: true } },
      },
    });

    const classSubject = await this.prisma.classSubject.findUniqueOrThrow({
      where: { id: sub.classSubjectId },
      select: { subjectId: true, classId: true },
    });

    // Ranking fairness window defaults to the current semester so the scored
    // fairness slice matches the stats table the admin sees on the same page.
    const { start, end } = this.statsService.resolveWindow({ window: 'semester' });

    return this.rankingService.rankCandidates({
      schoolId,
      absentTeacherId: sub.absence.teacherId,
      lessonId: sub.lessonId,
      date: sub.date,
      dayOfWeek: sub.dayOfWeek,
      periodNumber: sub.periodNumber,
      weekType: sub.weekType,
      subjectId: classSubject.subjectId,
      classId: classSubject.classId,
      windowStart: start,
      windowEnd: end,
    });
  }
}
