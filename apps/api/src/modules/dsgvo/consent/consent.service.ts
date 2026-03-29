import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
}
