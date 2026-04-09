import { useState, useMemo, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoomAvailabilityGrid } from '@/components/rooms/RoomAvailabilityGrid';
import {
  RoomBookingDialog,
  CancelBookingDialog,
} from '@/components/rooms/RoomBookingDialog';
import {
  useRoomAvailability,
  useBookRoom,
  useCancelBooking,
} from '@/hooks/useRoomAvailability';
import { useSchoolContext } from '@/stores/school-context-store';
import type { RoomAvailabilitySlot } from '@schoolflow/shared';

export const Route = createFileRoute('/_authenticated/rooms/')({
  component: RoomsPage,
});

/** Days of the week with German labels */
const WEEKDAYS = [
  { value: 'MONDAY', label: 'Montag' },
  { value: 'TUESDAY', label: 'Dienstag' },
  { value: 'WEDNESDAY', label: 'Mittwoch' },
  { value: 'THURSDAY', label: 'Donnerstag' },
  { value: 'FRIDAY', label: 'Freitag' },
] as const;

/** Room types with German labels — values match backend RoomTypeDto enum */
const ROOM_TYPES = [
  { value: '', label: 'Alle Raumtypen' },
  { value: 'KLASSENZIMMER', label: 'Klassenzimmer' },
  { value: 'EDV_RAUM', label: 'EDV-Raum' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'TURNSAAL', label: 'Turnsaal' },
  { value: 'MUSIKRAUM', label: 'Musikraum' },
  { value: 'WERKRAUM', label: 'Werkraum' },
] as const;

/** Returns today's day of week as DayOfWeekType string (default MONDAY if weekend) */
function getTodayDayOfWeek(): string {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const dayMap: Record<number, string> = {
    1: 'MONDAY',
    2: 'TUESDAY',
    3: 'WEDNESDAY',
    4: 'THURSDAY',
    5: 'FRIDAY',
  };
  return dayMap[jsDay] ?? 'MONDAY';
}

/** Default period columns (standard Austrian school day) */
const DEFAULT_PERIODS = Array.from({ length: 10 }, (_, i) => ({
  periodNumber: i + 1,
  label: `${i + 1}.`,
}));

function RoomsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';

  // Filter state
  const [dayOfWeek, setDayOfWeek] = useState(getTodayDayOfWeek);
  const [roomType, setRoomType] = useState('__all__');
  const [minCapacity, setMinCapacity] = useState('');
  const [equipment, setEquipment] = useState('');

  // Booking dialog state
  const [bookingTarget, setBookingTarget] = useState<{
    roomId: string;
    roomName: string;
    dayOfWeek: string;
    periodNumber: number;
  } | null>(null);

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<RoomAvailabilitySlot | null>(
    null,
  );

  // Build filter params
  const filters = useMemo(
    () => ({
      roomType: roomType !== '__all__' ? roomType : undefined,
      minCapacity: minCapacity ? Number(minCapacity) : undefined,
      equipment: equipment || undefined,
    }),
    [roomType, minCapacity, equipment],
  );

  // Fetch room availability
  const {
    data: slots = [],
    isLoading,
    isError,
  } = useRoomAvailability(schoolId, dayOfWeek, filters);

  // Mutations
  const bookRoom = useBookRoom(schoolId);
  const cancelBooking = useCancelBooking(schoolId);

  // Derive room name from slots for booking dialog
  const getRoomName = useCallback(
    (roomId: string): string => {
      const slot = slots.find((s) => s.roomId === roomId);
      return slot?.roomName ?? roomId;
    },
    [slots],
  );

  // Handle free slot click -- open booking dialog
  function handleSlotClick(
    roomId: string,
    slotDayOfWeek: string,
    periodNumber: number,
  ) {
    setBookingTarget({
      roomId,
      roomName: getRoomName(roomId),
      dayOfWeek: slotDayOfWeek,
      periodNumber,
    });
  }

  // Handle booking click -- open cancel dialog
  function handleBookingClick(slot: RoomAvailabilitySlot) {
    setCancelTarget(slot);
  }

  // Handle book room submission
  function handleBook(booking: {
    roomId: string;
    dayOfWeek: string;
    periodNumber: number;
    purpose?: string;
  }) {
    bookRoom.mutate(booking, {
      onSuccess: () => setBookingTarget(null),
    });
  }

  // Handle cancel booking confirmation
  function handleCancelBooking() {
    if (!cancelTarget?.occupiedBy?.bookingId) return;
    cancelBooking.mutate(
      cancelTarget.occupiedBy.bookingId,
      {
        onSuccess: () => setCancelTarget(null),
      },
    );
  }

  // Check if there are any rooms in the data
  const hasRooms = slots.length > 0;
  const hasBookings = slots.some((s) => !s.isAvailable);
  const hasActiveFilters = roomType !== '__all__' || minCapacity !== '' || equipment !== '';

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="text-[28px] font-semibold leading-[1.2]">Raeume</h1>

      {/* Filter bar -- stacked on mobile, horizontal on sm+ */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-end gap-4">
            {/* Day selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tag</label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room type filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Raumtyp</label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                  <SelectValue placeholder="Alle Raumtypen" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem
                      key={type.value || 'all'}
                      value={type.value || '__all__'}
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Minimum capacity filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Mindestkapazitaet
              </label>
              <input
                type="number"
                className="flex min-h-[44px] h-11 w-full sm:w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="z.B. 20"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                min={0}
              />
            </div>

            {/* Equipment filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Ausstattung</label>
              <input
                type="text"
                className="flex min-h-[44px] h-11 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="z.B. Beamer, Whiteboard"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">
                Raumbelegung wird geladen...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">
              Raumbelegung konnte nicht geladen werden. Bitte versuchen Sie es
              spaeter erneut.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state: no rooms or no filter matches */}
      {!isLoading && !isError && !hasRooms && (
        <Card>
          <CardHeader>
            <CardTitle>
              {hasActiveFilters ? 'Keine passenden Raeume' : 'Keine Raeume angelegt'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'Keine Raeume entsprechen den aktuellen Filterkriterien. Passen Sie die Filter an oder setzen Sie sie zurueck.'
                : 'Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Room availability grid -- horizontal scroll on mobile with frozen time column */}
      {!isLoading && !isError && hasRooms && (
        <>
          <div className="overflow-x-auto">
            <RoomAvailabilityGrid
              slots={slots}
              periods={DEFAULT_PERIODS}
              onSlotClick={handleSlotClick}
              onBookingClick={handleBookingClick}
            />
          </div>

          {/* Empty bookings info */}
          {!hasBookings && (
            <Card>
              <CardHeader>
                <CardTitle>Keine Buchungen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Es gibt derzeit keine Raumbuchungen fuer diesen Tag.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Booking dialog */}
      {bookingTarget && (
        <RoomBookingDialog
          room={{
            id: bookingTarget.roomId,
            name: bookingTarget.roomName,
          }}
          dayOfWeek={bookingTarget.dayOfWeek}
          periodNumber={bookingTarget.periodNumber}
          isOpen
          onClose={() => setBookingTarget(null)}
          onBook={handleBook}
          isLoading={bookRoom.isPending}
        />
      )}

      {/* Cancel booking dialog */}
      {cancelTarget && (
        <CancelBookingDialog
          isOpen
          bookingLabel={cancelTarget.occupiedBy?.label}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelBooking}
          isLoading={cancelBooking.isPending}
        />
      )}
    </div>
  );
}
