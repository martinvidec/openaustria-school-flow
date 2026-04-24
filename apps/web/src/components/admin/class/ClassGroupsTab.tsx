import { useState } from 'react';
import type { ClassDetailDto } from '@/hooks/useClasses';
import { GroupRuleBuilderTable } from './GroupRuleBuilderTable';
import { ApplyRulesPreviewDialog } from './ApplyRulesPreviewDialog';
import { GroupOverridesPanel } from './GroupOverridesPanel';

interface Props {
  schoolId: string;
  classId: string;
  cls: ClassDetailDto;
}

export function ClassGroupsTab({ classId, cls }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      <GroupRuleBuilderTable classId={classId} onPreview={() => setPreviewOpen(true)} />

      <div className="border-t pt-4">
        <GroupOverridesPanel classId={classId} cls={cls} />
      </div>

      <ApplyRulesPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        classId={classId}
      />
    </div>
  );
}
