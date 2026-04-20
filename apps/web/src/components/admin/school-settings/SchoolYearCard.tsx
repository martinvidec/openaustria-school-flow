import { format } from 'date-fns';
import { CheckCircle2, ChevronDown, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import type { SchoolYearDto } from '@schoolflow/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AutonomousDaysList } from './AutonomousDaysList';
import { HolidaysList } from './HolidaysList';

// The API returns SchoolYear with nested holidays/autonomousDays arrays.
interface SchoolYearWithNested extends SchoolYearDto {
  holidays?: Array<{ id: string; name: string; startDate: string; endDate: string }>;
  autonomousDays?: Array<{ id: string; date: string; reason: string | null }>;
}

interface Props {
  schoolId: string;
  year: SchoolYearWithNested;
  onActivate: () => void;
  onDelete: () => void;
}

export function SchoolYearCard({ schoolId, year, onActivate, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const range = `${format(new Date(year.startDate), 'dd.MM.yyyy')} – ${format(new Date(year.endDate), 'dd.MM.yyyy')}`;
  const deleteDisabled = year.isActive;
  const deleteDisabledReason = year.isActive
    ? 'Aktives Schuljahr kann nicht geloescht werden'
    : null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold truncate">{year.name}</h3>
              {year.isActive && (
                <Badge variant="default" className="shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden />
                  Aktiv
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{range}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!year.isActive && (
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={onActivate}
              aria-label={`Schuljahr ${year.name} aktivieren`}
            >
              <Zap className="h-4 w-4 mr-2" /> Aktivieren
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 md:h-9 md:w-9 text-destructive"
                    onClick={onDelete}
                    disabled={deleteDisabled}
                    aria-label={`Schuljahr ${year.name} loeschen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              {deleteDisabledReason && (
                <TooltipContent>{deleteDisabledReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="h-9 px-0 mt-3 text-sm text-muted-foreground">
            <ChevronDown
              className={`h-4 w-4 mr-1 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
            Ferien &amp; schulautonome Tage
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4">
          <HolidaysList
            schoolId={schoolId}
            yearId={year.id}
            holidays={year.holidays ?? []}
          />
          <AutonomousDaysList
            schoolId={schoolId}
            yearId={year.id}
            days={year.autonomousDays ?? []}
          />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
