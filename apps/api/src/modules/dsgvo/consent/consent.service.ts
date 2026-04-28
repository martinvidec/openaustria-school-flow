import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { WithdrawConsentDto } from './dto/withdraw-consent.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async grant(dto: CreateConsentDto) {
    const existing = await this.prisma.consentRecord.findUnique({
      where: {
        personId_purpose: {
          personId: dto.personId,
          purpose: dto.purpose as any,
        },
      },
    });

    if (existing && existing.granted && !existing.withdrawnAt) {
      throw new ConflictException(
        `Consent for ${dto.purpose} has already been granted by this person. Use PUT to update.`,
      );
    }

    if (existing) {
      // Re-grant after withdrawal
      return this.prisma.consentRecord.update({
        where: { id: existing.id },
        data: {
          granted: true,
          grantedAt: new Date(),
          withdrawnAt: null,
          version: existing.version + 1,
          legalBasis: dto.legalBasis ?? existing.legalBasis,
        },
      });
    }

    return this.prisma.consentRecord.create({
      data: {
        personId: dto.personId,
        purpose: dto.purpose as any,
        granted: dto.granted,
        version: dto.version ?? 1,
        grantedAt: new Date(),
        legalBasis: dto.legalBasis,
      },
    });
  }

  async withdraw(dto: WithdrawConsentDto) {
    const existing = await this.prisma.consentRecord.findUnique({
      where: {
        personId_purpose: {
          personId: dto.personId,
          purpose: dto.purpose as any,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `No consent record found for person ${dto.personId} and purpose ${dto.purpose}.`,
      );
    }

    return this.prisma.consentRecord.update({
      where: { id: existing.id },
      data: {
        granted: false,
        withdrawnAt: new Date(),
      },
    });
  }

  async findByPerson(personId: string) {
    return this.prisma.consentRecord.findMany({
      where: { personId },
      orderBy: { purpose: 'asc' },
    });
  }

  async findBySchool(schoolId: string, pagination: PaginationQueryDto) {
    const where = {
      person: { schoolId },
    };

    const [data, total] = await Promise.all([
      this.prisma.consentRecord.findMany({
        where,
        include: { person: { select: { firstName: true, lastName: true } } },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' as const },
      }),
      this.prisma.consentRecord.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async hasConsent(personId: string, purpose: string): Promise<boolean> {
    const record = await this.prisma.consentRecord.findUnique({
      where: {
        personId_purpose: {
          personId,
          purpose: purpose as any,
        },
      },
    });

    return !!record && record.granted && !record.withdrawnAt;
  }

  /**
   * findAllForAdmin: admin-only filtered list of consent records for a school
   * (DSGVO-ADM-01).
   *
   * Tenant isolation: REQUIRED `schoolId`, scoped via `person.schoolId` join. The
   * `personSearch` branch keeps the schoolId constraint INSIDE the merged person
   * filter so Prisma cannot drop it via top-level key overwrite (RESEARCH §8 +
   * MEMORY useTeachers / subject / useClasses regression family).
   *
   * Role gate: throws ForbiddenException unless the requesting user has the 'admin'
   * role. Mirrors AuditService.findAll role-scoped visibility (audit.service.ts:56-108).
   */
  async findAllForAdmin(
    query: {
      schoolId: string;
      purpose?: string;
      status?: 'granted' | 'withdrawn' | 'expired';
      personSearch?: string;
      page: number;
      limit: number;
      skip: number;
    },
    requestingUser: { id: string; roles: string[] },
  ) {
    // 1. Role gate — admin only (DSGVO-ADM-01 chunked-mode brief)
    if (!requestingUser.roles.includes('admin')) {
      throw new ForbiddenException('Zugriff verweigert. Admin-Rolle erforderlich.');
    }

    // 2. Defensive tenant guard — DTO `@IsUUID()` should already block this, but the
    //    MEMORY regression family (useTeachers / subject / useClasses) shows that
    //    `where: { schoolId: undefined }` silently returns all rows. Belt-and-braces.
    if (!query.schoolId) {
      throw new BadRequestException('schoolId ist erforderlich');
    }

    // 3. Compose the where clause. The `person` filter is built once so the
    //    personSearch branch can MERGE into it without losing the schoolId scope.
    const personFilter: any = { schoolId: query.schoolId };
    if (query.personSearch) {
      personFilter.OR = [
        { firstName: { contains: query.personSearch, mode: 'insensitive' } },
        { lastName: { contains: query.personSearch, mode: 'insensitive' } },
        { email: { contains: query.personSearch, mode: 'insensitive' } },
      ];
    }

    const where: any = { person: personFilter };
    if (query.purpose) {
      where.purpose = query.purpose as any;
    }
    if (query.status === 'granted') {
      where.granted = true;
      where.withdrawnAt = null;
    } else if (query.status === 'withdrawn') {
      where.withdrawnAt = { not: null };
    } else if (query.status === 'expired') {
      where.granted = false;
      where.withdrawnAt = null;
    }

    const [data, total] = await Promise.all([
      this.prisma.consentRecord.findMany({
        where,
        include: {
          person: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' as const },
      }),
      this.prisma.consentRecord.count({ where }),
    ]);

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
