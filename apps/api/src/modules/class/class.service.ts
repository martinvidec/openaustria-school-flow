import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    // Check unique constraint: schoolId + name + schoolYearId
    const existing = await this.prisma.schoolClass.findUnique({
      where: {
        schoolId_name_schoolYearId: {
          schoolId: dto.schoolId,
          name: dto.name,
          schoolYearId: dto.schoolYearId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Klasse ${dto.name} existiert bereits fuer dieses Schuljahr.`,
      );
    }

    return this.prisma.schoolClass.create({
      data: {
        schoolId: dto.schoolId,
        name: dto.name,
        yearLevel: dto.yearLevel,
        schoolYearId: dto.schoolYearId,
      },
      include: {
        _count: { select: { students: true } },
        groups: true,
      },
    });
  }

  async findAll(schoolId: string, pagination: PaginationQueryDto): Promise<PaginatedResponseDto<any>> {
    const [data, total] = await Promise.all([
      this.prisma.schoolClass.findMany({
        where: { schoolId },
        include: {
          _count: { select: { students: true } },
          groups: true,
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.schoolClass.count({ where: { schoolId } }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: string) {
    const schoolClass = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        students: {
          include: { person: true },
        },
        groups: {
          include: {
            memberships: {
              include: {
                student: { include: { person: true } },
              },
            },
          },
        },
        classSubjects: {
          include: { subject: true },
        },
      },
    });

    if (!schoolClass) {
      throw new NotFoundException('Die angeforderte Klasse wurde nicht gefunden.');
    }

    return schoolClass;
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.findOne(id); // Throws 404 if not found
    return this.prisma.schoolClass.update({
      where: { id },
      data: {
        name: dto.name,
        yearLevel: dto.yearLevel,
      },
      include: {
        _count: { select: { students: true } },
        groups: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws 404 if not found
    // Cascades groups, classSubjects; students get classId=null via SetNull
    await this.prisma.schoolClass.delete({ where: { id } });
  }

  async assignStudent(classId: string, studentId: string) {
    await this.findOne(classId); // Throws 404 if class not found
    return this.prisma.student.update({
      where: { id: studentId },
      data: { classId },
      include: { person: true, schoolClass: true },
    });
  }

  async removeStudent(classId: string, studentId: string) {
    await this.findOne(classId); // Throws 404 if class not found
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.classId !== classId) {
      throw new NotFoundException('Schueler ist nicht in dieser Klasse.');
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data: { classId: null },
      include: { person: true },
    });
  }
}
