import { XMLParser } from 'fast-xml-parser';
import type {
  UntisTeacher,
  UntisClass,
  UntisRoom,
  UntisLesson,
  UntisXmlData,
} from './untis-types';

/**
 * Parse Untis XML export data into structured objects.
 *
 * Supports multiple XML structures:
 * - root.document (standard Untis export)
 * - root.sp_export (alternative Untis format)
 * - root directly (fallback)
 *
 * Uses fast-xml-parser with isArray configuration for entity arrays
 * to handle both single-element and multi-element lists.
 */
export function parseUntisXml(xmlContent: string): UntisXmlData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name: string) => {
      const arrayTags = ['teacher', 'class', 'room', 'lesson'];
      return arrayTags.includes(name);
    },
  });

  const parsed = parser.parse(xmlContent);

  // Navigate to data root -- support multiple XML structures
  const root = parsed.document ?? parsed.sp_export ?? parsed;

  const rawTeachers = root.teachers?.teacher ?? [];
  const rawClasses = root.classes?.class ?? [];
  const rawRooms = root.rooms?.room ?? [];
  const rawLessons = root.lessons?.lesson ?? [];

  return {
    teachers: (Array.isArray(rawTeachers) ? rawTeachers : [rawTeachers])
      .filter(Boolean)
      .map(mapXmlTeacher),
    classes: (Array.isArray(rawClasses) ? rawClasses : [rawClasses])
      .filter(Boolean)
      .map(mapXmlClass),
    rooms: (Array.isArray(rawRooms) ? rawRooms : [rawRooms])
      .filter(Boolean)
      .map(mapXmlRoom),
    lessons: (Array.isArray(rawLessons) ? rawLessons : [rawLessons])
      .filter(Boolean)
      .map(mapXmlLesson),
  };
}

function mapXmlTeacher(el: Record<string, unknown>): UntisTeacher {
  return {
    shortName: str(el.shortname ?? el.short_name ?? el['@_shortname'] ?? ''),
    lastName: str(el.surname ?? el.lastname ?? el.last_name ?? el['@_surname'] ?? ''),
    firstName: str(el.firstname ?? el.first_name ?? el['@_firstname'] ?? ''),
    title: str(el.title ?? el['@_title'] ?? ''),
  };
}

function mapXmlClass(el: Record<string, unknown>): UntisClass {
  return {
    name: str(el.shortname ?? el.short_name ?? el.name ?? el['@_shortname'] ?? ''),
    longName: str(el.longname ?? el.long_name ?? el['@_longname'] ?? ''),
    level: num(el.level ?? el['@_level'] ?? 0),
  };
}

function mapXmlRoom(el: Record<string, unknown>): UntisRoom {
  return {
    name: str(el.shortname ?? el.short_name ?? el.name ?? el['@_shortname'] ?? ''),
    longName: str(el.longname ?? el.long_name ?? el['@_longname'] ?? ''),
    capacity: num(el.capacity ?? el['@_capacity'] ?? 0),
  };
}

function mapXmlLesson(el: Record<string, unknown>): UntisLesson {
  const classNamesRaw = str(el.classes ?? el.class_names ?? el['@_classes'] ?? '');
  return {
    lessonNumber: num(el.lesson_number ?? el.lessonnumber ?? el['@_lesson_number'] ?? 0),
    subjectShortName: str(el.subject ?? el.subject_short_name ?? el['@_subject'] ?? ''),
    teacherShortName: str(el.teacher ?? el.teacher_short_name ?? el['@_teacher'] ?? ''),
    classNames: classNamesRaw ? classNamesRaw.split('~').filter(Boolean) : [],
    roomName: str(el.room ?? el.room_name ?? el['@_room'] ?? ''),
    periodsPerWeek: num(el.periods_per_week ?? el.periodsperweek ?? el['@_periods_per_week'] ?? 0),
  };
}

function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function num(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}
