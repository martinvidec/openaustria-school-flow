import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CreateRoomBookingRequest } from '@schoolflow/shared';

/** Human-readable German day labels */
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
  SATURDAY: 'Samstag',
};

// ─── Book Room Dialog ────────────────────────────────────

interface RoomBookingDialogProps {
  room: { id: string; name: string };
  dayOfWeek: string;
  periodNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onBook: (booking: CreateRoomBookingRequest) => void;
  isLoading?: boolean;
}

/**
 * Dialog for creating an ad-hoc room booking.
 * Pre-filled with room, day, and period info (read-only).
 * Optional purpose field for the booking description.
 *
 * Per UI-SPEC D-13.
 */
export function RoomBookingDialog({
  room,
  dayOfWeek,
  periodNumber,
  isOpen,
  onClose,
  onBook,
  isLoading = false,
}: RoomBookingDialogProps) {
  const [purpose, setPurpose] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onBook({
      roomId: room.id,
      dayOfWeek,
      periodNumber,
      purpose: purpose.trim() || undefined,
    });
    setPurpose('');
  }

  function handleClose() {
    setPurpose('');
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="h-[100dvh] sm:h-auto sm:max-w-lg max-w-full">
        <DialogHeader>
          <DialogTitle>Raum buchen</DialogTitle>
          <DialogDescription>
            Erstellen Sie eine Ad-hoc-Buchung fuer den ausgewaehlten Raum und
            Zeitraum.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-filled read-only info -- stack on mobile, 3 cols on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Raum</span>
              <p className="font-semibold">{room.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tag</span>
              <p className="font-semibold">
                {DAY_LABELS[dayOfWeek] ?? dayOfWeek}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Stunde</span>
              <p className="font-semibold">{periodNumber}.</p>
            </div>
          </div>

          {/* Purpose field */}
          <div className="space-y-2">
            <label
              htmlFor="booking-purpose"
              className="text-sm font-semibold"
            >
              Zweck (optional)
            </label>
            <input
              id="booking-purpose"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Zweck der Buchung (optional)"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={255}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Wird gebucht...' : 'Raum buchen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancel Booking Dialog ────────────────────────────────

interface CancelBookingDialogProps {
  isOpen: boolean;
  bookingLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Confirmation dialog for cancelling an existing room booking.
 * Shows destructive copy per UI-SPEC.
 */
export function CancelBookingDialog({
  isOpen,
  bookingLabel,
  onClose,
  onConfirm,
  isLoading = false,
}: CancelBookingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buchung stornieren</DialogTitle>
          <DialogDescription>
            Moechten Sie diese Raumbuchung stornieren?
            {bookingLabel && (
              <>
                <br />
                <span className="font-semibold">{bookingLabel}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Wird storniert...' : 'Stornieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
