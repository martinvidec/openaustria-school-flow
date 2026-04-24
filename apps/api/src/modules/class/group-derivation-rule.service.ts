import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateGroupDerivationRuleDto } from './dto/create-group-derivation-rule.dto';
import { UpdateGroupDerivationRuleDto } from './dto/update-group-derivation-rule.dto';

/**
 * GroupDerivationRuleService — Phase 12-02 D-12.
 * Persists derivation rules per class so the Rule-Builder round-trips to DB
 * rather than stashing rules in request bodies only.
 */
@Injectable()
export class GroupDerivationRuleService {
  constructor(private prisma: PrismaService) {}

  async findByClass(classId: string) {
    return this.prisma.groupDerivationRule.findMany({
      where: { classId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(ruleId: string) {
    const rule = await this.prisma.groupDerivationRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) {
      throw new NotFoundException('Gruppenableitungsregel nicht gefunden');
    }
    return rule;
  }

  async create(classId: string, dto: CreateGroupDerivationRuleDto) {
    return this.prisma.groupDerivationRule.create({
      data: {
        classId,
        groupType: dto.groupType as any,
        groupName: dto.groupName,
        level: dto.level,
        studentIds: (dto.studentIds ?? []) as any,
      },
    });
  }

  async update(ruleId: string, dto: UpdateGroupDerivationRuleDto) {
    const existing = await this.findOne(ruleId);
    return this.prisma.groupDerivationRule.update({
      where: { id: ruleId },
      data: {
        groupType: dto.groupType !== undefined ? (dto.groupType as any) : undefined,
        groupName: dto.groupName,
        level: dto.level,
        studentIds:
          dto.studentIds !== undefined
            ? (dto.studentIds as any)
            : (existing.studentIds as any),
      },
    });
  }

  async remove(ruleId: string) {
    await this.findOne(ruleId);
    await this.prisma.groupDerivationRule.delete({ where: { id: ruleId } });
  }
}
