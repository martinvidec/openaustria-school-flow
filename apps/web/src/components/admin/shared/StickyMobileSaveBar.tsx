import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  label?: string;
}

export function StickyMobileSaveBar({ isDirty, isSaving, onSave, label = 'Speichern' }: Props) {
  if (!isDirty) return null;
  return (
    <div
      role="region"
      aria-label="Speichern"
      className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-3 z-40 transition-transform"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <Button onClick={onSave} disabled={isSaving} className="w-full h-11">
        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}
