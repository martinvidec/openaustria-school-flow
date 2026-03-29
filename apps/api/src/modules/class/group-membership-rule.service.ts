import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';

export interface GroupAutoAssignRule {
  groupType: 'RELIGION' | 'LEISTUNG' | 'LANGUAGE';
  groupName: string;
  level?: string;
  studentFilter?: {
    studentIds?: string[];
  };
}

export interface ApplyRulesResult {
  groupsCreated: number;
  membershipsCreated: number;
}

@Injectable()
export class GroupMembershipRuleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Apply auto-derivation rules to create groups and assign students.
   * Only creates memberships with isAutoAssigned=true.
   * Preserves existing manual (isAutoAssigned=false) assignments.
   */
  async applyRules(classId: string, rules: GroupAutoAssignRule[]): Promise<ApplyRulesResult> {
    let groupsCreated = 0;
    let membershipsCreated = 0;

    for (const rule of rules) {
      // Find or create the group
      let group = await this.prisma.group.findFirst({
        where: {
          classId,
          name: rule.groupName,
          groupType: rule.groupType as any,
        },
      });

      if (!group) {
        group = await this.prisma.group.create({
          data: {
            classId,
            name: rule.groupName,
            groupType: rule.groupType as any,
            level: rule.level,
          },
        });
        groupsCreated++;
      }

      // Determine which students to assign
      const studentIds = rule.studentFilter?.studentIds ?? [];

      for (const studentId of studentIds) {
        // Check if membership already exists (manual or auto)
        const existing = await this.prisma.groupMembership.findUnique({
          where: {
            groupId_studentId: {
              groupId: group.id,
              studentId,
            },
          },
        });

        if (existing) {
          // Preserve existing assignment (manual or auto) -- do not overwrite
          continue;
        }

        // Create auto-assigned membership
        await this.prisma.groupMembership.create({
          data: {
            groupId: group.id,
            studentId,
            isAutoAssigned: true,
          },
        });
        membershipsCreated++;
      }
    }

    return { groupsCreated, membershipsCreated };
  }

  /**
   * Remove all auto-assigned memberships for groups in this class.
   * Does NOT touch manual (isAutoAssigned=false) assignments.
   */
  async clearAutoAssignments(classId: string): Promise<{ count: number }> {
    // Find all groups in this class
    const groups = await this.prisma.group.findMany({
      where: { classId },
      select: { id: true },
    });

    const groupIds = groups.map((g: { id: string }) => g.id);

    if (groupIds.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.groupMembership.deleteMany({
      where: {
        groupId: { in: groupIds },
        isAutoAssigned: true,
      },
    });

    return { count: result.count };
  }
}
