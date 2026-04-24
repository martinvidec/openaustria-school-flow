import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreatePermissionOverrideDto } from './dto/create-permission-override.dto';
import { UpdatePermissionOverrideDto } from './dto/update-permission-override.dto';

/**
 * Phase 13-01 USER-03 — PermissionOverride CRUD.
 *
 * Per-user grant/deny rows that the CASL evaluator layers ON TOP of role
 * permissions (override layer). Each row carries a required `reason`
 * string and a `grantedBy` Keycloak user-id (the actor who created the
 * override) — together they form the audit trail that satisfies T-13-04
 * (admin claims they didn't change a permission).
 *
 * The `(userId, action, subject)` unique constraint surfaces as RFC 9457
 * 409 `schoolflow://errors/override-duplicate` when admins try to add a
 * second override of the same triple — the UI should suggest editing the
 * existing one instead.
 */
@Injectable()
export class PermissionOverrideService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionOverrideDto, grantedByUserId: string) {
    try {
      return await this.prisma.permissionOverride.create({
        data: {
          ...dto,
          grantedBy: grantedByUserId,
        } as any,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({
          type: 'schoolflow://errors/override-duplicate',
          title: 'Override existiert bereits',
          detail:
            'Für diese Kombination aus Benutzer, Aktion und Subjekt existiert bereits ein Override. Bearbeiten Sie das bestehende statt ein neues anzulegen.',
        });
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdatePermissionOverrideDto) {
    const existing = await this.prisma.permissionOverride.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        'Permission-Override nicht gefunden.',
      );
    }
    return this.prisma.permissionOverride.update({
      where: { id },
      data: dto as any,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.permissionOverride.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Permission-Override nicht gefunden.');
    }
    return this.prisma.permissionOverride.delete({ where: { id } });
  }

  async findAllForUser(userId: string) {
    return this.prisma.permissionOverride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
