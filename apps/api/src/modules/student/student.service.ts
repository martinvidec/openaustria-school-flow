import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    return this.prisma.person.create({
      data: {
        schoolId: dto.schoolId,
        personType: 'STUDENT',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth,
        socialSecurityNumber: dto.socialSecurityNumber,
        student: {
          create: {
            schoolId: dto.schoolId,
            classId: dto.classId,
            studentNumber: dto.studentNumber,
            enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : null,
          },
        },
      },
      include: {
        student: {
          include: {
            schoolClass: true,
          },
        },
      },
    });
  }

  async findAll(schoolId: string, pagination: PaginationQueryDto): Promise<PaginatedResponseDto<any>> {
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where: { schoolId },
        include: {
          person: true,
          schoolClass: true,
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { person: { lastName: 'asc' } },
      }),
      this.prisma.student.count({ where: { schoolId } }),
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

  async findByClass(classId: string, pagination: PaginationQueryDto): Promise<PaginatedResponseDto<any>> {
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId },
        include: {
          person: true,
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { person: { lastName: 'asc' } },
      }),
      this.prisma.student.count({ where: { classId } }),
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
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        person: true,
        schoolClass: true,
        groupMemberships: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Der angeforderte Schueler wurde nicht gefunden.');
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.findOne(id);

    // Update person fields
    const personData: Record<string, any> = {};
    if (dto.firstName !== undefined) personData.firstName = dto.firstName;
    if (dto.lastName !== undefined) personData.lastName = dto.lastName;
    if (dto.email !== undefined) personData.email = dto.email;
    if (dto.phone !== undefined) personData.phone = dto.phone;
    if (dto.address !== undefined) personData.address = dto.address;
    if (dto.dateOfBirth !== undefined) personData.dateOfBirth = dto.dateOfBirth;
    if (dto.socialSecurityNumber !== undefined) personData.socialSecurityNumber = dto.socialSecurityNumber;

    // Update student fields
    const studentData: Record<string, any> = {};
    if (dto.classId !== undefined) studentData.classId = dto.classId;
    if (dto.studentNumber !== undefined) studentData.studentNumber = dto.studentNumber;
    if (dto.enrollmentDate !== undefined) {
      studentData.enrollmentDate = dto.enrollmentDate ? new Date(dto.enrollmentDate) : null;
    }

    // Update person if there are person fields to update
    if (Object.keys(personData).length > 0) {
      await this.prisma.person.update({
        where: { id: existing.personId },
        data: personData,
      });
    }

    // Update student if there are student fields to update
    if (Object.keys(studentData).length > 0) {
      await this.prisma.student.update({
        where: { id },
        data: studentData,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const student = await this.findOne(id);
    // Deleting person cascades to student (onDelete: Cascade)
    await this.prisma.person.delete({ where: { id: student.personId } });
  }
}
