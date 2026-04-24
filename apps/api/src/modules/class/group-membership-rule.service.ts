import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';

export interface GroupAutoAssignRule {
  groupType: 'RELIGION' | 'WAHLPFLICHT' | 'LEISTUNG' | 'LANGUAGE' | 'CUSTOM';
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

export interface ApplyRulesPreview {
  newGroups: Array<{ name: string; groupType: string; level?: string }>;
  newMemberships: Array<{ studentId: string; groupName: string }>;
  conflicts: Array<{
    studentId: string;
    groupName: string;
    reason: 'MANUAL_ASSIGNMENT_EXISTS';
  }>;
}

@Injectable()
export class GroupMembershipRuleService {
  constructor(private prisma: PrismaService) {}

  /**
   * Apply auto-derivation rules to create groups and assign students.
   * Only creates memberships with isAutoAssigned=true.
   * Preserves existing manual (isAutoAssigned=false) assignments.
   *
   * Phase 12-02 extension: when `inlineRules` is omitted, loads persisted
   * rules from `GroupDerivationRule` so the UI does not have to ship them
   * in the POST body.
   */
  async applyRules(
    classId: string,
    inlineRules?: GroupAutoAssignRule[],
  ): Promise<ApplyRulesResult> {
    const rules = inlineRules ?? (await this.loadRulesFromDb(classId));
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
   * Dry-run preview of what `applyRules(classId, inlineRules?)` would do
   * without touching the database. Consumed by ApplyRulesPreviewDialog
   * (D-10). Surfaces conflicts where a manual assignment would block the
   * auto-assignment.
   */
  async applyRulesDryRun(
    classId: string,
    inlineRules?: GroupAutoAssignRule[],
  ): Promise<ApplyRulesPreview> {
    const rules = inlineRules ?? (await this.loadRulesFromDb(classId));
    const preview: ApplyRulesPreview = {
      newGroups: [],
      newMemberships: [],
      conflicts: [],
    };

    for (const rule of rules) {
      const existingGroup = await this.prisma.group.findFirst({
        where: {
          classId,
          name: rule.groupName,
          groupType: rule.groupType as any,
        },
      });
      if (!existingGroup) {
        preview.newGroups.push({
          name: rule.groupName,
          groupType: rule.groupType,
          level: rule.level,
        });
      }

      for (const studentId of rule.studentFilter?.studentIds ?? []) {
        if (existingGroup) {
          const existingMembership = await this.prisma.groupMembership.findUnique({
            where: {
              groupId_studentId: { groupId: existingGroup.id, studentId },
            },
          });
          if (existingMembership?.isAutoAssigned === false) {
            preview.conflicts.push({
              studentId,
              groupName: rule.groupName,
              reason: 'MANUAL_ASSIGNMENT_EXISTS',
            });
            continue;
          }
          if (existingMembership) {
            // already auto-assigned — no-op
            continue;
          }
        }
        preview.newMemberships.push({ studentId, groupName: rule.groupName });
      }
    }

    return preview;
  }

  /** Map DB-persisted GroupDerivationRule rows to the in-memory rule shape. */
  async loadRulesFromDb(classId: string): Promise<GroupAutoAssignRule[]> {
    const rules = await this.prisma.groupDerivationRule.findMany({
      where: { classId },
      orderBy: { createdAt: 'asc' },
    });
    return rules.map((r) => ({
      groupType: r.groupType as any,
      groupName: r.groupName,
      level: r.level ?? undefined,
      studentFilter: {
        studentIds: Array.isArray(r.studentIds)
          ? (r.studentIds as string[])
          : [],
      },
    }));
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
