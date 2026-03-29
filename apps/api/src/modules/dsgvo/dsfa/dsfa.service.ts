import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';
import { CreateDsfaEntryDto } from './dto/create-dsfa-entry.dto';
import { CreateVvzEntryDto } from './dto/create-vvz-entry.dto';

@Injectable()
export class DsfaService {
  constructor(private prisma: PrismaService) {}

  // --- DSFA CRUD ---

  async createDsfaEntry(dto: CreateDsfaEntryDto) {
    return this.prisma.dsfaEntry.create({
      data: {
        schoolId: dto.schoolId,
        title: dto.title,
        description: dto.description,
        dataCategories: dto.dataCategories,
        riskAssessment: dto.riskAssessment,
        mitigationMeasures: dto.mitigationMeasures,
      },
    });
  }

  async findDsfaEntries(schoolId: string) {
    return this.prisma.dsfaEntry.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDsfaEntry(id: string, dto: Partial<CreateDsfaEntryDto>) {
    const existing = await this.prisma.dsfaEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`DsfaEntry with ID ${id} was not found.`);
    }

    return this.prisma.dsfaEntry.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dataCategories: dto.dataCategories,
        riskAssessment: dto.riskAssessment,
        mitigationMeasures: dto.mitigationMeasures,
      },
    });
  }

  async removeDsfaEntry(id: string) {
    const existing = await this.prisma.dsfaEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`DsfaEntry with ID ${id} was not found.`);
    }

    return this.prisma.dsfaEntry.delete({ where: { id } });
  }

  // --- VVZ CRUD ---

  async createVvzEntry(dto: CreateVvzEntryDto) {
    return this.prisma.vvzEntry.create({
      data: {
        schoolId: dto.schoolId,
        activityName: dto.activityName,
        purpose: dto.purpose,
        legalBasis: dto.legalBasis,
        dataCategories: dto.dataCategories,
        affectedPersons: dto.affectedPersons,
        retentionPeriod: dto.retentionPeriod,
        technicalMeasures: dto.technicalMeasures,
        organizationalMeasures: dto.organizationalMeasures,
      },
    });
  }

  async findVvzEntries(schoolId: string) {
    return this.prisma.vvzEntry.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateVvzEntry(id: string, dto: Partial<CreateVvzEntryDto>) {
    const existing = await this.prisma.vvzEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`VvzEntry with ID ${id} was not found.`);
    }

    return this.prisma.vvzEntry.update({
      where: { id },
      data: {
        activityName: dto.activityName,
        purpose: dto.purpose,
        legalBasis: dto.legalBasis,
        dataCategories: dto.dataCategories,
        affectedPersons: dto.affectedPersons,
        retentionPeriod: dto.retentionPeriod,
        technicalMeasures: dto.technicalMeasures,
        organizationalMeasures: dto.organizationalMeasures,
      },
    });
  }

  async removeVvzEntry(id: string) {
    const existing = await this.prisma.vvzEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`VvzEntry with ID ${id} was not found.`);
    }

    return this.prisma.vvzEntry.delete({ where: { id } });
  }

  // --- Export ---

  async exportDsfaJson(schoolId: string) {
    const entries = await this.findDsfaEntries(schoolId);
    return {
      type: 'dsfa',
      schoolId,
      exportedAt: new Date().toISOString(),
      entries,
    };
  }

  async exportVvzJson(schoolId: string) {
    const entries = await this.findVvzEntries(schoolId);
    return {
      type: 'vvz',
      schoolId,
      exportedAt: new Date().toISOString(),
      entries,
    };
  }

  async exportCombinedJson(schoolId: string) {
    const [school, dsfaEntries, vvzEntries] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, schoolType: true },
      }),
      this.findDsfaEntries(schoolId),
      this.findVvzEntries(schoolId),
    ]);

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} was not found.`);
    }

    return {
      type: 'dsgvo-combined',
      school: {
        id: school.id,
        name: school.name,
        schoolType: school.schoolType,
      },
      exportedAt: new Date().toISOString(),
      dsfa: {
        count: dsfaEntries.length,
        entries: dsfaEntries,
      },
      vvz: {
        count: vvzEntries.length,
        entries: vvzEntries,
      },
    };
  }
}
