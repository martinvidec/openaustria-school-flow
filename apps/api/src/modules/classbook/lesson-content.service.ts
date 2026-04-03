import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { UpdateLessonContentDto } from './dto/lesson-content.dto';

@Injectable()
export class LessonContentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update lesson content fields (thema, lehrstoff, hausaufgabe) on a ClassBookEntry.
   * This is the auto-save endpoint called by the frontend on debounced input (D-09).
   */
  async updateContent(classBookEntryId: string, dto: UpdateLessonContentDto) {
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });

    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    const updated = await this.prisma.classBookEntry.update({
      where: { id: classBookEntryId },
      data: {
        ...(dto.thema !== undefined && { thema: dto.thema }),
        ...(dto.lehrstoff !== undefined && { lehrstoff: dto.lehrstoff }),
        ...(dto.hausaufgabe !== undefined && { hausaufgabe: dto.hausaufgabe }),
      },
    });

    return {
      id: updated.id,
      classSubjectId: updated.classSubjectId,
      dayOfWeek: updated.dayOfWeek,
      periodNumber: updated.periodNumber,
      weekType: updated.weekType,
      date: updated.date.toISOString(),
      teacherId: updated.teacherId,
      schoolId: updated.schoolId,
      thema: updated.thema,
      lehrstoff: updated.lehrstoff,
      hausaufgabe: updated.hausaufgabe,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Get lesson content fields for a ClassBookEntry.
   */
  async getContent(classBookEntryId: string) {
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });

    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    return {
      id: entry.id,
      classSubjectId: entry.classSubjectId,
      dayOfWeek: entry.dayOfWeek,
      periodNumber: entry.periodNumber,
      weekType: entry.weekType,
      date: entry.date.toISOString(),
      teacherId: entry.teacherId,
      schoolId: entry.schoolId,
      thema: entry.thema,
      lehrstoff: entry.lehrstoff,
      hausaufgabe: entry.hausaufgabe,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  /**
   * Get recent ClassBookEntries for the same classSubject (Letzte Eintraege reference).
   * Returns the last N entries ordered by date DESC, with content fields only.
   */
  async getRecentEntries(classSubjectId: string, limit: number = 3) {
    const entries = await this.prisma.classBookEntry.findMany({
      where: { classSubjectId },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        periodNumber: true,
        dayOfWeek: true,
        thema: true,
        lehrstoff: true,
        hausaufgabe: true,
      },
    });

    return entries.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    }));
  }
}
