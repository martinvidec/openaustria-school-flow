export interface UntisTeacher {
  shortName: string;
  lastName: string;
  firstName: string;
  title: string;
}

export interface UntisClass {
  name: string;
  longName: string;
  level: number;
}

export interface UntisRoom {
  name: string;
  longName: string;
  capacity: number;
}

export interface UntisLesson {
  lessonNumber: number;
  subjectShortName: string;
  teacherShortName: string;
  classNames: string[];
  roomName: string;
  periodsPerWeek: number;
}

export interface UntisXmlData {
  teachers: UntisTeacher[];
  classes: UntisClass[];
  rooms: UntisRoom[];
  lessons: UntisLesson[];
}
