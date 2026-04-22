import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StammdatenTab } from './StammdatenTab';
import { LehrverpflichtungTab } from './LehrverpflichtungTab';
import { VerfuegbarkeitsGrid } from './VerfuegbarkeitsGrid';
import { VerfuegbarkeitsMobileList } from './VerfuegbarkeitsMobileList';
import { ErmaessigungenList } from './ErmaessigungenList';
import { useUpdateTeacher, type TeacherDto } from '@/hooks/useTeachers';

type Tab = 'stammdaten' | 'verpflichtung' | 'verfuegbarkeit' | 'ermaessigungen';

const TAB_LABELS: Record<Tab, string> = {
  stammdaten: 'Stammdaten',
  verpflichtung: 'Lehrverpflichtung',
  verfuegbarkeit: 'Verfügbarkeit',
  ermaessigungen: 'Ermäßigungen',
};

interface Props {
  teacher: TeacherDto;
  schoolId: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TeacherDetailTabs({ teacher, schoolId, activeTab, onTabChange }: Props) {
  const updateMutation = useUpdateTeacher(schoolId, teacher.id);

  return (
    <div>
      {/* Desktop tabs */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as Tab)}>
        <TabsList className="hidden md:flex">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Mobile select */}
        <div className="md:hidden mb-3">
          <Select value={activeTab} onValueChange={(v) => onTabChange(v as Tab)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TAB_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="stammdaten" className="pt-4">
          <StammdatenTab
            teacher={teacher}
            teacherId={teacher.id}
            onSave={async (v) => {
              await updateMutation.mutateAsync({
                firstName: v.firstName,
                lastName: v.lastName,
                email: v.email,
                phone: v.phone,
              });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="verpflichtung" className="pt-4">
          <LehrverpflichtungTab
            teacher={teacher}
            onSave={async (v) => {
              await updateMutation.mutateAsync({
                employmentPercentage: v.employmentPercentage,
                werteinheitenTarget: v.werteinheitenTarget,
              });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="verfuegbarkeit" className="pt-4">
          <VerfuegbarkeitsGrid
            teacher={teacher}
            onSave={async (rules) => {
              await updateMutation.mutateAsync({ availabilityRules: rules });
            }}
            isSaving={updateMutation.isPending}
          />
          <VerfuegbarkeitsMobileList
            teacher={teacher}
            onSave={async (rules) => {
              await updateMutation.mutateAsync({ availabilityRules: rules });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="ermaessigungen" className="pt-4">
          <ErmaessigungenList
            teacher={teacher}
            onSave={async (reductions) => {
              await updateMutation.mutateAsync({ reductions });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
