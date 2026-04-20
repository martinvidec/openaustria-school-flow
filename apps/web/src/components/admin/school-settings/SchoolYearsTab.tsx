interface Props {
  schoolId: string;
  onDirtyChange?: (d: boolean) => void;
}

// Placeholder — Plan 10-05 replaces with the Schuljahre list (Cards + aktiv badge,
// nested Holidays/AutonomousDays via Collapsible, Create/Activate/Delete dialogs).
export function SchoolYearsTab(_props: Props) {
  return <div className="p-6 text-muted-foreground">Schuljahre — Plan 05 implementiert.</div>;
}
