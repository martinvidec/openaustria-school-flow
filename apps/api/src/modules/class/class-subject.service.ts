import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { StundentafelTemplateService } from '../subject/stundentafel-template.service';
import { UpdateClassSubjectsDto } from './dto/update-class-subjects.dto';

/**
 * ClassSubjectService — Phase 12-02 (CLASS-03, SUBJECT-04).
 *
 * Owns:
 *   - applyStundentafel: initial load of ClassSubject rows from Austrian
 *     Stundentafel template (fails 409 if rows already exist).
 *   - updateClassSubjects: SUBJECT-04 Wochenstunden-Editor replace-all-in-tx
 *     that auto-flips `isCustomized=true` whenever the incoming weeklyHours
 *     diverges from the template default.
 *   - resetStundentafel: destructive WarnDialog confirmation path that
 *     deletes every row then re-applies the template atomically.
 */
@Injectable()
export class ClassSubjectService {
  constructor(
    private prisma: PrismaService,
    private templates: StundentafelTemplateService,
  ) {}

  async findByClass(classId: string) {
    return this.prisma.classSubject.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: { subject: { shortName: 'asc' } },
    });
  }

  async applyStundentafel(classId: string, schoolType: string) {
    const cls = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
    });
    if (!cls) throw new NotFoundException('Klasse nicht gefunden');

    const existing = await this.prisma.classSubject.count({
      where: { classId },
    });
    if (existing > 0) {
      throw new ConflictException({
        type: 'https://schoolflow.dev/errors/stundentafel-exists',
        title: 'Stundentafel bereits vorhanden',
        status: 409,
        detail:
          'Setzen Sie die Stundentafel erst zurück, bevor Sie eine neue Vorlage übernehmen.',
      });
    }

    const template = this.templates.getTemplate(schoolType, cls.yearLevel);
    if (!template) {
      throw new NotFoundException(
        `Keine Stundentafel-Vorlage für Schultyp ${schoolType}, Jahrgangsstufe ${cls.yearLevel}.`,
      );
    }

    // Re-use the existing Phase-11 template service, which resolves subjects
    // per-school and creates ClassSubject rows transactionally.
    await this.templates.applyTemplate(cls.schoolId, classId, schoolType, cls.yearLevel);

    return this.findByClass(classId);
  }

  async updateClassSubjects(classId: string, dto: UpdateClassSubjectsDto) {
    const cls = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      include: { school: true },
    });
    if (!cls) throw new NotFoundException('Klasse nicht gefunden');

    // Template lookup by schoolType-for-year; may be null for out-of-catalogue classes.
    const schoolType = cls.school?.schoolType ?? '';
    const template = schoolType
      ? this.templates.getTemplate(schoolType, cls.yearLevel)
      : null;
    const templateHoursByShort = new Map<string, number>(
      (template?.subjects ?? []).map((s: any) => [s.shortName, s.weeklyHours]),
    );

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.classSubject.findMany({ where: { classId } });
      const existingBySubject = new Map(existing.map((cs) => [cs.subjectId, cs]));
      const incomingSubjectIds = new Set(dto.rows.map((r) => r.subjectId));

      // DELETE rows removed from the submission
      const toDelete = existing.filter((cs) => !incomingSubjectIds.has(cs.subjectId));
      if (toDelete.length > 0) {
        await tx.classSubject.deleteMany({
          where: { id: { in: toDelete.map((d) => d.id) } },
        });
      }

      // Resolve subject → shortName for template comparison
      const subjects = await tx.subject.findMany({
        where: { schoolId: cls.schoolId },
      });
      const shortBySubjectId = new Map(subjects.map((s) => [s.id, s.shortName]));

      for (const row of dto.rows) {
        const shortName = shortBySubjectId.get(row.subjectId) ?? '';
        const templateHours = templateHoursByShort.get(shortName);
        const isCustomized =
          templateHours === undefined ? true : templateHours !== row.weeklyHours;
        const prior = existingBySubject.get(row.subjectId);
        if (prior) {
          await tx.classSubject.update({
            where: { id: prior.id },
            data: {
              weeklyHours: row.weeklyHours,
              isCustomized,
              preferDoublePeriod:
                row.preferDoublePeriod ?? prior.preferDoublePeriod,
            },
          });
        } else {
          await tx.classSubject.create({
            data: {
              classId,
              subjectId: row.subjectId,
              weeklyHours: row.weeklyHours,
              isCustomized,
              preferDoublePeriod: row.preferDoublePeriod ?? false,
            },
          });
        }
      }

      return tx.classSubject.findMany({
        where: { classId },
        include: { subject: true },
        orderBy: { subject: { shortName: 'asc' } },
      });
    });
  }

  async resetStundentafel(classId: string, schoolType: string) {
    const cls = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
    });
    if (!cls) throw new NotFoundException('Klasse nicht gefunden');

    const template = this.templates.getTemplate(schoolType, cls.yearLevel);
    if (!template) {
      throw new NotFoundException(
        `Keine Stundentafel-Vorlage für Schultyp ${schoolType}, Jahrgangsstufe ${cls.yearLevel}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.classSubject.deleteMany({ where: { classId } });

      for (const templateSubject of template.subjects) {
        let subject = await tx.subject.findFirst({
          where: { schoolId: cls.schoolId, shortName: templateSubject.shortName },
        });
        if (!subject) {
          subject = await tx.subject.create({
            data: {
              schoolId: cls.schoolId,
              name: templateSubject.name,
              shortName: templateSubject.shortName,
              subjectType: templateSubject.subjectType as any,
              lehrverpflichtungsgruppe: templateSubject.lehrverpflichtungsgruppe,
            },
          });
        }
        await tx.classSubject.create({
          data: {
            classId,
            subjectId: subject.id,
            weeklyHours: templateSubject.weeklyHours,
            isCustomized: false,
          },
        });
      }

      return tx.classSubject.findMany({
        where: { classId },
        include: { subject: true },
        orderBy: { subject: { shortName: 'asc' } },
      });
    });
  }
}
