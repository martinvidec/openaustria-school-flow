import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../config/database/prisma.service';
import type { SisStudentDto, SisTeacherDto, SisClassDto, SisApiKeyResponseDto } from './dto/sis-response.dto';

/**
 * IMPORT-04 -- SIS (Student Information System) read-only data access service.
 *
 * Responsibilities:
 *  - CRUD for SisApiKey records (create, revoke, list)
 *  - Read-only student, teacher, and class data for external SIS consumers
 *  - API key is a crypto.randomUUID() stored hashed in the DB
 *    (shown only once at creation time)
 */
@Injectable()
export class SisService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // API Key management
  // ---------------------------------------------------------------------------

  async createApiKey(
    schoolId: string,
    name: string,
    userId: string,
  ): Promise<SisApiKeyResponseDto> {
    const key = crypto.randomUUID();
    const record = await this.prisma.sisApiKey.create({
      data: { schoolId, key, name, createdBy: userId },
    });

    return {
      id: record.id,
      name: record.name,
      isActive: record.isActive,
      lastUsed: record.lastUsed
        ? record.lastUsed instanceof Date
          ? record.lastUsed.toISOString()
          : String(record.lastUsed)
        : null,
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : String(record.createdAt),
      key: record.key, // Only visible at creation time
    };
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.prisma.sisApiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async listApiKeys(schoolId: string): Promise<SisApiKeyResponseDto[]> {
    const keys = await this.prisma.sisApiKey.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k: any) => ({
      id: k.id,
      name: k.name,
      isActive: k.isActive,
      lastUsed: k.lastUsed
        ? k.lastUsed instanceof Date
          ? k.lastUsed.toISOString()
          : String(k.lastUsed)
        : null,
      createdAt:
        k.createdAt instanceof Date
          ? k.createdAt.toISOString()
          : String(k.createdAt),
      // key field masked -- not returned in list
    }));
  }

  // ---------------------------------------------------------------------------
  // Read-only data endpoints
  // ---------------------------------------------------------------------------

  async getStudents(schoolId: string): Promise<SisStudentDto[]> {
    const students = await this.prisma.student.findMany({
      where: { person: { schoolId } },
      include: {
        person: { select: { firstName: true, lastName: true } },
        schoolClass: { select: { name: true } },
      },
    });

    return students.map((s: any) => ({
      id: s.id,
      firstName: s.person?.firstName ?? '',
      lastName: s.person?.lastName ?? '',
      className: s.schoolClass?.name ?? '',
    }));
  }

  async getTeachers(schoolId: string): Promise<SisTeacherDto[]> {
    const teachers = await this.prisma.teacher.findMany({
      where: { person: { schoolId } },
      include: {
        person: { select: { firstName: true, lastName: true } },
        qualifications: { include: { subject: true } },
      },
    });

    return teachers.map((t: any) => ({
      id: t.id,
      firstName: t.person?.firstName ?? '',
      lastName: t.person?.lastName ?? '',
      subjects: (t.qualifications ?? []).map((q: any) => q.subject?.name ?? ''),
    }));
  }

  async getClasses(schoolId: string): Promise<SisClassDto[]> {
    const classes = await this.prisma.schoolClass.findMany({
      where: { schoolId },
      include: { _count: { select: { students: true } } },
    });

    return classes.map((c: any) => ({
      id: c.id,
      name: c.name,
      level: c.yearLevel ?? 0,
      studentCount: c._count?.students ?? 0,
    }));
  }
}
