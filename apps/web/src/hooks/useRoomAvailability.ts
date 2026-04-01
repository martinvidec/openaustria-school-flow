import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type {
  RoomAvailabilitySlot,
  CreateRoomBookingRequest,
  RoomBookingDto,
} from '@schoolflow/shared';

export const roomKeys = {
  availability: (
    schoolId: string,
    dayOfWeek: string,
    filters?: Record<string, string>,
  ) => ['rooms', schoolId, 'availability', dayOfWeek, filters] as const,
  bookings: (schoolId: string) => ['rooms', schoolId, 'bookings'] as const,
};

/**
 * Fetches room availability for a given day with optional filters.
 * Returns an array of RoomAvailabilitySlot objects (one per room per period).
 */
export function useRoomAvailability(
  schoolId: string | undefined,
  dayOfWeek: string,
  filters?: { roomType?: string; minCapacity?: number; equipment?: string },
) {
  return useQuery({
    queryKey: roomKeys.availability(
      schoolId ?? '',
      dayOfWeek,
      filters as Record<string, string>,
    ),
    queryFn: async (): Promise<RoomAvailabilitySlot[]> => {
      const params = new URLSearchParams({ dayOfWeek });
      if (filters?.roomType) params.set('roomType', filters.roomType);
      if (filters?.minCapacity)
        params.set('minCapacity', String(filters.minCapacity));
      if (filters?.equipment) params.set('equipment', filters.equipment);
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/rooms/availability?${params}`,
      );
      if (!res.ok) throw new Error('Failed to load room availability');
      return res.json();
    },
    enabled: !!schoolId,
  });
}

/**
 * Mutation to create an ad-hoc room booking.
 * Invalidates room queries on success and shows toast feedback.
 */
export function useBookRoom(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRoomBookingRequest) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/rooms/bookings`,
        {
          method: 'POST',
          body: JSON.stringify(dto),
        },
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          error.detail || 'Buchung fehlgeschlagen',
        );
      }
      return res.json() as Promise<RoomBookingDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', schoolId] });
      toast.success('Raum erfolgreich gebucht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation to cancel (delete) a room booking.
 * Invalidates room queries on success and shows toast feedback.
 */
export function useCancelBooking(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/rooms/bookings/${bookingId}`,
        {
          method: 'DELETE',
        },
      );
      if (!res.ok) throw new Error('Stornierung fehlgeschlagen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', schoolId] });
      toast.success('Buchung storniert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
