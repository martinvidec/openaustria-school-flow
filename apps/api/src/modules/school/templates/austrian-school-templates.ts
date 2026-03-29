export interface TimeGridTemplate {
  schoolType: string;
  displayName: string;
  periods: Array<{
    periodNumber: number;
    startTime: string; // HH:mm
    endTime: string;
    isBreak: boolean;
    label: string;
    durationMin: number;
  }>;
  defaultSchoolDays: string[]; // DayOfWeek values
}

export const AUSTRIAN_SCHOOL_TEMPLATES: TimeGridTemplate[] = [
  {
    schoolType: 'AHS_UNTER',
    displayName: 'AHS Unterstufe (Standard 50min)',
    periods: [
      { periodNumber: 1, startTime: '07:55', endTime: '08:45', isBreak: false, label: '1. Stunde', durationMin: 50 },
      { periodNumber: 2, startTime: '08:45', endTime: '08:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 3, startTime: '08:50', endTime: '09:40', isBreak: false, label: '2. Stunde', durationMin: 50 },
      { periodNumber: 4, startTime: '09:40', endTime: '09:55', isBreak: true, label: 'Grosse Pause', durationMin: 15 },
      { periodNumber: 5, startTime: '09:55', endTime: '10:45', isBreak: false, label: '3. Stunde', durationMin: 50 },
      { periodNumber: 6, startTime: '10:45', endTime: '10:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 7, startTime: '10:50', endTime: '11:40', isBreak: false, label: '4. Stunde', durationMin: 50 },
      { periodNumber: 8, startTime: '11:40', endTime: '11:45', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 9, startTime: '11:45', endTime: '12:35', isBreak: false, label: '5. Stunde', durationMin: 50 },
      { periodNumber: 10, startTime: '12:35', endTime: '13:25', isBreak: true, label: 'Mittagspause', durationMin: 50 },
      { periodNumber: 11, startTime: '13:25', endTime: '14:15', isBreak: false, label: '6. Stunde', durationMin: 50 },
      { periodNumber: 12, startTime: '14:15', endTime: '14:20', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 13, startTime: '14:20', endTime: '15:10', isBreak: false, label: '7. Stunde', durationMin: 50 },
      { periodNumber: 14, startTime: '15:10', endTime: '15:15', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 15, startTime: '15:15', endTime: '16:05', isBreak: false, label: '8. Stunde', durationMin: 50 },
    ],
    defaultSchoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  },
  {
    schoolType: 'MS',
    displayName: 'Mittelschule (Standard 50min)',
    periods: [
      { periodNumber: 1, startTime: '07:55', endTime: '08:45', isBreak: false, label: '1. Stunde', durationMin: 50 },
      { periodNumber: 2, startTime: '08:45', endTime: '08:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 3, startTime: '08:50', endTime: '09:40', isBreak: false, label: '2. Stunde', durationMin: 50 },
      { periodNumber: 4, startTime: '09:40', endTime: '09:55', isBreak: true, label: 'Grosse Pause', durationMin: 15 },
      { periodNumber: 5, startTime: '09:55', endTime: '10:45', isBreak: false, label: '3. Stunde', durationMin: 50 },
      { periodNumber: 6, startTime: '10:45', endTime: '10:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 7, startTime: '10:50', endTime: '11:40', isBreak: false, label: '4. Stunde', durationMin: 50 },
      { periodNumber: 8, startTime: '11:40', endTime: '11:45', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 9, startTime: '11:45', endTime: '12:35', isBreak: false, label: '5. Stunde', durationMin: 50 },
      { periodNumber: 10, startTime: '12:35', endTime: '13:25', isBreak: true, label: 'Mittagspause', durationMin: 50 },
      { periodNumber: 11, startTime: '13:25', endTime: '14:15', isBreak: false, label: '6. Stunde', durationMin: 50 },
    ],
    defaultSchoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  },
  {
    schoolType: 'VS',
    displayName: 'Volksschule (Standard 50min)',
    periods: [
      { periodNumber: 1, startTime: '08:00', endTime: '08:50', isBreak: false, label: '1. Stunde', durationMin: 50 },
      { periodNumber: 2, startTime: '08:50', endTime: '09:00', isBreak: true, label: 'Pause', durationMin: 10 },
      { periodNumber: 3, startTime: '09:00', endTime: '09:50', isBreak: false, label: '2. Stunde', durationMin: 50 },
      { periodNumber: 4, startTime: '09:50', endTime: '10:10', isBreak: true, label: 'Grosse Pause', durationMin: 20 },
      { periodNumber: 5, startTime: '10:10', endTime: '11:00', isBreak: false, label: '3. Stunde', durationMin: 50 },
      { periodNumber: 6, startTime: '11:00', endTime: '11:10', isBreak: true, label: 'Pause', durationMin: 10 },
      { periodNumber: 7, startTime: '11:10', endTime: '12:00', isBreak: false, label: '4. Stunde', durationMin: 50 },
      { periodNumber: 8, startTime: '12:00', endTime: '12:50', isBreak: true, label: 'Mittagspause', durationMin: 50 },
      { periodNumber: 9, startTime: '12:50', endTime: '13:40', isBreak: false, label: '5. Stunde', durationMin: 50 },
    ],
    defaultSchoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  },
  {
    schoolType: 'AHS_OBER',
    displayName: 'AHS Oberstufe (Standard 50min)',
    periods: [
      { periodNumber: 1, startTime: '07:55', endTime: '08:45', isBreak: false, label: '1. Stunde', durationMin: 50 },
      { periodNumber: 2, startTime: '08:45', endTime: '08:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 3, startTime: '08:50', endTime: '09:40', isBreak: false, label: '2. Stunde', durationMin: 50 },
      { periodNumber: 4, startTime: '09:40', endTime: '09:55', isBreak: true, label: 'Grosse Pause', durationMin: 15 },
      { periodNumber: 5, startTime: '09:55', endTime: '10:45', isBreak: false, label: '3. Stunde', durationMin: 50 },
      { periodNumber: 6, startTime: '10:45', endTime: '10:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 7, startTime: '10:50', endTime: '11:40', isBreak: false, label: '4. Stunde', durationMin: 50 },
      { periodNumber: 8, startTime: '11:40', endTime: '11:45', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 9, startTime: '11:45', endTime: '12:35', isBreak: false, label: '5. Stunde', durationMin: 50 },
      { periodNumber: 10, startTime: '12:35', endTime: '13:25', isBreak: true, label: 'Mittagspause', durationMin: 50 },
      { periodNumber: 11, startTime: '13:25', endTime: '14:15', isBreak: false, label: '6. Stunde', durationMin: 50 },
      { periodNumber: 12, startTime: '14:15', endTime: '14:20', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 13, startTime: '14:20', endTime: '15:10', isBreak: false, label: '7. Stunde', durationMin: 50 },
      { periodNumber: 14, startTime: '15:10', endTime: '15:15', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 15, startTime: '15:15', endTime: '16:05', isBreak: false, label: '8. Stunde', durationMin: 50 },
      { periodNumber: 16, startTime: '16:05', endTime: '16:10', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 17, startTime: '16:10', endTime: '17:00', isBreak: false, label: '9. Stunde', durationMin: 50 },
    ],
    defaultSchoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  },
  {
    schoolType: 'BHS',
    displayName: 'BHS (Standard 50min, Mo-Fr mit Samstag optional)',
    periods: [
      { periodNumber: 1, startTime: '07:55', endTime: '08:45', isBreak: false, label: '1. Stunde', durationMin: 50 },
      { periodNumber: 2, startTime: '08:45', endTime: '08:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 3, startTime: '08:50', endTime: '09:40', isBreak: false, label: '2. Stunde', durationMin: 50 },
      { periodNumber: 4, startTime: '09:40', endTime: '09:55', isBreak: true, label: 'Grosse Pause', durationMin: 15 },
      { periodNumber: 5, startTime: '09:55', endTime: '10:45', isBreak: false, label: '3. Stunde', durationMin: 50 },
      { periodNumber: 6, startTime: '10:45', endTime: '10:50', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 7, startTime: '10:50', endTime: '11:40', isBreak: false, label: '4. Stunde', durationMin: 50 },
      { periodNumber: 8, startTime: '11:40', endTime: '11:45', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 9, startTime: '11:45', endTime: '12:35', isBreak: false, label: '5. Stunde', durationMin: 50 },
      { periodNumber: 10, startTime: '12:35', endTime: '13:25', isBreak: true, label: 'Mittagspause', durationMin: 50 },
      { periodNumber: 11, startTime: '13:25', endTime: '14:15', isBreak: false, label: '6. Stunde', durationMin: 50 },
      { periodNumber: 12, startTime: '14:15', endTime: '14:20', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 13, startTime: '14:20', endTime: '15:10', isBreak: false, label: '7. Stunde', durationMin: 50 },
      { periodNumber: 14, startTime: '15:10', endTime: '15:15', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 15, startTime: '15:15', endTime: '16:05', isBreak: false, label: '8. Stunde', durationMin: 50 },
      { periodNumber: 16, startTime: '16:05', endTime: '16:10', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 17, startTime: '16:10', endTime: '17:00', isBreak: false, label: '9. Stunde', durationMin: 50 },
      { periodNumber: 18, startTime: '17:00', endTime: '17:05', isBreak: true, label: 'Pause', durationMin: 5 },
      { periodNumber: 19, startTime: '17:05', endTime: '17:55', isBreak: false, label: '10. Stunde', durationMin: 50 },
    ],
    defaultSchoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  },
];

export function getTemplateBySchoolType(schoolType: string): TimeGridTemplate | undefined {
  return AUSTRIAN_SCHOOL_TEMPLATES.find((t) => t.schoolType === schoolType);
}
