// --- Enums (mirror Prisma enums) ---
export type AbsenceReason =
  | 'KRANK'
  | 'FORTBILDUNG'
  | 'DIENSTREISE'
  | 'SCHULVERANSTALTUNG'
  | 'ARZTTERMIN'
  | 'SONSTIGES';

export type AbsenceStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

export type SubstitutionType = 'SUBSTITUTED' | 'ENTFALL' | 'STILLARBEIT';

export type SubstitutionStatus = 'PENDING' | 'OFFERED' | 'CONFIRMED' | 'DECLINED';

// --- DTOs ---
export interface TeacherAbsenceDto {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  dateFrom: string;
  dateTo: string;
  periodFrom: number | null;
  periodTo: number | null;
  reason: AbsenceReason;
  note: string | null;
  status: AbsenceStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  affectedLessonCount: number;
}

export interface SubstitutionDto {
  id: string;
  absenceId: string;
  lessonId: string;
  classSubjectId: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  date: string;
  type: SubstitutionType | null;
  status: SubstitutionStatus;
  originalTeacherId: string;
  originalTeacherName: string;
  substituteTeacherId: string | null;
  substituteTeacherName: string | null;
  substituteRoomId: string | null;
  offeredAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subjectAbbreviation: string;
  subjectName: string;
  className: string;
}

export interface ScoreBreakdown {
  subjectMatch: number;
  fairness: number;
  workloadHeadroom: number;
  klassenvorstand: number;
  total: number;
}

export interface RankedCandidateDto {
  teacherId: string;
  teacherName: string;
  score: number;
  breakdown: ScoreBreakdown;
  isKlassenvorstand: boolean;
}

export interface HandoverAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface HandoverNoteDto {
  id: string;
  substitutionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  attachments: HandoverAttachmentDto[];
}

export interface FairnessStatRow {
  teacherId: string;
  teacherName: string;
  givenCount: number;
  givenWerteinheiten: number;
  receivedCount: number;
  entfallAffectedCount: number;
  stillarbeitAffectedCount: number;
  deltaVsAverage: number;
}

// --- Event payloads ---
export interface SubstitutionCreatedEvent {
  substitutionId: string;
  lessonId: string;
  date: string;
  type: SubstitutionType | null;
  status: SubstitutionStatus;
}
