import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../config/database/generated/client.js';
import { PrismaService } from '../../../config/database/prisma.service';
import { CreatePermissionOverrideDto } from './dto/create-permission-override.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async createOverride(dto: CreatePermissionOverrideDto, grantedBy: string) {
    const conditions = dto.conditions
      ? (dto.conditions as Prisma.InputJsonValue)
      : Prisma.DbNull;

    return this.prisma.permissionOverride.upsert({
      where: {
        userId_action_subject: {
          userId: dto.userId,
          action: dto.action,
          subject: dto.subject,
        },
      },
      update: {
        conditions,
        granted: dto.granted,
        grantedBy,
      },
      create: {
        userId: dto.userId,
        action: dto.action,
        subject: dto.subject,
        conditions,
        granted: dto.granted,
        grantedBy,
      },
    });
  }

  async getOverridesForUser(userId: string) {
    return this.prisma.permissionOverride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteOverride(id: string) {
    const override = await this.prisma.permissionOverride.findUnique({ where: { id } });
    if (!override) {
      throw new NotFoundException('Die angeforderte Ressource wurde nicht gefunden.');
    }
    return this.prisma.permissionOverride.delete({ where: { id } });
  }

  async getRolesWithPermissions() {
    return this.prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
  }
}
