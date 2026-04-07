import Papa from 'papaparse';
import type {
  UntisTeacher,
  UntisClass,
  UntisRoom,
  UntisLesson,
} from './untis-types';

/**
 * Parse Untis GPU004 teacher DIF file.
 * Positional field order: [0]=shortName, [1]=lastName, [2]=firstName, [3]=title
 */
export function parseUntisTeachersDif(
  content: string,
  delimiter?: string,
): UntisTeacher[] {
  const rows = parseDif(content, delimiter);
  return rows
    .filter((row) => row[0]?.trim())
    .map((row) => ({
      shortName: row[0]?.trim() ?? '',
      lastName: row[1]?.trim() ?? '',
      firstName: row[2]?.trim() ?? '',
      title: row[3]?.trim() ?? '',
    }));
}

/**
 * Parse Untis GPU003 class DIF file.
 * Positional field order: [0]=name, [1]=longName, [2]=level
 */
export function parseUntisClassesDif(
  content: string,
  delimiter?: string,
): UntisClass[] {
  const rows = parseDif(content, delimiter);
  return rows
    .filter((row) => row[0]?.trim())
    .map((row) => ({
      name: row[0]?.trim() ?? '',
      longName: row[1]?.trim() ?? '',
      level: parseInt(row[2] ?? '0', 10) || 0,
    }));
}

/**
 * Parse Untis GPU005 room DIF file.
 * Positional field order: [0]=name, [1]=longName, [2]=capacity
 */
export function parseUntisRoomsDif(
  content: string,
  delimiter?: string,
): UntisRoom[] {
  const rows = parseDif(content, delimiter);
  return rows
    .filter((row) => row[0]?.trim())
    .map((row) => ({
      name: row[0]?.trim() ?? '',
      longName: row[1]?.trim() ?? '',
      capacity: parseInt(row[2] ?? '0', 10) || 0,
    }));
}

/**
 * Parse Untis GPU002 lesson DIF file.
 * Positional field order: [0]=lessonNumber, [1]=subjectShortName, [2]=teacherShortName,
 *   [3]=classNames (tilde-separated), [4]=roomName, [5]=periodsPerWeek
 */
export function parseUntisLessonsDif(
  content: string,
  delimiter?: string,
): UntisLesson[] {
  const rows = parseDif(content, delimiter);
  return rows
    .filter((row) => row[0]?.trim())
    .map((row) => {
      const classNamesRaw = row[3]?.trim() ?? '';
      return {
        lessonNumber: parseInt(row[0] ?? '0', 10) || 0,
        subjectShortName: row[1]?.trim() ?? '',
        teacherShortName: row[2]?.trim() ?? '',
        classNames: classNamesRaw ? classNamesRaw.split('~').filter(Boolean) : [],
        roomName: row[4]?.trim() ?? '',
        periodsPerWeek: parseInt(row[5] ?? '0', 10) || 0,
      };
    });
}

/**
 * Detect whether content is Untis XML or DIF format.
 * Checks for XML declaration or typical XML root element tags.
 */
export function detectUntisFormat(content: string): 'xml' | 'dif' {
  const trimmed = content.trimStart();
  if (
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('<document') ||
    trimmed.startsWith('<sp_export')
  ) {
    return 'xml';
  }
  return 'dif';
}

/**
 * Internal: parse DIF content via PapaParse with auto-delimiter detection.
 * Filters out empty rows. Extra trailing fields are silently ignored
 * by the caller (each mapper only reads the fields it needs).
 */
function parseDif(content: string, delimiter?: string): string[][] {
  const result = Papa.parse<string[]>(content, {
    delimiter: delimiter ?? '',
    skipEmptyLines: true,
  });
  return result.data;
}
