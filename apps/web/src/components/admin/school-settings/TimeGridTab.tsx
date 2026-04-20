interface Props {
  schoolId: string;
  onDirtyChange?: (d: boolean) => void;
}

// Placeholder — Plan 10-04 replaces with Schultage toggles + PeriodsEditor (DnD + responsive).
export function TimeGridTab(_props: Props) {
  return <div className="p-6 text-muted-foreground">Zeitraster — Plan 04 implementiert.</div>;
}
