package at.schoolflow.solver.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import ai.timefold.solver.core.api.domain.entity.PlanningEntity;
import ai.timefold.solver.core.api.domain.lookup.PlanningId;
import ai.timefold.solver.core.api.domain.variable.PlanningVariable;

/**
 * A lesson that needs to be scheduled in the timetable (planning entity).
 * The solver assigns a timeslot and room to each lesson.
 *
 * Problem facts (set by NestJS, not changed by solver):
 * - subjectId, subjectName, teacherId, teacherName, classId, className
 * - groupId, studentCount, preferDoublePeriod, requiredRoomType, requiredEquipment
 * - homeRoomId, weekType
 *
 * Planning variables (assigned by solver):
 * - timeslot (from timeslotRange)
 * - room (from roomRange)
 */
@PlanningEntity
public class Lesson {

    @PlanningId
    private String id;

    // Problem facts: identifiers from ClassSubject + TeacherSubject
    private String subjectId;
    private String subjectName;
    private String teacherId;
    private String teacherName;
    private String classId;   // SchoolClass ID
    private String className;
    private String groupId;   // null if whole-class lesson
    private int studentCount;

    // Scheduling metadata
    private boolean preferDoublePeriod; // D-05
    private String requiredRoomType;    // D-14: "Turnsaal", "EDV-Raum", etc. (nullable)
    private List<String> requiredEquipment; // D-12
    private String homeRoomId;          // D-13: preferred room for this class (nullable)
    private String weekType;            // D-07: "A", "B", or "BOTH"

    // Planning variables (solver assigns these)
    @PlanningVariable
    private SolverTimeslot timeslot;

    @PlanningVariable
    private SolverRoom room;

    // No-arg constructor required by Timefold
    public Lesson() {
        this.requiredEquipment = new ArrayList<>();
    }

    // Full constructor for test convenience
    public Lesson(String id, String subjectId, String subjectName,
                  String teacherId, String teacherName,
                  String classId, String className,
                  String groupId, int studentCount,
                  boolean preferDoublePeriod, String requiredRoomType,
                  List<String> requiredEquipment, String homeRoomId,
                  String weekType) {
        this.id = id;
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.teacherId = teacherId;
        this.teacherName = teacherName;
        this.classId = classId;
        this.className = className;
        this.groupId = groupId;
        this.studentCount = studentCount;
        this.preferDoublePeriod = preferDoublePeriod;
        this.requiredRoomType = requiredRoomType;
        this.requiredEquipment = requiredEquipment != null ? requiredEquipment : new ArrayList<>();
        this.homeRoomId = homeRoomId;
        this.weekType = weekType;
    }

    // Convenience constructor for simple test cases
    public Lesson(String id, String subjectName, String teacherId, String classId) {
        this();
        this.id = id;
        this.subjectId = "sub-" + subjectName;
        this.subjectName = subjectName;
        this.teacherId = teacherId;
        this.teacherName = "Teacher " + teacherId;
        this.classId = classId;
        this.className = "Class " + classId;
        this.weekType = "BOTH";
    }

    // Getters

    public String getId() {
        return id;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public String getSubjectName() {
        return subjectName;
    }

    public String getTeacherId() {
        return teacherId;
    }

    public String getTeacherName() {
        return teacherName;
    }

    public String getClassId() {
        return classId;
    }

    public String getClassName() {
        return className;
    }

    public String getGroupId() {
        return groupId;
    }

    public int getStudentCount() {
        return studentCount;
    }

    public boolean isPreferDoublePeriod() {
        return preferDoublePeriod;
    }

    public String getRequiredRoomType() {
        return requiredRoomType;
    }

    public List<String> getRequiredEquipment() {
        return requiredEquipment;
    }

    public String getHomeRoomId() {
        return homeRoomId;
    }

    public String getWeekType() {
        return weekType;
    }

    public SolverTimeslot getTimeslot() {
        return timeslot;
    }

    public SolverRoom getRoom() {
        return room;
    }

    // Setters

    public void setId(String id) {
        this.id = id;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public void setSubjectName(String subjectName) {
        this.subjectName = subjectName;
    }

    public void setTeacherId(String teacherId) {
        this.teacherId = teacherId;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public void setClassId(String classId) {
        this.classId = classId;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public void setStudentCount(int studentCount) {
        this.studentCount = studentCount;
    }

    public void setPreferDoublePeriod(boolean preferDoublePeriod) {
        this.preferDoublePeriod = preferDoublePeriod;
    }

    public void setRequiredRoomType(String requiredRoomType) {
        this.requiredRoomType = requiredRoomType;
    }

    public void setRequiredEquipment(List<String> requiredEquipment) {
        this.requiredEquipment = requiredEquipment;
    }

    public void setHomeRoomId(String homeRoomId) {
        this.homeRoomId = homeRoomId;
    }

    public void setWeekType(String weekType) {
        this.weekType = weekType;
    }

    public void setTimeslot(SolverTimeslot timeslot) {
        this.timeslot = timeslot;
    }

    public void setRoom(SolverRoom room) {
        this.room = room;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Lesson lesson = (Lesson) o;
        return Objects.equals(id, lesson.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return subjectName + " (" + teacherName + ", " + className + ")"
                + " @ " + timeslot + " in " + room;
    }
}
