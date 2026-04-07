import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'node:fs/promises';
import { IMPORT_QUEUE } from '../../../config/queue/queue.constants';
import { ImportService, type ImportJobData, type ImportRowResult } from '../import.service';
import { ImportEventsGateway } from '../import-events.gateway';
import { parseUntisXml } from '../parsers/untis-xml.parser';
import {
  parseUntisTeachersDif,
  parseUntisClassesDif,
  parseUntisRoomsDif,
  parseUntisLessonsDif,
} from '../parsers/untis-dif.parser';
import { parseCsv } from '../parsers/csv.parser';
import type { UntisTeacher, UntisClass, UntisRoom, UntisLesson } from '../parsers/untis-types';
import { PrismaService } from '../../../config/database/prisma.service';
import { Prisma } from '../../../config/database/generated/client.js';

const CHUNK_SIZE = 50;

/**
 * IMPORT-01/IMPORT-02 -- BullMQ worker for async import processing.
 *
 * Reads file from disk (path set during uploadAndParse), parses per file type,
 * then either validates (dry-run) or commits (real import) rows.
 *
 * Progress is reported per chunk via:
 * - job.updateProgress() for BullMQ dashboard visibility
 * - ImportEventsGateway.emitProgress() for Socket.IO real-time push to admin UI
 *
 * Temp file is cleaned up in a finally block after processing.
 */
@Processor(IMPORT_QUEUE)
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    private readonly importService: ImportService,
    private readonly gateway: ImportEventsGateway,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<any> {
    const { importJobId, schoolId, fileType, entityType, conflictMode, filePath, columnMapping, dryRun } = job.data;
    this.logger.log(`Processing import job ${importJobId} (dryRun=${dryRun}, fileType=${fileType})`);

    let rows: Record<string, string>[] = [];

    try {
      // Read file content from temp path
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse file into uniform row format
      rows = this.parseFileToRows(content, fileType, entityType, columnMapping);

      // Update total rows on job record
      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: {
          totalRows: rows.length,
          status: dryRun ? 'DRY_RUN' : 'PROCESSING',
          startedAt: new Date(),
        },
      });

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errorDetails: Array<{ row: number; error: string }> = [];

      // Process rows in chunks for efficiency
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);

        for (let j = 0; j < chunk.length; j++) {
          const rowIndex = i + j;
          const row = chunk[j];

          if (dryRun) {
            // Dry-run: validate without DB writes (check for required fields only)
            const validation = this.validateRow(row, entityType);
            if (validation.status === 'error') {
              errorCount++;
              errorDetails.push({ row: rowIndex + 1, error: validation.error! });
            } else {
              importedCount++;
            }
          } else {
            // Real import: process row with conflict resolution
            const result = await this.importService.processImportRow(
              row,
              entityType,
              schoolId,
              conflictMode,
            );
            switch (result.status) {
              case 'imported':
                importedCount++;
                break;
              case 'skipped':
                skippedCount++;
                break;
              case 'error':
                errorCount++;
                errorDetails.push({ row: rowIndex + 1, error: result.error ?? 'Unknown error' });
                break;
            }
          }
        }

        // Emit progress after each chunk
        const current = Math.min(i + CHUNK_SIZE, rows.length);
        const percent = Math.round((current / rows.length) * 100);
        await job.updateProgress({ current, total: rows.length, percent });
        this.gateway.emitProgress(schoolId, importJobId, {
          current,
          total: rows.length,
          percent,
        });
      }

      // Determine final status
      let finalStatus: string;
      if (dryRun) {
        finalStatus = 'DRY_RUN';
      } else if (errorCount === rows.length) {
        finalStatus = 'FAILED';
      } else if (errorCount > 0 || skippedCount > 0) {
        finalStatus = 'PARTIAL';
      } else {
        finalStatus = 'COMPLETED';
      }

      // Update ImportJob with results
      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: finalStatus as any,
          importedRows: importedCount,
          skippedRows: skippedCount,
          errorRows: errorCount,
          errorDetails: errorDetails.length > 0
            ? (errorDetails as unknown as Prisma.InputJsonValue)
            : undefined,
          dryRunResult: dryRun
            ? ({
                importedCount,
                skippedCount,
                errorCount,
                errorDetails,
                totalRows: rows.length,
              } as unknown as Prisma.InputJsonValue)
            : undefined,
          completedAt: new Date(),
        },
      });

      // Emit completion event
      this.gateway.emitComplete(schoolId, importJobId, {
        jobId: importJobId,
        status: finalStatus,
        totalRows: rows.length,
        importedRows: importedCount,
        skippedRows: skippedCount,
        errorRows: errorCount,
      });

      this.logger.log(
        `Import job ${importJobId} ${finalStatus}: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors`,
      );

      return { status: finalStatus, importedCount, skippedCount, errorCount };
    } catch (err) {
      this.logger.error(`Import job ${importJobId} failed: ${(err as Error).message}`);

      await this.prisma.importJob.update({
        where: { id: importJobId },
        data: {
          status: 'FAILED',
          errorDetails: [{ row: 0, error: (err as Error).message }] as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      this.gateway.emitComplete(schoolId, importJobId, {
        jobId: importJobId,
        status: 'FAILED',
        totalRows: rows.length,
        importedRows: 0,
        skippedRows: 0,
        errorRows: rows.length,
      });

      throw err;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(filePath);
        this.logger.debug(`Cleaned up temp file: ${filePath}`);
      } catch {
        // File may already be deleted -- ignore
      }
    }
  }

  /**
   * Parse file content into uniform Record<string, string>[] format.
   * Each row maps field names to string values, regardless of source format.
   */
  private parseFileToRows(
    content: string,
    fileType: string,
    entityType: string,
    columnMapping?: Record<string, string>,
  ): Record<string, string>[] {
    if (fileType === 'UNTIS_XML') {
      return this.untisXmlToRows(content, entityType);
    }

    if (fileType === 'UNTIS_DIF') {
      return this.untisDifToRows(content, entityType);
    }

    // CSV
    const csvResult = parseCsv(content);
    if (!columnMapping) {
      // Without mapping, use headers as field names directly
      return csvResult.data.map((row) => {
        const record: Record<string, string> = {};
        csvResult.headers.forEach((header, idx) => {
          record[header] = row[idx] ?? '';
        });
        return record;
      });
    }

    // With column mapping: sourceColumn -> targetField
    return csvResult.data.map((row) => {
      const record: Record<string, string> = {};
      for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
        const colIdx = csvResult.headers.indexOf(sourceCol);
        if (colIdx >= 0) {
          record[targetField] = row[colIdx] ?? '';
        }
      }
      return record;
    });
  }

  /**
   * Convert Untis XML parsed data to flat row records for the specified entity type.
   */
  private untisXmlToRows(content: string, entityType: string): Record<string, string>[] {
    const data = parseUntisXml(content);

    switch (entityType) {
      case 'TEACHERS':
        return data.teachers.map((t: UntisTeacher) => ({
          shortName: t.shortName,
          lastName: t.lastName,
          firstName: t.firstName,
          title: t.title,
        }));
      case 'CLASSES':
        return data.classes.map((c: UntisClass) => ({
          name: c.name,
          longName: c.longName,
          level: String(c.level),
        }));
      case 'ROOMS':
        return data.rooms.map((r: UntisRoom) => ({
          name: r.name,
          longName: r.longName,
          capacity: String(r.capacity),
        }));
      case 'MIXED':
        // For mixed: return all entity rows combined (teachers first, then classes, rooms)
        return [
          ...data.teachers.map((t: UntisTeacher) => ({ _type: 'TEACHERS', shortName: t.shortName, lastName: t.lastName, firstName: t.firstName })),
          ...data.classes.map((c: UntisClass) => ({ _type: 'CLASSES', name: c.name, longName: c.longName, level: String(c.level) })),
          ...data.rooms.map((r: UntisRoom) => ({ _type: 'ROOMS', name: r.name, longName: r.longName, capacity: String(r.capacity) })),
        ];
      default:
        return [];
    }
  }

  /**
   * Convert Untis DIF parsed data to flat row records.
   */
  private untisDifToRows(content: string, entityType: string): Record<string, string>[] {
    switch (entityType) {
      case 'TEACHERS':
        return parseUntisTeachersDif(content).map((t) => ({
          shortName: t.shortName,
          lastName: t.lastName,
          firstName: t.firstName,
          title: t.title,
        }));
      case 'CLASSES':
        return parseUntisClassesDif(content).map((c) => ({
          name: c.name,
          longName: c.longName,
          level: String(c.level),
        }));
      case 'ROOMS':
        return parseUntisRoomsDif(content).map((r) => ({
          name: r.name,
          longName: r.longName,
          capacity: String(r.capacity),
        }));
      default:
        return [];
    }
  }

  /**
   * Validate a row without DB writes (for dry-run mode).
   * Checks that required fields are present based on entity type.
   */
  private validateRow(row: Record<string, string>, entityType: string): ImportRowResult {
    switch (entityType) {
      case 'TEACHERS':
        if (!row.shortName?.trim() && !row.lastName?.trim()) {
          return { status: 'error', error: 'Missing shortName or lastName' };
        }
        return { status: 'imported' };
      case 'CLASSES':
        if (!row.name?.trim()) {
          return { status: 'error', error: 'Missing class name' };
        }
        return { status: 'imported' };
      case 'ROOMS':
        if (!row.name?.trim()) {
          return { status: 'error', error: 'Missing room name' };
        }
        return { status: 'imported' };
      case 'STUDENTS':
        if (!row.lastName?.trim()) {
          return { status: 'error', error: 'Missing student lastName' };
        }
        return { status: 'imported' };
      case 'MIXED':
        // For mixed rows, check based on _type marker
        if (row._type) {
          return this.validateRow(row, row._type);
        }
        return { status: 'imported' };
      default:
        return { status: 'error', error: `Unsupported entity type: ${entityType}` };
    }
  }
}
