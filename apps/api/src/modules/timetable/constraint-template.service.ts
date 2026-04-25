import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateConstraintTemplateDto } from './dto/constraint-template.dto';
import { UpdateConstraintTemplateDto } from './dto/constraint-template.dto';

@Injectable()
export class ConstraintTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cross-reference validation for constraint template params (Phase 14 D-13).
   *
   * Verifies that classId/teacherId/subjectId belong to the same school
   * AND that any period values (maxPeriod / latestPeriod / period / periods[])
   * stay within the school's configured TimeGrid maximum.
   *
   * Throws RFC 9457 422 with one of two type URIs:
   *   - schoolflow://errors/cross-reference-missing  (entity not in school)
   *   - schoolflow://errors/period-out-of-range      (period > maxPeriodNumber)
   */
  private async validateCrossReference(
    schoolId: string,
    _templateType: string,
    params: Record<string, any>,
  ): Promise<void> {
    // 1. Compute school's max period number from TimeGrid (no dedicated column)
    const timeGrid = await this.prisma.timeGrid.findUnique({
      where: { schoolId },
      include: { periods: true },
    });
    const maxPeriodNumber = timeGrid?.periods?.length
      ? Math.max(...timeGrid.periods.map((p) => p.periodNumber))
      : 0;

    // 2. Foreign-key membership checks (only validate fields that are present)
    if (params.classId) {
      const cls = await this.prisma.schoolClass.findFirst({
        where: { id: params.classId, schoolId },
        select: { id: true },
      });
      if (!cls) {
        throw new UnprocessableEntityException({
          type: 'schoolflow://errors/cross-reference-missing',
          title: 'Eintrag passt nicht zur Schule',
          status: 422,
          detail: `Klasse ${params.classId} gehört nicht zu dieser Schule.`,
          field: 'classId',
          value: params.classId,
        });
      }
    }
    if (params.subjectId) {
      const subj = await this.prisma.subject.findFirst({
        where: { id: params.subjectId, schoolId },
        select: { id: true },
      });
      if (!subj) {
        throw new UnprocessableEntityException({
          type: 'schoolflow://errors/cross-reference-missing',
          title: 'Eintrag passt nicht zur Schule',
          status: 422,
          detail: `Fach ${params.subjectId} gehört nicht zu dieser Schule.`,
          field: 'subjectId',
          value: params.subjectId,
        });
      }
    }
    if (params.teacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: params.teacherId, schoolId },
        select: { id: true },
      });
      if (!teacher) {
        throw new UnprocessableEntityException({
          type: 'schoolflow://errors/cross-reference-missing',
          title: 'Eintrag passt nicht zur Schule',
          status: 422,
          detail: `Lehrkraft ${params.teacherId} gehört nicht zu dieser Schule.`,
          field: 'teacherId',
          value: params.teacherId,
        });
      }
    }

    // 3. Period-bound checks (only fail if maxPeriodNumber is known)
    if (maxPeriodNumber > 0) {
      const periodFields: Array<{ field: string; value: number | undefined }> = [
        { field: 'maxPeriod', value: params.maxPeriod },
        { field: 'latestPeriod', value: params.latestPeriod },
        { field: 'period', value: params.period },
      ];
      for (const { field, value } of periodFields) {
        if (typeof value === 'number' && value > maxPeriodNumber) {
          throw new UnprocessableEntityException({
            type: 'schoolflow://errors/period-out-of-range',
            title: 'Periode außerhalb des Zeitrasters',
            status: 422,
            detail: `${field}=${value} überschreitet das Schul-Maximum (${maxPeriodNumber}).`,
            field,
            value,
            maxPeriodNumber,
          });
        }
      }

      // 4. BLOCK_TIMESLOT periods[] array
      if (Array.isArray(params.periods)) {
        const overflow = params.periods.find((p: number) => p > maxPeriodNumber);
        if (overflow !== undefined) {
          throw new UnprocessableEntityException({
            type: 'schoolflow://errors/period-out-of-range',
            title: 'Periode außerhalb des Zeitrasters',
            status: 422,
            detail: `Periode ${overflow} überschreitet das Schul-Maximum (${maxPeriodNumber}).`,
            field: 'periods',
            value: overflow,
            maxPeriodNumber,
          });
        }
      }
    }
  }

  /**
   * Create a new constraint template for a school.
   * Phase 14 D-13: validates cross-references BEFORE the prisma write.
   */
  async create(schoolId: string, dto: CreateConstraintTemplateDto) {
    await this.validateCrossReference(
      schoolId,
      dto.templateType,
      dto.params as Record<string, any>,
    );
    return this.prisma.constraintTemplate.create({
      data: {
        schoolId,
        templateType: dto.templateType,
        params: dto.params as any,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * List all constraint templates for a school, ordered by creation date (newest first).
   */
  async findAll(schoolId: string) {
    return this.prisma.constraintTemplate.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single constraint template by ID.
   * Throws NotFoundException if not found.
   */
  async findOne(id: string) {
    const template = await this.prisma.constraintTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Die angeforderte Ressource wurde nicht gefunden.');
    }
    return template;
  }

  /**
   * Update a constraint template's params and/or active status.
   * templateType cannot be changed after creation.
   * Phase 14 D-13: validates cross-references when params are changed.
   */
  async update(id: string, dto: UpdateConstraintTemplateDto) {
    const existing = await this.findOne(id); // 404 guard
    if (dto.params !== undefined) {
      await this.validateCrossReference(
        existing.schoolId,
        existing.templateType,
        dto.params as Record<string, any>,
      );
    }
    return this.prisma.constraintTemplate.update({
      where: { id },
      data: {
        ...(dto.params !== undefined && { params: dto.params as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Phase 14 D-11/UI-SPEC §Restriction CRUD §7 — focused isActive-only update.
   * Used by PATCH /:id/active for inline toggle UI; produces a distinct audit
   * action vs the broader PUT update.
   */
  async setActive(id: string, isActive: boolean) {
    await this.findOne(id); // 404 guard
    return this.prisma.constraintTemplate.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Delete a constraint template.
   */
  async remove(id: string) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.constraintTemplate.delete({ where: { id } });
  }

  /**
   * Find all active constraint templates for a school.
   * Used by solver input aggregation to include only active templates in solve requests.
   */
  async findActive(schoolId: string) {
    return this.prisma.constraintTemplate.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
