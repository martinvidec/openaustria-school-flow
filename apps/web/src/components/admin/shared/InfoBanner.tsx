import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function InfoBanner({ children }: Props) {
  return (
    <div className="bg-muted/50 border border-muted rounded-md p-3 text-sm" role="status">
      <Info className="h-4 w-4 mr-2 inline" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
