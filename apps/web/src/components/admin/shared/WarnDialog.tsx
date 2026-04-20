import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Action {
  label: string;
  variant?: ButtonProps['variant'];
  onClick: () => void;
  autoFocus?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  description: ReactNode;
  actions: Action[];
  onClose: () => void;
}

export function WarnDialog({ open, title, description, actions, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription asChild>
                <div>{description}</div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {actions.map((a, i) => (
            <Button
              key={i}
              variant={a.variant ?? 'default'}
              onClick={a.onClick}
              autoFocus={a.autoFocus}
            >
              {a.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
