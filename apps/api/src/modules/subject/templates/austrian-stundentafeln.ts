export interface StundentafelTemplate {
  schoolType: string;
  yearLevel: number;
  displayName: string;
  subjects: Array<{
    name: string;
    shortName: string;
    subjectType: string;
    weeklyHours: number;
    lehrverpflichtungsgruppe: string;
  }>;
  totalWeeklyHours: number;
}

/**
 * Austrian Stundentafel (curriculum hour allocation) templates based on
 * the Austrian Lehrplan for AHS Unterstufe and Mittelschule.
 *
 * Lehrverpflichtungsgruppen (LVG) determine teacher workload weighting:
 *   I   = Hauptfaecher (D, E, M, Fremdsprachen)
 *   II  = Naturwissenschaften (M, BU, PH, CH)
 *   III = Nebenfaecher (GSP, GWB, REL, DGB, BO)
 *   IV  = Technisches/Textiles Werken
 *   IVa = Musisch-kreativ + Sport (ME, KG, BSP)
 *   V   = Spezialfaecher
 *   Va  = Hauswirtschaft
 */
export const AUSTRIAN_STUNDENTAFELN: StundentafelTemplate[] = [
  // ===== AHS Unterstufe (AHS_UNTER) =====
  {
    schoolType: 'AHS_UNTER',
    yearLevel: 1,
    displayName: 'AHS Unterstufe 1. Klasse',
    totalWeeklyHours: 31,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
  },
  {
    schoolType: 'AHS_UNTER',
    yearLevel: 2,
    displayName: 'AHS Unterstufe 2. Klasse',
    totalWeeklyHours: 32,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Physik', shortName: 'PH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
  },
  {
    schoolType: 'AHS_UNTER',
    yearLevel: 3,
    displayName: 'AHS Unterstufe 3. Klasse',
    totalWeeklyHours: 31,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Physik', shortName: 'PH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Chemie', shortName: 'CH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
  },
  {
    schoolType: 'AHS_UNTER',
    yearLevel: 4,
    displayName: 'AHS Unterstufe 4. Klasse',
    totalWeeklyHours: 32,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Zweite Fremdsprache', shortName: 'L/F', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'I' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Physik', shortName: 'PH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Chemie', shortName: 'CH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
    ],
  },

  // ===== Mittelschule (MS) =====
  {
    schoolType: 'MS',
    yearLevel: 1,
    displayName: 'Mittelschule 1. Klasse',
    totalWeeklyHours: 30,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
    ],
  },
  {
    schoolType: 'MS',
    yearLevel: 2,
    displayName: 'Mittelschule 2. Klasse',
    totalWeeklyHours: 30,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'II' },
      { name: 'Physik', shortName: 'PH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
  },
  {
    schoolType: 'MS',
    yearLevel: 3,
    displayName: 'Mittelschule 3. Klasse',
    totalWeeklyHours: 31,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Physik', shortName: 'PH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Chemie', shortName: 'CH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Technik und Design', shortName: 'TXD', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IV' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
  },
  {
    schoolType: 'MS',
    yearLevel: 4,
    displayName: 'Mittelschule 4. Klasse',
    totalWeeklyHours: 32,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Englisch', shortName: 'E', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
      { name: 'Geschichte und Politische Bildung', shortName: 'GSP', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Geographie und wirtschaftliche Bildung', shortName: 'GWB', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Biologie und Umweltbildung', shortName: 'BU', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Physik', shortName: 'PH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Chemie', shortName: 'CH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'II' },
      { name: 'Ernaehrung und Haushalt', shortName: 'EH', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'Va' },
      { name: 'Musikerziehung', shortName: 'ME', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Kunst und Gestaltung', shortName: 'KG', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Bewegung und Sport', shortName: 'BSP', subjectType: 'PFLICHT', weeklyHours: 3, lehrverpflichtungsgruppe: 'IVa' },
      { name: 'Religion', shortName: 'REL', subjectType: 'PFLICHT', weeklyHours: 2, lehrverpflichtungsgruppe: 'III' },
      { name: 'Berufsorientierung', shortName: 'BO', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
      { name: 'Digitale Grundbildung', shortName: 'DGB', subjectType: 'PFLICHT', weeklyHours: 1, lehrverpflichtungsgruppe: 'III' },
    ],
  },
];
