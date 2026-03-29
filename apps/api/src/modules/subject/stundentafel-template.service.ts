import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { AUSTRIAN_STUNDENTAFELN, StundentafelTemplate } from './templates/austrian-stundentafeln';

@Injectable()
export class StundentafelTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns all available Stundentafel templates.
   */
  getTemplates(): StundentafelTemplate[] {
    return AUSTRIAN_STUNDENTAFELN;
  }

  /**
   * Returns a specific template by school type and year level, or null if not found.
   */
  getTemplate(schoolType: string, yearLevel: number): StundentafelTemplate | null {
    return (
      AUSTRIAN_STUNDENTAFELN.find(
        (t) => t.schoolType === schoolType && t.yearLevel === yearLevel,
      ) ?? null
    );
  }

  /**
   * Returns all templates for a given school type (all year levels).
   */
  getTemplatesForSchoolType(schoolType: string): StundentafelTemplate[] {
    return AUSTRIAN_STUNDENTAFELN.filter((t) => t.schoolType === schoolType);
  }

  /**
   * Applies a Stundentafel template to a class:
   * 1. Looks up the template by schoolType + yearLevel
   * 2. For each subject in the template, finds or creates the Subject in the school
   * 3. Creates ClassSubject entries with weeklyHours from the template
   *
   * @throws NotFoundException if no template found for the given schoolType + yearLevel
   */
  async applyTemplate(
    schoolId: string,
    classId: string,
    schoolType: string,
    yearLevel: number,
  ): Promise<{
    subjectsCreated: number;
    classSubjectsCreated: number;
    totalWeeklyHours: number;
  }> {
    const template = this.getTemplate(schoolType, yearLevel);
    if (!template) {
      throw new NotFoundException(
        `No Stundentafel template found for school type ${schoolType}, year level ${yearLevel}.`,
      );
    }

    let subjectsCreated = 0;
    let classSubjectsCreated = 0;

    for (const templateSubject of template.subjects) {
      // Find or create the subject in this school
      let subject = await this.prisma.subject.findFirst({
        where: {
          schoolId,
          shortName: templateSubject.shortName,
        },
      });

      if (!subject) {
        subject = await this.prisma.subject.create({
          data: {
            schoolId,
            name: templateSubject.name,
            shortName: templateSubject.shortName,
            subjectType: templateSubject.subjectType as any,
            lehrverpflichtungsgruppe: templateSubject.lehrverpflichtungsgruppe,
          },
        });
        subjectsCreated++;
      }

      // Create ClassSubject entry
      await this.prisma.classSubject.createMany({
        data: {
          classId,
          subjectId: subject.id,
          weeklyHours: templateSubject.weeklyHours,
          isCustomized: false,
        },
        skipDuplicates: true,
      });
      classSubjectsCreated++;
    }

    return {
      subjectsCreated,
      classSubjectsCreated,
      totalWeeklyHours: template.totalWeeklyHours,
    };
  }
}
