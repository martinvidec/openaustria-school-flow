import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { QueryDsgvoJobsDto } from './dto/query-dsgvo-jobs.dto';

/**
 * Person summary embedded in each DsgvoJob row -- enough for the JobsTab
 * to render `Datenexport für Maria Müller` without a second roundtrip per row.
 */
type PersonSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

@Injectable()
export class DsgvoJobsService {
  constructor(private prisma: PrismaService) {}

  /**
   * School-wide list of DSGVO async jobs (D-23).
   *
   * Tenant scope: query.schoolId is REQUIRED (DTO @IsUUID + this defensive
   * runtime guard). Role gate: admin only (mirrors audit.service.ts::findAll
   * and consent.service.ts::findAllForAdmin from plan 15-03).
   *
   * Person join: the DsgvoJob model carries a scalar `personId?` but no
   * Prisma navigation relation (the schema deliberately stayed unchanged --
   * adding a relation would introduce a new FK constraint as a migration,
   * which the plan frontmatter explicitly forbids). We therefore perform
   * a two-query merge: page the jobs, then fetch the unique Person rows
   * referenced by that page in a single follow-up query. RETENTION_CLEANUP
   * jobs (personId = null) tolerate `person: null` in the response.
   */
  async findAllForAdmin(
    query: QueryDsgvoJobsDto,
    requestingUser: AuthenticatedUser,
  ) {
    // 1. Role gate (defense-in-depth alongside @CheckPermissions)
    if (!requestingUser.roles.includes('admin')) {
      throw new ForbiddenException(
        'DSGVO job list is admin-only. Per-id status remains available via /dsgvo/export/:id and /dsgvo/deletion/:id.',
      );
    }

    // 2. Tenant scope guard (Pitfall 4 -- never trust where: { schoolId: undefined })
    if (!query.schoolId) {
      throw new BadRequestException('schoolId is required');
    }

    // 3. Compose where
    const where = {
      schoolId: query.schoolId,
      ...(query.status && { status: query.status }),
      ...(query.jobType && { jobType: query.jobType }),
    };

    // 4. Page jobs + count in parallel
    const [jobs, total] = await Promise.all([
      this.prisma.dsgvoJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.dsgvoJob.count({ where }),
    ]);

    // 5. Hydrate the Person join via a second tenant-scoped query.
    //    Only fetch persons whose ids appear in this page AND that belong to
    //    the same school (defense-in-depth: even if a stale personId
    //    references a different tenant's Person, we will not surface it).
    const personIds = Array.from(
      new Set(
        jobs.map((j) => j.personId).filter((id): id is string => Boolean(id)),
      ),
    );
    const personById = new Map<string, PersonSummary>();
    if (personIds.length > 0) {
      const persons = await this.prisma.person.findMany({
        where: { id: { in: personIds }, schoolId: query.schoolId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      for (const p of persons) {
        personById.set(p.id, p);
      }
    }

    const data = jobs.map((j) => ({
      ...j,
      person: j.personId ? (personById.get(j.personId) ?? null) : null,
    }));

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
