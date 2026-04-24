import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateRule,
  useDeleteRule,
  useGroupDerivationRules,
  useUpdateRule,
} from '@/hooks/useGroupDerivationRules';
import type { GroupDerivationRuleDto } from '@/hooks/useClasses';

const GROUP_TYPES: Array<{ value: string; label: string }> = [
  { value: 'RELIGION', label: 'Religion' },
  { value: 'WAHLPFLICHT', label: 'Wahlpflicht' },
  { value: 'LEISTUNG', label: 'Leistung' },
  { value: 'LANGUAGE', label: 'Sprache' },
  { value: 'CUSTOM', label: 'Sonstige' },
];

interface Props {
  classId: string;
  onPreview: () => void;
}

/**
 * GroupRuleBuilderTable — admin surface to CRUD GroupDerivationRule rows
 * for a class. Phase 12-02 CLASS-05 / D-12.
 */
export function GroupRuleBuilderTable({ classId, onPreview }: Props) {
  const rulesQuery = useGroupDerivationRules(classId);
  const createRule = useCreateRule(classId);
  const updateRule = useUpdateRule(classId);
  const deleteRule = useDeleteRule(classId);

  const [newGroupType, setNewGroupType] = useState('RELIGION');
  const [newGroupName, setNewGroupName] = useState('');

  const rules = rulesQuery.data ?? [];

  const handleAdd = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createRule.mutateAsync({
        groupType: newGroupType as any,
        groupName: newGroupName.trim(),
      });
      setNewGroupName('');
    } catch {
      // toast fired by hook
    }
  };

  const handleUpdate = (rule: GroupDerivationRuleDto, patch: Partial<GroupDerivationRuleDto>) => {
    updateRule.mutate({ ruleId: rule.id, dto: patch as any });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">Gruppenableitungsregeln</h4>
        <Button
          onClick={onPreview}
          disabled={rules.length === 0}
          variant="default"
        >
          Regeln anwenden
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold w-40">Typ</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold w-40">Level</th>
              <th className="px-3 py-2 font-semibold tabular-nums w-28">Schüler:innen</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-t">
                <td className="px-3 py-2">
                  <Select
                    value={rule.groupType}
                    onValueChange={(v) => handleUpdate(rule, { groupType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    defaultValue={rule.groupName}
                    onBlur={(e) => {
                      if (e.target.value !== rule.groupName) {
                        handleUpdate(rule, { groupName: e.target.value });
                      }
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    defaultValue={rule.level ?? ''}
                    onBlur={(e) => {
                      if ((e.target.value || null) !== (rule.level ?? null)) {
                        handleUpdate(rule, { level: e.target.value || null });
                      }
                    }}
                    placeholder="—"
                  />
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {(rule.studentIds?.length ?? 0)}
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Regel entfernen"
                    onClick={() => deleteRule.mutate(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            <tr className="border-t bg-muted/10">
              <td className="px-3 py-2">
                <Select value={newGroupType} onValueChange={setNewGroupType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Gruppenname …"
                />
              </td>
              <td className="px-3 py-2" colSpan={2}></td>
              <td className="px-3 py-2">
                <Button
                  onClick={handleAdd}
                  disabled={!newGroupName.trim() || createRule.isPending}
                  aria-label="Regel hinzufügen"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">+ Regel hinzufügen</p>
    </div>
  );
}
