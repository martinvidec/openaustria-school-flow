export type ImportFileType = 'UNTIS_XML' | 'UNTIS_DIF' | 'CSV';
export type ImportStatus = 'QUEUED' | 'DRY_RUN' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
export type ImportEntityType = 'TEACHERS' | 'CLASSES' | 'ROOMS' | 'STUDENTS' | 'TIMETABLE' | 'MIXED';
export type ImportConflictMode = 'SKIP' | 'UPDATE' | 'FAIL';

export interface ImportJobDto {
  id: string;
  schoolId: string;
  fileType: ImportFileType;
  entityType: ImportEntityType;
  fileName: string;
  conflictMode: ImportConflictMode;
  columnMapping: Record<string, string> | null;
  status: ImportStatus;
  totalRows: number | null;
  importedRows: number | null;
  skippedRows: number | null;
  errorRows: number | null;
  errorDetails: ImportErrorDetail[] | null;
  dryRunResult: ImportDryRunResult | null;
  createdBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ImportErrorDetail {
  row: number;
  field: string;
  message: string;
}

export interface ImportDryRunResult {
  totalRows: number;
  newRows: number;
  duplicateRows: number;
  errorRows: number;
  errors: ImportErrorDetail[];
  preview: Record<string, unknown>[];
}

export interface ImportProgressEvent {
  jobId: string;
  current: number;
  total: number;
  percent: number;
}

export interface StartImportRequest {
  fileType: ImportFileType;
  entityType: ImportEntityType;
  conflictMode: ImportConflictMode;
  columnMapping?: Record<string, string>;
}

export interface ColumnMappingField {
  key: string;
  label: string;
  required: boolean;
}
