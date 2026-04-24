import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentListQueryDto } from './dto/parent-list-query.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

/**
 * Phase 12-01 ParentModule greenfield (STUDENT-02 / D-13.1).
 *
 * Pre-Phase-12 there was no public Parent HTTP surface — the Parent model
 * existed only as an aggregate anchor for DSGVO consents. Plan 12-01 adds
 * full CRUD + link/unlink semantics so the admin UI can:
 *   - search by email (ParentSearchPopover)
 *   - create inline via the 404 fallback
 *   - delete with Orphan-Guard (409 when ParentStudent rows exist)
 */
@Injectable()
export class ParentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateParentDto) {
    return this.prisma.person.create({
      data: {
        schoolId: dto.schoolId,
        personType: 'PARENT',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        parent: { create: { schoolId: dto.schoolId } },
      },
      include: { parent: true },
    });
  }

  async findAll(query: ParentListQueryDto): Promise<PaginatedResponseDto<any>> {
    const { schoolId, email, name } = query;
    if (!schoolId) {
      throw new NotFoundException('schoolId query parameter is required');
    }

    const personWhere: any = {};
    if (email) {
      personWhere.email = { contains: email, mode: 'insensitive' };
    }
    if (name) {
      personWhere.OR = [
        { firstName: { contains: name, mode: 'insensitive' } },
        { lastName: { contains: name, mode: 'insensitive' } },
      ];
    }

    const where: any = { schoolId };
    if (Object.keys(personWhere).length > 0) {
      where.person = personWhere;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = typeof query.skip === 'number' ? query.skip : (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.parent.findMany({
        where,
        include: { person: true, _count: { select: { children: true } } },
        skip,
        take: limit,
        orderBy: { person: { lastName: 'asc' } },
      }),
      this.prisma.parent.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      include: {
        person: true,
        children: { include: { student: { include: { person: true } } } },
      },
    });
    if (!parent) {
      throw new NotFoundException('Der angeforderte Erziehungsberechtigte wurde nicht gefunden.');
    }
    return parent;
  }

  async update(id: string, dto: UpdateParentDto) {
    const parent = await this.findOne(id);
    const personData: Record<string, unknown> = {};
    (['firstName', 'lastName', 'email', 'phone'] as const).forEach((k) => {
      if (dto[k] !== undefined) personData[k] = dto[k];
    });
    if (Object.keys(personData).length > 0) {
      await this.prisma.person.update({
        where: { id: parent.personId },
        data: personData,
      });
    }
    return this.findOne(id);
  }

  /**
   * Orphan-Guard: refuse to delete when ParentStudent rows still link this
   * parent to any student. Surfaces RFC 9457 problem+json 409 with
   * `extensions.affectedEntities.linkedStudents` so the UI can show the
   * blocked state.
   */
  async remove(id: string) {
    const parent = await this.findOne(id);
    const linkedStudents = await this.prisma.parentStudent.count({
      where: { parentId: id },
    });
    if (linkedStudents > 0) {
      throw new ConflictException({
        type: 'https://schoolflow.dev/errors/parent-has-dependents',
        title: 'Erziehungsberechtigte:r kann nicht gelöscht werden',
        status: 409,
        detail: 'Es bestehen noch Verknüpfungen zu Schüler:innen. Lösen Sie diese zuerst.',
        extensions: { affectedEntities: { linkedStudents } },
      });
    }
    await this.prisma.person.delete({ where: { id: parent.personId } });
  }
}
