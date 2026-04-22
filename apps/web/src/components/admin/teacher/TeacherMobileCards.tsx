import { Link as RouterLink } from '@tanstack/react-router';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { calculateMaxTeachingHours } from '@schoolflow/shared';
import type { TeacherDto } from '@/hooks/useTeachers';

interface Props {
  teachers: TeacherDto[];
}

export function TeacherMobileCards({ teachers }: Props) {
  return (
    <div className="md:hidden space-y-2">
      {teachers.map((t) => {
        const effectiveWE = calculateMaxTeachingHours(t.werteinheitenTarget, t.reductions ?? []);
        return (
          <RouterLink
            key={t.id}
            to="/admin/teachers/$teacherId"
            params={{ teacherId: t.id }}
            search={{ tab: 'stammdaten' }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {t.person.lastName}, {t.person.firstName}
                    </div>
                    {t.person.email && (
                      <div className="text-xs text-muted-foreground">{t.person.email}</div>
                    )}
                  </div>
                  {t.person.keycloakUserId ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Keycloak verknüpft" />
                  ) : (
                    <XCircle
                      className="h-4 w-4 text-muted-foreground"
                      aria-label="Keycloak nicht verknüpft"
                    />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>
                    {(t.qualifications ?? []).length} Fächer
                  </span>
                  <span>{effectiveWE.toFixed(1)} WE</span>
                </div>
              </CardContent>
            </Card>
          </RouterLink>
        );
      })}
    </div>
  );
}
