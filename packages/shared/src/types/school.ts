import type { SchoolType } from '../schemas/school.schema';

/** School DTO — server representation including runtime flags. */
export interface SchoolDto {
  id: string;
  name: string;
  schoolType: SchoolType;
  address: { street: string; zip: string; city: string };
  abWeekEnabled: boolean;
}

/** Single period as returned by the API (nullable label + generated id). */
export interface PeriodDto {
  id: string;
  periodNumber: number;
  label: string | null;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

/** TimeGrid DTO — aggregated periods + Mo-Sa school-day mask. */
export interface TimeGridDto {
  id: string;
  schoolId: string;
  periods: PeriodDto[];
  schoolDays: Array<
    'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
  >;
}

/** SchoolYear DTO — dates serialised as ISO-8601 strings over the wire. */
export interface SchoolYearDto {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  semesterBreak: string;
  endDate: string;
  isActive: boolean;
}
