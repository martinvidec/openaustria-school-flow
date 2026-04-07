import { describe, it, expect } from 'vitest';
import { parseUntisXml } from '../parsers/untis-xml.parser';
import {
  parseUntisTeachersDif,
  parseUntisClassesDif,
  parseUntisRoomsDif,
  parseUntisLessonsDif,
  detectUntisFormat,
} from '../parsers/untis-dif.parser';

describe('UntisParser', () => {
  // IMPORT-01: Untis XML parsing
  describe('IMPORT-01: Untis XML parsing', () => {
    it('parses teachers from Untis XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <teachers>
    <teacher>
      <shortname>MUL</shortname>
      <surname>Mueller</surname>
      <firstname>Maria</firstname>
      <title>Mag.</title>
    </teacher>
    <teacher>
      <shortname>SCH</shortname>
      <surname>Schmidt</surname>
      <firstname>Hans</firstname>
      <title>Dr.</title>
    </teacher>
  </teachers>
</document>`;

      const result = parseUntisXml(xml);
      expect(result.teachers).toHaveLength(2);
      expect(result.teachers[0]).toEqual({
        shortName: 'MUL',
        lastName: 'Mueller',
        firstName: 'Maria',
        title: 'Mag.',
      });
      expect(result.teachers[1]).toEqual({
        shortName: 'SCH',
        lastName: 'Schmidt',
        firstName: 'Hans',
        title: 'Dr.',
      });
    });

    it('parses classes from Untis XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <classes>
    <class>
      <shortname>1A</shortname>
      <longname>1A Klasse</longname>
      <level>1</level>
    </class>
    <class>
      <shortname>2B</shortname>
      <longname>2B Klasse</longname>
      <level>2</level>
    </class>
  </classes>
</document>`;

      const result = parseUntisXml(xml);
      expect(result.classes).toHaveLength(2);
      expect(result.classes[0]).toEqual({
        name: '1A',
        longName: '1A Klasse',
        level: 1,
      });
    });

    it('parses rooms from Untis XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <rooms>
    <room>
      <shortname>101</shortname>
      <longname>Raum 101</longname>
      <capacity>30</capacity>
    </room>
  </rooms>
</document>`;

      const result = parseUntisXml(xml);
      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0]).toEqual({
        name: '101',
        longName: 'Raum 101',
        capacity: 30,
      });
    });

    it('parses lessons from Untis XML', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <lessons>
    <lesson>
      <lesson_number>1</lesson_number>
      <subject>MAT</subject>
      <teacher>MUL</teacher>
      <classes>1A~2B</classes>
      <room>101</room>
      <periods_per_week>3</periods_per_week>
    </lesson>
  </lessons>
</document>`;

      const result = parseUntisXml(xml);
      expect(result.lessons).toHaveLength(1);
      expect(result.lessons[0]).toEqual({
        lessonNumber: 1,
        subjectShortName: 'MAT',
        teacherShortName: 'MUL',
        classNames: ['1A', '2B'],
        roomName: '101',
        periodsPerWeek: 3,
      });
    });

    it('handles missing optional fields gracefully', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <teachers>
    <teacher>
      <shortname>MUL</shortname>
    </teacher>
  </teachers>
  <classes>
    <class>
      <shortname>1A</shortname>
    </class>
  </classes>
  <rooms>
    <room>
      <shortname>101</shortname>
    </room>
  </rooms>
  <lessons>
    <lesson>
      <lesson_number>1</lesson_number>
    </lesson>
  </lessons>
</document>`;

      const result = parseUntisXml(xml);
      expect(result.teachers[0]).toEqual({
        shortName: 'MUL',
        lastName: '',
        firstName: '',
        title: '',
      });
      expect(result.classes[0]).toEqual({
        name: '1A',
        longName: '',
        level: 0,
      });
      expect(result.rooms[0]).toEqual({
        name: '101',
        longName: '',
        capacity: 0,
      });
      expect(result.lessons[0]).toEqual({
        lessonNumber: 1,
        subjectShortName: '',
        teacherShortName: '',
        classNames: [],
        roomName: '',
        periodsPerWeek: 0,
      });
    });
  });

  // IMPORT-01: Untis DIF parsing
  describe('IMPORT-01: Untis DIF parsing', () => {
    it('parses GPU004 teachers DIF', () => {
      const content = `MUL;Mueller;Maria;Mag.
SCH;Schmidt;Hans;Dr.`;

      const result = parseUntisTeachersDif(content);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        shortName: 'MUL',
        lastName: 'Mueller',
        firstName: 'Maria',
        title: 'Mag.',
      });
      expect(result[1]).toEqual({
        shortName: 'SCH',
        lastName: 'Schmidt',
        firstName: 'Hans',
        title: 'Dr.',
      });
    });

    it('parses GPU003 classes DIF', () => {
      const content = `1A;1A Klasse;1
2B;2B Klasse;2`;

      const result = parseUntisClassesDif(content);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: '1A',
        longName: '1A Klasse',
        level: 1,
      });
    });

    it('parses GPU005 rooms DIF', () => {
      const content = `101;Raum 101;30
102;Raum 102;25`;

      const result = parseUntisRoomsDif(content);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: '101',
        longName: 'Raum 101',
        capacity: 30,
      });
    });

    it('parses GPU002 lessons DIF', () => {
      const content = `1;MAT;MUL;1A~2B;101;3
2;DEU;SCH;1A;102;4`;

      const result = parseUntisLessonsDif(content);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        lessonNumber: 1,
        subjectShortName: 'MAT',
        teacherShortName: 'MUL',
        classNames: ['1A', '2B'],
        roomName: '101',
        periodsPerWeek: 3,
      });
    });

    it('auto-detects delimiter in DIF files', () => {
      // Tab-separated
      const content = `MUL\tMueller\tMaria\tMag.`;
      const result = parseUntisTeachersDif(content);
      expect(result).toHaveLength(1);
      expect(result[0].shortName).toBe('MUL');
    });

    it('ignores extra trailing fields', () => {
      const content = `MUL;Mueller;Maria;Mag.;ExtraField1;ExtraField2`;
      const result = parseUntisTeachersDif(content);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        shortName: 'MUL',
        lastName: 'Mueller',
        firstName: 'Maria',
        title: 'Mag.',
      });
    });
  });

  describe('detectUntisFormat', () => {
    it('detects XML format from declaration', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>\n<document></document>`;
      expect(detectUntisFormat(content)).toBe('xml');
    });

    it('detects DIF format from semicolons', () => {
      const content = `MUL;Mueller;Maria;Mag.\nSCH;Schmidt;Hans;Dr.`;
      expect(detectUntisFormat(content)).toBe('dif');
    });
  });
});
