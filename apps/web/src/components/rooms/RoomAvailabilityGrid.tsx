import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { RoomAvailabilitySlot } from '@schoolflow/shared';

interface PeriodColumn {
  periodNumber: number;
  label: string;
}

interface RoomAvailabilityGridProps {
  /** All availability slots for the selected day */
  slots: RoomAvailabilitySlot[];
  /** Period columns to display */
  periods: PeriodColumn[];
  /** Called when a free (available) slot is clicked */
  onSlotClick: (roomId: string, dayOfWeek: string, periodNumber: number) => void;
  /** Called when an existing booking is clicked (for cancellation) */
  onBookingClick?: (slot: RoomAvailabilitySlot) => void;
}

/** Groups slots by roomId, preserving insertion order */
function groupByRoom(
  slots: RoomAvailabilitySlot[],
): Map<string, { roomName: string; roomType: string; capacity: number; slots: Map<number, RoomAvailabilitySlot> }> {
  const map = new Map<
    string,
    { roomName: string; roomType: string; capacity: number; slots: Map<number, RoomAvailabilitySlot> }
  >();

  for (const slot of slots) {
    let room = map.get(slot.roomId);
    if (!room) {
      room = {
        roomName: slot.roomName,
        roomType: slot.roomType,
        capacity: slot.capacity,
        slots: new Map(),
      };
      map.set(slot.roomId, room);
    }
    room.slots.set(slot.periodNumber, slot);
  }

  return map;
}

/** Human-readable room type labels */
const ROOM_TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Klasse',
  COMPUTER_LAB: 'EDV',
  SCIENCE_LAB: 'Labor',
  GYM: 'Turnsaal',
  MUSIC: 'Musik',
  ART: 'Kunst',
  WORKSHOP: 'Werkstatt',
};

/**
 * Room availability grid component.
 * Displays rooms as rows and periods as columns.
 * Available slots are green and clickable; occupied slots show the occupant.
 * Ad-hoc bookings are visually distinct with dashed borders.
 *
 * Per UI-SPEC D-13, D-14.
 */
export function RoomAvailabilityGrid({
  slots,
  periods,
  onSlotClick,
  onBookingClick,
}: RoomAvailabilityGridProps) {
  const roomGroups = useMemo(() => groupByRoom(slots), [slots]);
  const roomEntries = useMemo(() => Array.from(roomGroups.entries()), [roomGroups]);

  const periodCount = periods.length;
  const roomCount = roomEntries.length;

  if (roomCount === 0) {
    return null;
  }

  // grid-template-columns: room label + one column per period
  const gridTemplateCols = `200px repeat(${periodCount}, 1fr)`;
  // grid-template-rows: header + one row per room
  const gridTemplateRows = `auto repeat(${roomCount}, 56px)`;

  return (
    <div className="overflow-x-auto">
      <div
        role="grid"
        aria-label="Raumbelegung"
        className="grid gap-px bg-muted/30 rounded-lg border overflow-hidden"
        style={{
          gridTemplateColumns: gridTemplateCols,
          gridTemplateRows: gridTemplateRows,
          minWidth: `${200 + periodCount * 80}px`,
        }}
      >
        {/* Header row: empty corner + period numbers */}
        <div
          className="bg-muted/50 flex items-center justify-center text-sm font-semibold p-2"
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          Raum
        </div>
        {periods.map((period, idx) => (
          <div
            key={period.periodNumber}
            className="bg-muted/50 flex items-center justify-center text-sm font-semibold p-2"
            style={{ gridRow: 1, gridColumn: idx + 2 }}
          >
            {period.label}
          </div>
        ))}

        {/* Room rows */}
        {roomEntries.map(([roomId, room], roomIdx) => {
          const gridRow = roomIdx + 2;

          return (
            <RoomRow
              key={roomId}
              roomId={roomId}
              roomName={room.roomName}
              roomType={room.roomType}
              capacity={room.capacity}
              roomSlots={room.slots}
              periods={periods}
              gridRow={gridRow}
              onSlotClick={onSlotClick}
              onBookingClick={onBookingClick}
            />
          );
        })}
      </div>
    </div>
  );
}

interface RoomRowProps {
  roomId: string;
  roomName: string;
  roomType: string;
  capacity: number;
  roomSlots: Map<number, RoomAvailabilitySlot>;
  periods: PeriodColumn[];
  gridRow: number;
  onSlotClick: (roomId: string, dayOfWeek: string, periodNumber: number) => void;
  onBookingClick?: (slot: RoomAvailabilitySlot) => void;
}

function RoomRow({
  roomId,
  roomName,
  roomType,
  capacity,
  roomSlots,
  periods,
  gridRow,
  onSlotClick,
  onBookingClick,
}: RoomRowProps) {
  return (
    <>
      {/* Room label cell */}
      <div
        className="bg-background flex items-center gap-2 px-3 py-1 border-r"
        style={{ gridRow, gridColumn: 1 }}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">{roomName}</span>
          <span className="text-xs text-muted-foreground truncate">
            {ROOM_TYPE_LABELS[roomType] ?? roomType}
          </span>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs shrink-0">
          {capacity}
        </Badge>
      </div>

      {/* Period cells */}
      {periods.map((period, idx) => {
        const slot = roomSlots.get(period.periodNumber);
        const colIndex = idx + 2;

        if (!slot) {
          // No data for this period -- show empty cell
          return (
            <div
              key={period.periodNumber}
              className="bg-muted/20"
              style={{ gridRow, gridColumn: colIndex }}
            />
          );
        }

        if (slot.isAvailable) {
          // Available slot: green, clickable
          return (
            <button
              key={period.periodNumber}
              type="button"
              className={cn(
                'flex items-center justify-center text-xs',
                'cursor-pointer transition-colors',
                'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
              )}
              style={{
                gridRow,
                gridColumn: colIndex,
                backgroundColor: 'hsl(142 71% 45% / 0.15)',
              }}
              onClick={() => onSlotClick(roomId, slot.dayOfWeek, slot.periodNumber)}
              aria-label={`${roomName}, Stunde ${slot.periodNumber} - Frei`}
            >
              <span className="text-xs text-muted-foreground">Frei</span>
            </button>
          );
        }

        // Occupied slot
        const isAdHocBooking = slot.occupiedBy?.type === 'booking';

        if (isAdHocBooking) {
          // Ad-hoc booking: dashed border, muted background, "Ad-hoc" badge
          return (
            <button
              key={period.periodNumber}
              type="button"
              className={cn(
                'relative flex flex-col items-center justify-center p-1',
                'cursor-pointer transition-colors',
                'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
              )}
              style={{
                gridRow,
                gridColumn: colIndex,
                backgroundColor: 'hsl(240 5% 96%)',
                border: '2px dashed hsl(240 5% 65%)',
              }}
              onClick={() => onBookingClick?.(slot)}
              aria-label={`${roomName}, Stunde ${slot.periodNumber} - ${slot.occupiedBy?.label ?? 'Gebucht'}`}
            >
              <span className="absolute top-0.5 right-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Ad-hoc
              </span>
              <span className="text-xs truncate max-w-full mt-2">
                {slot.occupiedBy?.label}
              </span>
              {slot.occupiedBy?.bookedBy && (
                <span className="text-[10px] text-muted-foreground truncate max-w-full">
                  {slot.occupiedBy.bookedBy}
                </span>
              )}
            </button>
          );
        }

        // Occupied by lesson
        return (
          <div
            key={period.periodNumber}
            className="flex flex-col items-center justify-center p-1 bg-muted/40"
            style={{
              gridRow,
              gridColumn: colIndex,
            }}
            aria-label={`${roomName}, Stunde ${slot.periodNumber} - ${slot.occupiedBy?.label ?? 'Belegt'}`}
          >
            <span className="text-xs font-semibold truncate max-w-full">
              {slot.occupiedBy?.label}
            </span>
          </div>
        );
      })}
    </>
  );
}
