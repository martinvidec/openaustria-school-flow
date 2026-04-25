import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';
import { ParentService } from '../parent/parent.service';
import { UserDirectoryQueryDto } from './dto/user-directory-query.dto';
import { LinkPersonDto } from './dto/link-person.dto';

/**
 * Phase 13-01 USER-01 / USER-05 — hybrid Keycloak + DB user directory.
 *
 * Design:
 *   - Keycloak owns the identity (sub, email, username, enabled, ...).
 *   - SchoolFlow owns the per-user metadata (UserRole rows, Person link).
 *   - This service is the *only* place those two worlds meet for the
 *     admin UI; both surfaces (list + detail + link/unlink + enabled
 *     toggle) hydrate from KC then layer DB rows on top.
 *
 * Performance: KC search is O(page) on the server. The DB hydration uses
 * `IN` queries scoped to the current page only — no full-table scans.
 *
 * Pagination caveat (RESEARCH Pitfall 5): KC search does not natively
 * support filter-by-role / linked / enabled, so post-filters narrow the
 * page after-the-fact. `meta.totalIsApproximate` flags this for the UI
 * (the count badge gets a "(ca.)" suffix).
 */

export type UserDirectorySummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  enabled: boolean;
  createdTimestamp?: number;
  roles: string[];
  personLink: {
    id: string;
    personType: string;
    firstName: string;
    lastName: string;
  } | null;
};

@Injectable()
export class UserDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kcAdmin: KeycloakAdminService,
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
    private readonly parentService: ParentService,
  ) {}

  async findAll(query: UserDirectoryQueryDto): Promise<{
    data: UserDirectorySummary[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      totalIsApproximate: boolean;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const first = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.kcAdmin.findUsers({ first, max: limit, search: query.search }),
      this.kcAdmin.countUsers({ search: query.search }),
    ]);

    const userIds = users.map((u) => u.id!).filter(Boolean);
    const [userRoles, personLinks] = await Promise.all([
      userIds.length === 0
        ? []
        : this.prisma.userRole.findMany({
            where: { userId: { in: userIds } },
            include: { role: true },
          }),
      userIds.length === 0
        ? []
        : this.prisma.person.findMany({
            where: { keycloakUserId: { in: userIds } },
          }),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const ur of userRoles) {
      const list = rolesByUser.get(ur.userId) ?? [];
      list.push((ur as any).role.name);
      rolesByUser.set(ur.userId, list);
    }
    const personByUser = new Map<string, any>();
    for (const p of personLinks) {
      if (p.keycloakUserId) personByUser.set(p.keycloakUserId, p);
    }

    let merged: UserDirectorySummary[] = users.map((u) => ({
      id: u.id ?? '',
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      username: u.username ?? '',
      enabled: u.enabled ?? true,
      createdTimestamp: u.createdTimestamp,
      roles: rolesByUser.get(u.id ?? '') ?? [],
      personLink: personByUser.has(u.id ?? '')
        ? {
            id: personByUser.get(u.id ?? '').id,
            personType: personByUser.get(u.id ?? '').personType,
            firstName: personByUser.get(u.id ?? '').firstName,
            lastName: personByUser.get(u.id ?? '').lastName,
          }
        : null,
    }));

    let totalIsApproximate = false;
    if (query.role && query.role.length > 0) {
      const wanted = new Set(query.role);
      merged = merged.filter((u) => u.roles.some((r) => wanted.has(r)));
      totalIsApproximate = true;
    }
    if (query.linked === 'linked') {
      merged = merged.filter((u) => u.personLink !== null);
      totalIsApproximate = true;
    } else if (query.linked === 'unlinked') {
      merged = merged.filter((u) => u.personLink === null);
      totalIsApproximate = true;
    }
    if (query.enabled === 'active') {
      merged = merged.filter((u) => u.enabled);
      totalIsApproximate = true;
    } else if (query.enabled === 'disabled') {
      merged = merged.filter((u) => !u.enabled);
      totalIsApproximate = true;
    }

    return {
      data: merged,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        totalIsApproximate,
      },
    };
  }

  async findOne(userId: string) {
    const u = await this.kcAdmin.findUserById(userId);
    if (!u) throw new NotFoundException('Keycloak-Benutzer nicht gefunden.');

    const [userRoles, personLink] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      }),
      this.prisma.person.findUnique({ where: { keycloakUserId: userId } }),
    ]);

    return {
      id: u.id ?? '',
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      username: u.username ?? '',
      enabled: u.enabled ?? true,
      createdTimestamp: u.createdTimestamp,
      roles: userRoles.map((ur: any) => ur.role.name),
      personLink: personLink
        ? {
            id: personLink.id,
            personType: personLink.personType,
            firstName: personLink.firstName,
            lastName: personLink.lastName,
          }
        : null,
    };
  }

  async setEnabled(userId: string, enabled: boolean) {
    const exists = await this.kcAdmin.findUserById(userId);
    if (!exists) throw new NotFoundException('Keycloak-Benutzer nicht gefunden.');
    await this.kcAdmin.setEnabled(userId, enabled);
    return this.findOne(userId);
  }

  /**
   * Phase 13-01 USER-05 / threat T-13-09 silent link-theft prevention:
   *
   * Two-sided pre-check before dispatching to the teacher/student/parent
   * service:
   *
   *   (a) USER-SIDE — does this Keycloak user already have a Person link?
   *       Yes ∧ different personId → 409 person-link-conflict.
   *   (b) PERSON-SIDE — is the target Person already linked to a
   *       different Keycloak user? Yes → 409 person-link-conflict
   *       affectedEntities=[{ kind:'user', id:<priorKcId> }]. WITHOUT
   *       this check, the bare `UPDATE person SET keycloakUserId = <new>`
   *       in TeacherService.linkKeycloakUser would silently steal the
   *       link from the previous user (no P2002 because the new value
   *       <new> is unique — the unique constraint is on the column).
   *
   * Both checks complete BEFORE any service mutation, so a 409 leaves
   * the system in its starting state.
   */
  async linkPerson(userId: string, dto: LinkPersonDto): Promise<{ person: unknown }> {
    // (a) user-side pre-check
    const existing = await this.prisma.person.findUnique({
      where: { keycloakUserId: userId },
    });
    if (existing && existing.id !== dto.personId) {
      throw new ConflictException({
        type: 'schoolflow://errors/person-link-conflict',
        title: 'User ist bereits verknüpft',
        detail:
          'Lösen Sie zuerst die bestehende Verknüpfung, bevor Sie neu verknüpfen.',
        extensions: {
          affectedEntities: [
            {
              kind: `person-${existing.personType.toLowerCase()}`,
              id: existing.id,
              name: `${existing.firstName} ${existing.lastName}`,
            },
          ],
        },
        // top-level affectedEntities for direct test access (the
        // ProblemDetailFilter copies extensions through; keep both for
        // shape simplicity).
        affectedEntities: [
          {
            kind: `person-${existing.personType.toLowerCase()}`,
            id: existing.id,
            name: `${existing.firstName} ${existing.lastName}`,
          },
        ],
      });
    }

    // (b) person-side pre-check (silent link-theft guard).
    //
    // CRITICAL: `dto.personId` is the *domain* id (Teacher.id /
    // Student.id / Parent.id) — NOT the underlying Person.id. Each
    // {teacher,student,parent} row has its own `personId` FK to the
    // Person row that owns `keycloakUserId`. Querying
    // `person.findUnique({ where: { id: dto.personId } })` directly
    // returns null in the common case (a Teacher.id is never a
    // Person.id) and silently skips this guard, re-introducing the
    // link-theft bug the helper exists to prevent (Phase 13-03 USER-05
    // E2E LINK-02 caught the gap).
    let targetPersonId: string | null = null;
    if (dto.personType === 'TEACHER') {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: dto.personId },
        select: { personId: true },
      });
      targetPersonId = teacher?.personId ?? null;
    } else if (dto.personType === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.personId },
        select: { personId: true },
      });
      targetPersonId = student?.personId ?? null;
    } else {
      const parent = await this.prisma.parent.findUnique({
        where: { id: dto.personId },
        select: { personId: true },
      });
      targetPersonId = parent?.personId ?? null;
    }
    const targetPerson = targetPersonId
      ? await this.prisma.person.findUnique({
          where: { id: targetPersonId },
        })
      : null;
    if (
      targetPerson &&
      targetPerson.keycloakUserId &&
      targetPerson.keycloakUserId !== userId
    ) {
      const priorUserId = targetPerson.keycloakUserId;
      const priorKcUser = await this.kcAdmin.findUserById(priorUserId);
      const displayName = priorKcUser
        ? priorKcUser.email ?? priorKcUser.username ?? priorUserId
        : priorUserId;
      throw new ConflictException({
        type: 'schoolflow://errors/person-link-conflict',
        title: 'Person ist bereits verknüpft',
        detail:
          'Die Person ist bereits einem anderen Keycloak-User zugeordnet.',
        extensions: {
          affectedEntities: [
            { kind: 'user', id: priorUserId, displayName },
          ],
        },
        affectedEntities: [
          { kind: 'user', id: priorUserId, displayName },
        ],
      });
    }

    try {
      let updatedPerson;
      if (dto.personType === 'TEACHER') {
        updatedPerson = await this.teacherService.linkKeycloakUser(
          dto.personId,
          userId,
        );
      } else if (dto.personType === 'STUDENT') {
        updatedPerson = await this.studentService.linkKeycloakUser(
          dto.personId,
          userId,
        );
      } else {
        updatedPerson = await this.parentService.linkKeycloakUser(
          dto.personId,
          userId,
        );
      }
      return { person: updatedPerson };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Race-condition fallback: between (b) and the write, someone
        // else linked this Person. Re-fetch to surface the winner.
        const conflict = await this.prisma.person.findUnique({
          where: { id: dto.personId },
        });
        throw new ConflictException({
          type: 'schoolflow://errors/person-link-conflict',
          title: 'Person ist bereits verknüpft',
          detail:
            'Die Person ist bereits einem anderen Keycloak-User zugeordnet.',
          extensions: {
            affectedEntities: [
              {
                kind: 'user',
                id: conflict?.keycloakUserId ?? 'unknown',
                name: conflict
                  ? `${conflict.firstName} ${conflict.lastName}`
                  : undefined,
              },
            ],
          },
          affectedEntities: [
            {
              kind: 'user',
              id: conflict?.keycloakUserId ?? 'unknown',
              name: conflict
                ? `${conflict.firstName} ${conflict.lastName}`
                : undefined,
            },
          ],
        });
      }
      throw e;
    }
  }

  async unlinkPerson(userId: string): Promise<void> {
    const person = await this.prisma.person.findUnique({
      where: { keycloakUserId: userId },
      include: { teacher: true, student: true, parent: true },
    } as any);
    if (!person) return;
    if (person.personType === 'TEACHER' && (person as any).teacher) {
      await this.teacherService.unlinkKeycloakUser((person as any).teacher.id);
    } else if (person.personType === 'STUDENT' && (person as any).student) {
      await this.studentService.unlinkKeycloakUser((person as any).student.id);
    } else if (person.personType === 'PARENT' && (person as any).parent) {
      await this.parentService.unlinkKeycloakUser((person as any).parent.id);
    }
  }
}
