interface Props {
  schoolId: string;
  onDirtyChange?: (d: boolean) => void;
}

// Placeholder — Plan 10-05 replaces with the A/B-Wochen-Modus toggle + status line
// reading from useActiveTimetableRun.
export function OptionsTab(_props: Props) {
  return <div className="p-6 text-muted-foreground">Optionen — Plan 05 implementiert.</div>;
}
