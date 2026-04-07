import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { PrismaService } from '../../config/database/prisma.service';
import { IMPORT_QUEUE } from '../../config/queue/queue.constants';
import { parseUntisXml } from './parsers/untis-xml.parser';
import {
  parseUntisTeachersDif,
  parseUntisClassesDif,
  parseUntisRoomsDif,
  parseUntisLessonsDif,
  detectUntisFormat,
} from './parsers/untis-dif.parser';
import { parseCsv } from './parsers/csv.parser';
import { Prisma } from '../../config/database/generated/client.js';

/**
 * Job payload for BullMQ import processor.
 * filePath explicitly couples the uploaded file location (set by uploadAndParse)
 * to the BullMQ processor (which reads the file asynchronously).
 */
export interface ImportJobData {
  importJobId: string;
  schoolId: string;
  fileType: string;
  entityType: string;
  conflictMode: string;
  filePath: string;
  columnMapping?: Record<string, string>;
  dryRun: boolean;
}

export interface ImportRowResult {
  status: 'imported' | 'skipped' | 'error';
  error?: string;
}

export interface UploadParseResult {
  importJobId: string;
  fileType: string;
  entityType: string;
  detectedFormat?: 'xml' | 'dif';
  summary: {
    teachers?: number;
    classes?: number;
    rooms?: number;
    lessons?: number;
    headers?: string[];
    rowCount?: number;
    detectedDelimiter?: string;
  };
}

/**
 * IMPORT-01 / IMPORT-02 -- Import orchestration service.
 *
 * Responsibilities:
 * - File upload: parse uploaded content, detect format, store to temp path
 * - Dry-run: queue BullMQ job with dryRun=true for validation without DB writes
 * - Commit: queue BullMQ job with dryRun=false for actual import
 * - Row processing: per-entity-type import logic with conflict resolution (skip/update/fail)
 * - History: audit trail for all import jobs (D-08)
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(IMPORT_QUEUE) private readonly importQueue: Queue,
  ) {}

  /**
   * Upload file content, detect format, parse preview, store temp file, create ImportJob record.
   */
  async uploadAndParse(
    schoolId: string,
    file: { filename: string; content: string },
    userId: string,
  ): Promise<UploadParseResult> {
    // Detect file type from extension and content
    const ext = path.extname(file.filename).toLowerCase();
    let fileType: string;
    let entityType = 'MIXED';

    if (ext === '.xml' || (ext === '.txt' && detectUntisFormat(file.content) === 'xml')) {
      fileType = 'UNTIS_XML';
      entityType = 'MIXED';
    } else if (ext === '.csv') {
      fileType = 'CSV';
      entityType = 'MIXED';
    } else if (ext === '.txt') {
      fileType = 'UNTIS_DIF';
      entityType = 'MIXED';
    } else {
      fileType = 'CSV'; // Default fallback
    }

    // Store file to temp location
    const filePath = path.join(os.tmpdir(), `schoolflow-import-${crypto.randomUUID()}`);
    await fs.writeFile(filePath, file.content, 'utf-8');

    // Parse preview
    let summary: UploadParseResult['summary'] = {};

    if (fileType === 'UNTIS_XML') {
      const data = parseUntisXml(file.content);
      summary = {
        teachers: data.teachers.length,
        classes: data.classes.length,
        rooms: data.rooms.length,
        lessons: data.lessons.length,
      };
    } else if (fileType === 'UNTIS_DIF') {
      // Parse as teachers DIF by default (caller can specify entity type later)
      const teachers = parseUntisTeachersDif(file.content);
      summary = { teachers: teachers.length };
    } else {
      const csvResult = parseCsv(file.content);
      summary = {
        headers: csvResult.headers,
        rowCount: csvResult.data.length,
        detectedDelimiter: csvResult.detectedDelimiter,
      };
    }

    // Create ImportJob record
    const importJob = await this.prisma.importJob.create({
      data: {
        schoolId,
        fileType: fileType as any,
        entityType: entityType as any,
        fileName: file.filename,
        conflictMode: 'SKIP',
        status: 'QUEUED',
        createdBy: userId,
        dryRunResult: { filePath, summary } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      importJobId: importJob.id,
      fileType,
      entityType,
      detectedFormat: fileType === 'UNTIS_XML' ? 'xml' : fileType === 'UNTIS_DIF' ? 'dif' : undefined,
      summary,
    };
  }

  /**
   * Queue a dry-run import job -- validates rows without writing to DB.
   */
  async startDryRun(
    schoolId: string,
    importJobId: string,
    options?: { entityType?: string; conflictMode?: string; columnMapping?: Record<string, string> },
  ): Promise<{ jobId: string; bullmqJobId: string }> {
    const importJob = await this.prisma.importJob.findUnique({ where: { id: importJobId } });
    if (!importJob) {
      throw new NotFoundException('Import job not found');
    }

    // Extract filePath from dryRunResult (stored during upload)
    const dryRunData = importJob.dryRunResult as Record<string, unknown> | null;
    const filePath = dryRunData?.filePath as string | undefined;
    if (!filePath) {
      throw new BadRequestException('Import job has no associated file');
    }

    // Update entity type and conflict mode if provided
    if (options?.entityType || options?.conflictMode || options?.columnMapping) {
      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: {
          entityType: (options.entityType as any) ?? importJob.entityType,
          conflictMode: (options.conflictMode as any) ?? importJob.conflictMode,
          columnMapping: options.columnMapping
            ? (options.columnMapping as unknown as Prisma.InputJsonValue)
            : importJob.columnMapping !== null
              ? (importJob.columnMapping as Prisma.InputJsonValue)
              : Prisma.DbNull,
        },
      });
    }

    const jobData: ImportJobData = {
      importJobId,
      schoolId,
      fileType: importJob.fileType,
      entityType: options?.entityType ?? importJob.entityType,
      conflictMode: options?.conflictMode ?? importJob.conflictMode,
      filePath,
      columnMapping: options?.columnMapping ?? (importJob.columnMapping as Record<string, string> | undefined) ?? undefined,
      dryRun: true,
    };

    const bullmqJob = await this.importQueue.add('import-dry-run', jobData, {
      attempts: 1,
      removeOnComplete: 100,
    });

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { bullmqJobId: bullmqJob.id, status: 'QUEUED' },
    });

    return { jobId: importJobId, bullmqJobId: bullmqJob.id! };
  }

  /**
   * Commit import -- triggers real DB writes as a background job.
   */
  async commitImport(
    importJobId: string,
  ): Promise<{ jobId: string; bullmqJobId: string }> {
    const importJob = await this.prisma.importJob.findUnique({ where: { id: importJobId } });
    if (!importJob) {
      throw new NotFoundException('Import job not found');
    }

    const dryRunData = importJob.dryRunResult as Record<string, unknown> | null;
    const filePath = dryRunData?.filePath as string | undefined;
    if (!filePath) {
      throw new BadRequestException('Import job has no associated file');
    }

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const jobData: ImportJobData = {
      importJobId,
      schoolId: importJob.schoolId,
      fileType: importJob.fileType,
      entityType: importJob.entityType,
      conflictMode: importJob.conflictMode,
      filePath,
      columnMapping: (importJob.columnMapping as Record<string, string> | undefined) ?? undefined,
      dryRun: false,
    };

    const bullmqJob = await this.importQueue.add('import-commit', jobData, {
      attempts: 1,
      removeOnComplete: 100,
    });

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { bullmqJobId: bullmqJob.id },
    });

    return { jobId: importJobId, bullmqJobId: bullmqJob.id! };
  }

  /**
   * Get single import job.
   */
  async getJob(importJobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: importJobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  /**
   * Get import history for a school (D-08 audit trail).
   */
  async getHistory(schoolId: string) {
    return this.prisma.importJob.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete an import job record.
   */
  async deleteJob(importJobId: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: importJobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return this.prisma.importJob.delete({ where: { id: importJobId } });
  }

  /**
   * Process a single import row based on entity type and conflict mode.
   * Called by the BullMQ processor for each row.
   */
  async processImportRow(
    row: Record<string, string>,
    entityType: string,
    schoolId: string,
    conflictMode: string,
  ): Promise<ImportRowResult> {
    try {
      switch (entityType) {
        case 'TEACHERS':
          return this.importTeacher(row, schoolId, conflictMode);
        case 'CLASSES':
          return this.importClass(row, schoolId, conflictMode);
        case 'ROOMS':
          return this.importRoom(row, schoolId, conflictMode);
        case 'STUDENTS':
          return this.importStudent(row, schoolId, conflictMode);
        default:
          return { status: 'error', error: `Unsupported entity type: ${entityType}` };
      }
    } catch (err) {
      return { status: 'error', error: (err as Error).message };
    }
  }

  private async importTeacher(
    row: Record<string, string>,
    schoolId: string,
    conflictMode: string,
  ): Promise<ImportRowResult> {
    const shortName = row.shortName?.trim();
    const lastName = row.lastName?.trim();
    const firstName = row.firstName?.trim();

    if (!shortName && !lastName) {
      return { status: 'error', error: 'Missing shortName or lastName' };
    }

    // Find existing teacher by shortName (abbreviation field)
    const existing = shortName
      ? await this.prisma.teacher.findFirst({
          where: {
            abbreviation: shortName,
            person: { schoolId },
          },
          include: { person: true },
        })
      : null;

    if (existing) {
      if (conflictMode === 'SKIP') {
        return { status: 'skipped' };
      }
      if (conflictMode === 'FAIL') {
        return { status: 'error', error: `Teacher ${shortName} already exists` };
      }
      // UPDATE mode
      await this.prisma.person.update({
        where: { id: existing.personId },
        data: {
          firstName: firstName || existing.person.firstName,
          lastName: lastName || existing.person.lastName,
        },
      });
      return { status: 'imported' };
    }

    // Create new teacher via nested Person+Teacher create (Phase 2 pattern)
    await this.prisma.person.create({
      data: {
        firstName: firstName ?? '',
        lastName: lastName ?? shortName ?? '',
        dateOfBirth: '',
        personType: 'TEACHER',
        schoolId,
        teacher: {
          create: {
            abbreviation: shortName ?? `${(lastName ?? '').slice(0, 3).toUpperCase()}`,
            schoolId,
          },
        },
      },
    });

    return { status: 'imported' };
  }

  private async importClass(
    row: Record<string, string>,
    schoolId: string,
    conflictMode: string,
  ): Promise<ImportRowResult> {
    const name = row.name?.trim();
    if (!name) {
      return { status: 'error', error: 'Missing class name' };
    }

    // Resolve the school's current SchoolYear for schoolYearId
    const schoolYear = await this.prisma.schoolYear.findUnique({
      where: { schoolId },
    });
    if (!schoolYear) {
      return { status: 'error', error: 'No SchoolYear configured for this school' };
    }

    const existing = await this.prisma.schoolClass.findFirst({
      where: { name, schoolId },
    });

    if (existing) {
      if (conflictMode === 'SKIP') return { status: 'skipped' };
      if (conflictMode === 'FAIL') return { status: 'error', error: `Class ${name} already exists` };
      // UPDATE
      await this.prisma.schoolClass.update({
        where: { id: existing.id },
        data: { yearLevel: row.level ? parseInt(row.level, 10) : existing.yearLevel },
      });
      return { status: 'imported' };
    }

    await this.prisma.schoolClass.create({
      data: {
        name,
        yearLevel: row.level ? parseInt(row.level, 10) : 0,
        schoolYearId: schoolYear.id,
        schoolId,
      },
    });

    return { status: 'imported' };
  }

  private async importRoom(
    row: Record<string, string>,
    schoolId: string,
    conflictMode: string,
  ): Promise<ImportRowResult> {
    const name = row.name?.trim();
    if (!name) {
      return { status: 'error', error: 'Missing room name' };
    }

    const existing = await this.prisma.room.findFirst({
      where: { name, schoolId },
    });

    if (existing) {
      if (conflictMode === 'SKIP') return { status: 'skipped' };
      if (conflictMode === 'FAIL') return { status: 'error', error: `Room ${name} already exists` };
      // UPDATE
      await this.prisma.room.update({
        where: { id: existing.id },
        data: {
          capacity: row.capacity ? parseInt(row.capacity, 10) : existing.capacity,
        },
      });
      return { status: 'imported' };
    }

    await this.prisma.room.create({
      data: {
        name,
        capacity: row.capacity ? parseInt(row.capacity, 10) : 0,
        roomType: 'KLASSENZIMMER',
        schoolId,
      },
    });

    return { status: 'imported' };
  }

  private async importStudent(
    row: Record<string, string>,
    schoolId: string,
    conflictMode: string,
  ): Promise<ImportRowResult> {
    const lastName = row.lastName?.trim();
    const firstName = row.firstName?.trim();

    if (!lastName) {
      return { status: 'error', error: 'Missing student lastName' };
    }

    const existing = firstName
      ? await this.prisma.student.findFirst({
          where: {
            person: { firstName, lastName, schoolId },
          },
          include: { person: true },
        })
      : null;

    if (existing) {
      if (conflictMode === 'SKIP') return { status: 'skipped' };
      if (conflictMode === 'FAIL') return { status: 'error', error: `Student ${firstName} ${lastName} already exists` };
      return { status: 'imported' };
    }

    await this.prisma.person.create({
      data: {
        firstName: firstName ?? '',
        lastName,
        dateOfBirth: row.dateOfBirth ?? '',
        personType: 'STUDENT',
        schoolId,
        student: {
          create: {
            schoolId,
          },
        },
      },
    });

    return { status: 'imported' };
  }
}
