/** Room booking DTO */
export interface RoomBookingDto {
  id: string;
  roomId: string;
  roomName: string;
  bookedBy: string;
  bookedByName?: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  purpose: string | null;
  isAdHoc: boolean;
  createdAt: string;
}

/** Create room booking request */
export interface CreateRoomBookingRequest {
  roomId: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType?: string;
  purpose?: string;
}

/** Room availability slot */
export interface RoomAvailabilitySlot {
  roomId: string;
  roomName: string;
  roomType: string;
  capacity: number;
  dayOfWeek: string;
  periodNumber: number;
  isAvailable: boolean;
  occupiedBy?: {
    type: 'lesson' | 'booking';
    label: string;
    bookedBy?: string;
    bookingId?: string;
  };
}

/** Resource DTO */
export interface ResourceDto {
  id: string;
  schoolId: string;
  name: string;
  resourceType: string;
  description: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

/** Create/update resource request */
export interface UpsertResourceRequest {
  name: string;
  resourceType: string;
  description?: string;
  quantity?: number;
}

/** Resource booking DTO */
export interface ResourceBookingDto {
  id: string;
  resourceId: string;
  resourceName: string;
  roomId: string | null;
  bookedBy: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  createdAt: string;
}

/** Create resource booking request */
export interface CreateResourceBookingRequest {
  resourceId: string;
  roomId?: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType?: string;
}
