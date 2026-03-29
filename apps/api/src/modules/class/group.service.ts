import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        classId: dto.classId,
        name: dto.name,
        groupType: dto.groupType as any,
        level: dto.level,
        subjectId: dto.subjectId,
      },
      include: {
        memberships: {
          include: {
            student: { include: { person: true } },
          },
        },
      },
    });
  }

  async findByClass(classId: string) {
    return this.prisma.group.findMany({
      where: { classId },
      include: {
        memberships: {
          include: {
            student: { include: { person: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            student: { include: { person: true } },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Die angeforderte Gruppe wurde nicht gefunden.');
    }

    return group;
  }

  async addMember(groupId: string, studentId: string, isAutoAssigned = false) {
    // Check for duplicate
    const existing = await this.prisma.groupMembership.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Schueler ist bereits Mitglied dieser Gruppe.');
    }

    return this.prisma.groupMembership.create({
      data: {
        groupId,
        studentId,
        isAutoAssigned,
      },
      include: {
        student: { include: { person: true } },
        group: true,
      },
    });
  }

  async removeMember(groupId: string, studentId: string) {
    const membership = await this.prisma.groupMembership.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Mitgliedschaft wurde nicht gefunden.');
    }

    return this.prisma.groupMembership.delete({
      where: { id: membership.id },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws 404 if not found
    // Cascades memberships
    return this.prisma.group.delete({ where: { id } });
  }
}
