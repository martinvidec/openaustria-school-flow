export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum PermissionSubject {
  ALL = 'all',
  SCHOOL = 'school',
  TIMETABLE = 'timetable',
  CLASSBOOK = 'classbook',
  GRADES = 'grades',
  STUDENT = 'student',
  TEACHER = 'teacher',
  USER = 'user',
  AUDIT = 'audit',
  PERMISSION = 'permission',
}
