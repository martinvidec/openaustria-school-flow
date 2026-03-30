import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateConstraintTemplateDto } from './dto/constraint-template.dto';
import { UpdateConstraintTemplateDto } from './dto/constraint-template.dto';

@Injectable()
export class ConstraintTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new constraint template for a school.
   */
  async create(schoolId: string, dto: CreateConstraintTemplateDto) {
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
   */
  async update(id: string, dto: UpdateConstraintTemplateDto) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.constraintTemplate.update({
      where: { id },
      data: {
        ...(dto.params !== undefined && { params: dto.params as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
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
