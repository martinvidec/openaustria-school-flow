// Phase 13-02 — Berechtigungen Tab placeholder. Replaced in Task 3.
interface Props {
  userId: string;
}
export function EffectivePermissionsTab({ userId: _userId }: Props) {
  void _userId;
  return (
    <div className="text-sm text-muted-foreground">
      Tab wird in Plan 13-02 Task 3 implementiert
    </div>
  );
}
