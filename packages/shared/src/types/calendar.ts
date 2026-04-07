export interface CalendarTokenDto {
  id: string;
  userId: string;
  schoolId: string;
  token: string;
  calendarUrl: string;
  createdAt: string;
}

export interface SisApiKeyDto {
  id: string;
  schoolId: string;
  name: string;
  key: string; // Only shown at creation time
  isActive: boolean;
  lastUsed: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateSisApiKeyRequest {
  name: string;
}
