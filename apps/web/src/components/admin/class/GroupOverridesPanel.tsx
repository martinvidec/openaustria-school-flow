import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClassDetailDto } from '@/hooks/useClasses';
import { useAddGroupMember, useRemoveGroupMember } from '@/hooks/useClassGroups';

interface Props {
  classId: string;
  cls: ClassDetailDto;
}

/**
 * Expandable list of Group cards with per-member Auto/Manuell badges.
 * Members can be added (manual, isAutoAssigned=false) or removed; removing an
 * auto-assigned member shows the info hint via the hook's toast pattern.
 */
export function GroupOverridesPanel({ classId, cls }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const addMember = useAddGroupMember(classId);
  const removeMember = useRemoveGroupMember(classId);

  const toggleExpand = (groupId: string) => {
    const next = new Set(expanded);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setExpanded(next);
  };

  if (cls.groups.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Keine Gruppen vorhanden. Erstellen Sie eine Regel und wenden Sie sie an.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-base font-semibold">Gruppen &amp; Manuelle Zuordnungen</h4>
      {cls.groups.map((group) => {
        const isOpen = expanded.has(group.id);
        const memberStudentIds = new Set(
          (group.memberships ?? []).map((m) => m.studentId),
        );
        const addableStudents = cls.students.filter(
          (s) => !memberStudentIds.has(s.id),
        );
        return (
          <div key={group.id} className="rounded-md border bg-card">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20"
              onClick={() => toggleExpand(group.id)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
                <span className="font-semibold">{group.name}</span>
                <Badge variant="secondary">{group.groupType}</Badge>
                {group.level && <Badge variant="outline">{group.level}</Badge>}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {group.memberships?.length ?? 0} Mitglieder
              </span>
            </button>

            {isOpen && (
              <div className="border-t p-3 space-y-2">
                {(group.memberships ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Noch keine Mitglieder.</p>
                )}
                <ul className="space-y-1">
                  {(group.memberships ?? []).map((m) => {
                    const name = m.student
                      ? `${m.student.person.firstName} ${m.student.person.lastName}`
                      : m.studentId;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate">{name}</span>
                        <div className="flex items-center gap-2">
                          {m.isAutoAssigned ? (
                            <Badge className="bg-green-100 text-green-900 hover:bg-green-100">
                              Auto
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                              Manuell
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Mitglied entfernen"
                            onClick={() =>
                              removeMember.mutate({
                                groupId: group.id,
                                studentId: m.studentId,
                                wasAutoAssigned: m.isAutoAssigned,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {addableStudents.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <Select
                      value=""
                      onValueChange={(studentId) =>
                        addMember.mutate({ groupId: group.id, studentId })
                      }
                    >
                      <SelectTrigger className="w-[260px]" aria-label="Schüler:in hinzufügen">
                        <SelectValue placeholder="+ Schüler:in hinzufügen" />
                      </SelectTrigger>
                      <SelectContent>
                        {addableStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <Plus className="h-4 w-4 inline mr-1" />
                            {s.person.firstName} {s.person.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
