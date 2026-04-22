import { useState } from 'react';
import { Link as LinkIcon, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KeycloakLinkDialog } from './KeycloakLinkDialog';
import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useUnlinkKeycloak } from '@/hooks/useTeachers';

interface Props {
  teacherId: string;
  keycloakUserId: string | null;
  email: string;
}

export function KeycloakLinkSection({ teacherId, keycloakUserId, email }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const unlinkMutation = useUnlinkKeycloak(teacherId);

  const isLinked = !!keycloakUserId;

  return (
    <section aria-labelledby="kc-link-title" className="space-y-2">
      <h3 id="kc-link-title" className="text-sm font-semibold">
        Keycloak-Verknüpfung
      </h3>
      {!isLinked && (
        <div className="rounded-md border-2 border-dashed border-muted p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Diese Lehrperson ist noch nicht mit einem Keycloak-Account verknüpft.
          </p>
          <Button size="sm" onClick={() => setLinkOpen(true)}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Keycloak-Account verknüpfen
          </Button>
        </div>
      )}
      {isLinked && (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-4 flex items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-medium">Verknüpft</div>
            <div className="text-muted-foreground text-xs">
              Keycloak-ID: {keycloakUserId?.slice(0, 8)}…
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setUnlinkOpen(true)} className="text-destructive">
            <Unlink className="h-4 w-4 mr-2" />
            Verknüpfung lösen
          </Button>
        </div>
      )}

      <KeycloakLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        teacherId={teacherId}
        initialEmail={email}
      />

      <WarnDialog
        open={unlinkOpen}
        title="Verknüpfung lösen?"
        description="Die Lehrperson kann sich nach dem Lösen nicht mehr über SSO anmelden, bis sie erneut verknüpft wird."
        actions={[
          { label: 'Abbrechen', variant: 'ghost', onClick: () => setUnlinkOpen(false) },
          {
            label: 'Lösen',
            variant: 'destructive',
            onClick: async () => {
              await unlinkMutation.mutateAsync();
              setUnlinkOpen(false);
            },
          },
        ]}
        onClose={() => setUnlinkOpen(false)}
      />
    </section>
  );
}
