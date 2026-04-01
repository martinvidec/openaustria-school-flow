import { Download, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportMenuProps {
  /** Callback when PDF export is selected */
  onExportPDF: () => void;
  /** Callback when iCal export is selected */
  onExportICal: () => void;
}

/**
 * Export dropdown menu for timetable data (VIEW-06).
 * Provides two export options:
 *   - "Als PDF exportieren" for printable timetable grid
 *   - "Als iCal exportieren" for calendar app integration
 *
 * Trigger button shows Download icon + "Exportieren" text.
 * Per UI-SPEC copywriting contract, all labels are in German.
 */
export function ExportMenu({ onExportPDF, onExportICal }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportieren
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer gap-2">
          <FileText className="h-4 w-4" />
          Als PDF exportieren
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportICal} className="cursor-pointer gap-2">
          <Calendar className="h-4 w-4" />
          Als iCal exportieren
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
