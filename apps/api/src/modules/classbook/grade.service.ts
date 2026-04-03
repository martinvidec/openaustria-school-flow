import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateGradeEntryDto, UpdateGradeEntryDto, UpdateGradeWeightDto, GradeMatrixQueryDto } from './dto/grade.dto';
import { calculateWeightedAverage, formatGradeDisplay, isValidGradeValue } from './grade-average.util';
import type { GradeCategory, GradeEntryDto, GradeMatrixRow, GradeWeightDto, WeightConfig } from '@schoolflow/shared';

/** Hardcoded default weights when no school or classSubject override exists (D-06) */
const DEFAULT_WEIGHTS: WeightConfig = {
  schularbeitPct: 40,
  muendlichPct: 30,
  mitarbeitPct: 30,
};

@Injectable()
export class GradeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a grade entry with Austrian Notensystem validation (D-05).
   * Value must be one of the valid decimal grades (0.75 - 5.25).
   */
  async createGrade(schoolId: string, teacherId: string, dto: CreateGradeEntryDto): Promise<GradeEntryDto> {
    if (!isValidGradeValue(dto.value)) {
      throw new BadRequestException(
        `Ungueltiger Notenwert: ${dto.value}. Gueltige Werte: 0.75 (1+) bis 5.25 (5-)`,
      );
    }

    const entry = await this.prisma.gradeEntry.create({
      data: {
        schoolId,
        classSubjectId: dto.classSubjectId,
        studentId: dto.studentId,
        teacherId,
        category: dto.category,
        value: dto.value,
        description: dto.description ?? null,
        date: new Date(dto.date),
      },
    });

    // Resolve student name
    const studentName = await this.resolveStudentName(entry.studentId);

    return {
      id: entry.id,
      schoolId: entry.schoolId,
      classSubjectId: entry.classSubjectId,
      studentId: entry.studentId,
      studentName,
      teacherId: entry.teacherId,
      category: entry.category as GradeCategory,
      value: entry.value,
      displayValue: formatGradeDisplay(entry.value),
      description: entry.description,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
    };
  }

  /**
   * Update a grade entry. Validates value if provided.
   */
  async updateGrade(gradeId: string, dto: UpdateGradeEntryDto): Promise<GradeEntryDto> {
    const existing = await this.prisma.gradeEntry.findUnique({ where: { id: gradeId } });
    if (!existing) {
      throw new NotFoundException('Noteneintrag nicht gefunden');
    }

    if (dto.value !== undefined && !isValidGradeValue(dto.value)) {
      throw new BadRequestException(
        `Ungueltiger Notenwert: ${dto.value}. Gueltige Werte: 0.75 (1+) bis 5.25 (5-)`,
      );
    }

    const updated = await this.prisma.gradeEntry.update({
      where: { id: gradeId },
      data: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
      },
    });

    const studentName = await this.resolveStudentName(updated.studentId);

    return {
      id: updated.id,
      schoolId: updated.schoolId,
      classSubjectId: updated.classSubjectId,
      studentId: updated.studentId,
      studentName,
      teacherId: updated.teacherId,
      category: updated.category as GradeCategory,
      value: updated.value,
      displayValue: formatGradeDisplay(updated.value),
      description: updated.description,
      date: updated.date.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Delete a grade entry.
   */
  async deleteGrade(gradeId: string): Promise<void> {
    const existing = await this.prisma.gradeEntry.findUnique({ where: { id: gradeId } });
    if (!existing) {
      throw new NotFoundException('Noteneintrag nicht gefunden');
    }
    await this.prisma.gradeEntry.delete({ where: { id: gradeId } });
  }

  /**
   * Build the grade matrix for a classSubject (D-07).
   * Students as rows, grade entries as columns (chronological), weighted average at end.
   */
  async getGradeMatrix(
    schoolId: string,
    classSubjectId: string,
    query: GradeMatrixQueryDto,
  ): Promise<{ rows: GradeMatrixRow[]; weights: GradeWeightDto }> {
    // Step 1: Fetch the ClassSubject to get the classId
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });
    if (!classSubject) {
      throw new NotFoundException('Klasse/Fach-Zuordnung nicht gefunden');
    }

    // Step 2: Fetch all students in the class
    const students = await this.prisma.student.findMany({
      where: { classId: classSubject.classId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    // Step 3: Fetch all GradeEntry records for this classSubjectId
    const gradeWhere: Record<string, unknown> = { classSubjectId };
    if (query.category) {
      gradeWhere.category = query.category;
    }

    const gradeEntries = await this.prisma.gradeEntry.findMany({
      where: gradeWhere,
      orderBy: { date: 'asc' },
    });

    // Step 4: Resolve grade weights
    const weights = await this.resolveWeights(schoolId, classSubjectId);

    // Step 5: Group grades by studentId and build matrix rows
    const gradesByStudent = new Map<string, typeof gradeEntries>();
    for (const entry of gradeEntries) {
      const existing = gradesByStudent.get(entry.studentId) ?? [];
      existing.push(entry);
      gradesByStudent.set(entry.studentId, existing);
    }

    const rows: GradeMatrixRow[] = students.map((student) => {
      const studentGrades = gradesByStudent.get(student.id) ?? [];
      const studentName = `${student.person.firstName} ${student.person.lastName}`;

      const gradesDtos: GradeEntryDto[] = studentGrades.map((g) => ({
        id: g.id,
        schoolId: g.schoolId,
        classSubjectId: g.classSubjectId,
        studentId: g.studentId,
        studentName,
        teacherId: g.teacherId,
        category: g.category as GradeCategory,
        value: g.value,
        displayValue: formatGradeDisplay(g.value),
        description: g.description,
        date: g.date.toISOString(),
        createdAt: g.createdAt.toISOString(),
      }));

      // Calculate weighted average using the utility
      const gradesForAvg = studentGrades.map((g) => ({
        value: g.value,
        category: g.category as GradeCategory,
      }));
      const weightConfig: WeightConfig = {
        schularbeitPct: weights.schularbeitPct,
        muendlichPct: weights.muendlichPct,
        mitarbeitPct: weights.mitarbeitPct,
      };
      const weightedAverage = calculateWeightedAverage(gradesForAvg, weightConfig);

      return {
        studentId: student.id,
        studentName,
        grades: gradesDtos,
        weightedAverage,
      };
    });

    // Step 6: Sort rows
    const sortBy = query.sortBy ?? 'name';
    if (sortBy === 'average') {
      rows.sort((a, b) => {
        // Null averages go to end
        if (a.weightedAverage === null && b.weightedAverage === null) return 0;
        if (a.weightedAverage === null) return 1;
        if (b.weightedAverage === null) return -1;
        return a.weightedAverage - b.weightedAverage;
      });
    } else {
      // Sort by name (lastName, firstName)
      rows.sort((a, b) => {
        const [aFirst, ...aLastParts] = a.studentName.split(' ');
        const aLast = aLastParts.join(' ');
        const [bFirst, ...bLastParts] = b.studentName.split(' ');
        const bLast = bLastParts.join(' ');
        const lastNameCmp = aLast.localeCompare(bLast, 'de');
        return lastNameCmp !== 0 ? lastNameCmp : aFirst.localeCompare(bFirst, 'de');
      });
    }

    return { rows, weights };
  }

  /**
   * Weight hierarchy resolution (D-06, Pitfall 4):
   * 1. Try classSubject-specific override
   * 2. Try school default (classSubjectId = null)
   * 3. Fall back to hardcoded defaults (40/30/30)
   */
  async resolveWeights(schoolId: string, classSubjectId: string): Promise<GradeWeightDto> {
    // Try classSubject-specific override
    const subjectWeight = await this.prisma.gradeWeight.findUnique({
      where: {
        schoolId_classSubjectId: {
          schoolId,
          classSubjectId,
        },
      },
    });
    if (subjectWeight) {
      return this.mapWeightDto(subjectWeight);
    }

    // Try school default (classSubjectId = null)
    const schoolDefault = await this.prisma.gradeWeight.findFirst({
      where: { schoolId, classSubjectId: null },
    });
    if (schoolDefault) {
      return this.mapWeightDto(schoolDefault);
    }

    // Hardcoded defaults
    return {
      id: 'default',
      schoolId,
      classSubjectId: null,
      ...DEFAULT_WEIGHTS,
    };
  }

  /**
   * Update grade weights for a classSubject (D-06).
   * Validates that percentages sum to 100.
   */
  async updateWeights(
    schoolId: string,
    classSubjectId: string,
    dto: UpdateGradeWeightDto,
  ): Promise<GradeWeightDto> {
    const sum = dto.schularbeitPct + dto.muendlichPct + dto.mitarbeitPct;
    if (Math.round(sum) !== 100) {
      throw new BadRequestException(
        `Gewichtungen muessen in Summe 100% ergeben (aktuell: ${sum}%)`,
      );
    }

    const weight = await this.prisma.gradeWeight.upsert({
      where: {
        schoolId_classSubjectId: {
          schoolId,
          classSubjectId,
        },
      },
      update: {
        schularbeitPct: dto.schularbeitPct,
        muendlichPct: dto.muendlichPct,
        mitarbeitPct: dto.mitarbeitPct,
      },
      create: {
        schoolId,
        classSubjectId,
        schularbeitPct: dto.schularbeitPct,
        muendlichPct: dto.muendlichPct,
        mitarbeitPct: dto.mitarbeitPct,
      },
    });

    return this.mapWeightDto(weight);
  }

  /** Map a Prisma GradeWeight record to GradeWeightDto */
  private mapWeightDto(record: {
    id: string;
    schoolId: string;
    classSubjectId: string | null;
    schularbeitPct: number;
    muendlichPct: number;
    mitarbeitPct: number;
  }): GradeWeightDto {
    return {
      id: record.id,
      schoolId: record.schoolId,
      classSubjectId: record.classSubjectId,
      schularbeitPct: record.schularbeitPct,
      muendlichPct: record.muendlichPct,
      mitarbeitPct: record.mitarbeitPct,
    };
  }

  /** Resolve student name from student ID */
  private async resolveStudentName(studentId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    return student ? `${student.person.firstName} ${student.person.lastName}` : 'Unbekannt';
  }
}
