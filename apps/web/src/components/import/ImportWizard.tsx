import { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import { ImportFileUpload } from './ImportFileUpload';
import { ImportColumnMapper } from './ImportColumnMapper';
import { ImportUntisPreview } from './ImportUntisPreview';
import { ImportDryRunPreview } from './ImportDryRunPreview';
import { ImportProgressPanel } from './ImportProgressPanel';
import { ImportResultSummary } from './ImportResultSummary';
import { useUploadImport, useDryRun, useCommitImport, useImportJob } from '@/hooks/useImport';
import { useImportSocket } from '@/hooks/useImportSocket';
import { cn } from '@/lib/utils';
import type {
  ImportConflictMode,
  ImportFileType,
  ImportEntityType,
  ImportJobDto,
  ColumnMappingField,
} from '@schoolflow/shared';

interface ImportWizardProps {
  schoolId: string;
  onComplete?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ['Upload', 'Zuordnung', 'Vorschau', 'Import', 'Ergebnis'];

/** Target fields for CSV column mapping by entity type */
const TARGET_FIELDS: Record<string, ColumnMappingField[]> = {
  STUDENTS: [
    { key: 'firstName', label: 'Vorname', required: true },
    { key: 'lastName', label: 'Nachname', required: true },
    { key: 'email', label: 'E-Mail', required: false },
    { key: 'class', label: 'Klasse', required: false },
  ],
  TEACHERS: [
    { key: 'firstName', label: 'Vorname', required: true },
    { key: 'lastName', label: 'Nachname', required: true },
    { key: 'shortName', label: 'Kuerzel', required: false },
    { key: 'subjects', label: 'Faecher', required: false },
  ],
  ROOMS: [
    { key: 'name', label: 'Name', required: true },
    { key: 'longName', label: 'Langname', required: false },
    { key: 'capacity', label: 'Kapazitaet', required: false },
  ],
};

const CONFLICT_MODE_LABELS: Record<ImportConflictMode, string> = {
  SKIP: 'Ueberspringen',
  UPDATE: 'Aktualisieren',
  FAIL: 'Import abbrechen',
};

/**
 * ImportWizard -- 5-step import wizard (upload, mapping/preview, dry-run,
 * progress, result).
 *
 * State machine:
 *   Step 1 (ImportFileUpload) ->
 *   Step 2 (ImportColumnMapper for CSV / ImportUntisPreview for Untis) ->
 *   Step 3 (ImportDryRunPreview) ->
 *   Step 4 (ImportProgressPanel) ->
 *   Step 5 (ImportResultSummary)
 *
 * Uses useUploadImport (1->2), useDryRun (2->3), useCommitImport (3->4).
 * useImportSocket for step 4.
 */
export function ImportWizard({ schoolId, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [detectedType, setDetectedType] = useState<string>('CSV');
  const [parseResult, setParseResult] = useState<Record<string, unknown> | null>(null);
  const [conflictMode, setConflictMode] = useState<ImportConflictMode>('SKIP');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dryRunJob, setDryRunJob] = useState<ImportJobDto | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [completedJob, setCompletedJob] = useState<ImportJobDto | null>(null);

  // Hooks
  const uploadMutation = useUploadImport(schoolId);
  const dryRunMutation = useDryRun(schoolId);
  const commitMutation = useCommitImport(schoolId);

  // Socket for real-time progress
  const { progress, resetProgress } = useImportSocket(
    schoolId,
    useCallback(() => {
      // On import:complete, refetch the job to get final status
      setStep(5);
    }, []),
  );

  // Poll the job for final result when step 5 is reached
  const importJobQuery = useImportJob(schoolId, activeJobId);

  // Determine the final result to display
  const finalResult = completedJob ?? importJobQuery.data ?? null;

  // Step 1: File selected
  function handleFileSelect(file: File, type: string) {
    setDetectedType(type);
    uploadMutation.mutate(file, {
      onSuccess: (data) => {
        setParseResult(data);
        setStep(2);
      },
    });
  }

  // Step 2: Mapping/preview done -> start dry-run
  function handleStep2Next() {
    const entityType: ImportEntityType =
      (parseResult as Record<string, unknown>)?.entityType as ImportEntityType ??
      'MIXED';

    dryRunMutation.mutate(
      {
        fileType: detectedType as ImportFileType,
        entityType,
        conflictMode,
        columnMapping: detectedType === 'CSV' ? columnMapping : undefined,
      },
      {
        onSuccess: (job) => {
          setDryRunJob(job);
          setStep(3);
        },
      },
    );
  }

  // Step 3: Commit import
  function handleCommit() {
    if (!dryRunJob) return;

    commitMutation.mutate(dryRunJob.id, {
      onSuccess: (job) => {
        setActiveJobId(job.id);
        setCompletedJob(null);
        resetProgress();
        setStep(4);

        // If job already completed (fast import), skip to step 5
        if (
          job.status === 'COMPLETED' ||
          job.status === 'PARTIAL' ||
          job.status === 'FAILED'
        ) {
          setCompletedJob(job);
          setStep(5);
        }
      },
    });
  }

  // Step 5: Reset wizard
  function handleNewImport() {
    setStep(1);
    setDetectedType('CSV');
    setParseResult(null);
    setConflictMode('SKIP');
    setColumnMapping({});
    setDryRunJob(null);
    setActiveJobId(null);
    setCompletedJob(null);
    resetProgress();
    onComplete?.();
  }

  // Determine entity type for field selection
  const entityType =
    (parseResult as Record<string, unknown>)?.entityType as string ?? 'STUDENTS';
  const targetFields = TARGET_FIELDS[entityType] ?? TARGET_FIELDS.STUDENTS!;

  // CSV parse details
  const csvHeaders = (parseResult as Record<string, unknown>)?.headers as string[] | undefined;
  const csvSampleData =
    (parseResult as Record<string, unknown>)?.sampleData as string[][] | undefined;

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav aria-label="Import-Fortschritt" className="flex items-center justify-center gap-0">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = (idx + 1) as WizardStep;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={label} className="flex items-center">
              {idx > 0 && (
                <div
                  className={cn(
                    'w-8 h-0.5 sm:w-12',
                    isCompleted ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-[hsl(142_71%_45%)] text-white',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <span
                  className={cn(
                    'text-xs hidden sm:block',
                    isActive
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Step content */}
      <div className="max-w-2xl mx-auto">
        {step === 1 && (
          <ImportFileUpload onFileSelect={handleFileSelect} />
        )}

        {step === 2 && detectedType === 'CSV' && csvHeaders && csvSampleData && (
          <ImportColumnMapper
            headers={csvHeaders}
            sampleData={csvSampleData}
            targetFields={targetFields}
            onMappingChange={setColumnMapping}
            onConflictModeChange={setConflictMode}
            onNext={handleStep2Next}
          />
        )}

        {step === 2 && detectedType !== 'CSV' && parseResult && (
          <ImportUntisPreview
            parsedData={
              parseResult as {
                teacherCount: number;
                classCount: number;
                roomCount: number;
                lessonCount: number;
                teachers?: Array<Record<string, string>>;
                classes?: Array<Record<string, string>>;
                rooms?: Array<Record<string, string>>;
                lessons?: Array<Record<string, string>>;
              }
            }
            onConflictModeChange={setConflictMode}
            onNext={handleStep2Next}
          />
        )}

        {step === 3 && dryRunJob?.dryRunResult && (
          <ImportDryRunPreview
            dryRunResult={dryRunJob.dryRunResult}
            conflictModeLabel={CONFLICT_MODE_LABELS[conflictMode]}
            onCommit={handleCommit}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && <ImportProgressPanel progress={progress} />}

        {step === 5 && finalResult && (
          <ImportResultSummary result={finalResult} onNewImport={handleNewImport} />
        )}
      </div>

      {/* Loading states */}
      {(uploadMutation.isPending || dryRunMutation.isPending || commitMutation.isPending) && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-muted-foreground">
            Wird verarbeitet...
          </span>
        </div>
      )}
    </div>
  );
}
