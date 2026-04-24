import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { ParentSearchPopover } from './ParentSearchPopover';
import { useUnlinkParentFromStudent } from '@/hooks/useParents';
import type { StudentDto } from '@/hooks/useStudents';

interface Props {
  student: StudentDto;
  schoolId: string;
}

export function StudentParentsTab({ student, schoolId }: Props) {
  const unlinkMutation = useUnlinkParentFromStudent(student.id);
  const [toUnlink, setToUnlink] = useState<{ parentId: string; name: string } | null>(null);

  const links = student.parentStudents ?? [];

  const handleConfirmUnlink = async () => {
    if (!toUnlink) return;
    await unlinkMutation.mutateAsync(toUnlink.parentId);
    setToUnlink(null);
  };

  return (
    <div className="space-y-4" aria-label="Erziehungsberechtigte">
      <div className="flex justify-end">
        <ParentSearchPopover schoolId={schoolId} studentId={student.id} />
      </div>

      {links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border rounded-md">
          <h3 className="font-semibold">Keine Erziehungsberechtigten verknüpft</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Suchen Sie per E-Mail nach bestehenden Eltern oder legen Sie neue an.
          </p>
        </div>
      ) : (
        <ul className="divide-y border rounded-md">
          {links.map((link) => {
            const p = link.parent.person;
            return (
              <li
                key={link.id}
                className="flex items-center justify-between p-3 gap-3"
                data-testid={`parent-link-${link.parentId}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {p.email}
                    {p.phone ? ` · ${p.phone}` : ''}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Verknüpfung zu ${p.firstName} ${p.lastName} entfernen`}
                  onClick={() =>
                    setToUnlink({ parentId: link.parentId, name: `${p.firstName} ${p.lastName}` })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {toUnlink && (
        <WarnDialog
          open={!!toUnlink}
          title="Verknüpfung entfernen?"
          description={
            <span>
              Die Verknüpfung zu <strong>{toUnlink.name}</strong> wird entfernt. Der Datensatz
              des/der Erziehungsberechtigten bleibt erhalten.
            </span>
          }
          actions={[
            { label: 'Abbrechen', variant: 'ghost', onClick: () => setToUnlink(null) },
            { label: 'Entfernen', variant: 'destructive', onClick: handleConfirmUnlink },
          ]}
          onClose={() => setToUnlink(null)}
        />
      )}
    </div>
  );
}
