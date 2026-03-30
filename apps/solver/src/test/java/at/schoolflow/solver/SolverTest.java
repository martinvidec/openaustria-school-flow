package at.schoolflow.solver;

import java.util.List;

import jakarta.inject.Inject;

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.test.api.score.stream.ConstraintVerifier;
import at.schoolflow.solver.constraints.TimetableConstraintProvider;
import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.SchoolTimetable;
import at.schoolflow.solver.domain.SolverRoom;
import at.schoolflow.solver.domain.SolverTimeslot;
import at.schoolflow.solver.domain.TeacherAvailability;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/**
 * Tests for the 4 hard constraints using Timefold ConstraintVerifier.
 * ConstraintVerifier provides fast, deterministic unit tests without running the full solver.
 */
@QuarkusTest
class SolverTest {

    @Inject
    ConstraintVerifier<TimetableConstraintProvider, SchoolTimetable> constraintVerifier;

    // -- Test fixtures --

    private static final SolverTimeslot MONDAY_P1 = new SolverTimeslot(
            "mon-1", "MONDAY", 1, "08:00", "08:50", "BOTH", false, "mon-2");
    private static final SolverTimeslot MONDAY_P2 = new SolverTimeslot(
            "mon-2", "MONDAY", 2, "08:55", "09:45", "BOTH", false, "mon-3");
    private static final SolverTimeslot TUESDAY_P1 = new SolverTimeslot(
            "tue-1", "TUESDAY", 1, "08:00", "08:50", "BOTH", false, "tue-2");
    private static final SolverTimeslot TUESDAY_P2 = new SolverTimeslot(
            "tue-2", "TUESDAY", 2, "08:55", "09:45", "BOTH", false, null);

    private static final SolverRoom ROOM_A = new SolverRoom(
            "room-a", "Room A", "Klassenzimmer", 30, List.of("Beamer"));
    private static final SolverRoom ROOM_B = new SolverRoom(
            "room-b", "Room B", "Klassenzimmer", 30, List.of("Smartboard"));

    // -- Teacher Conflict tests --

    @Test
    void givenSameTeacherSameTimeslot_whenScored_thenTeacherConflictPenalized() {
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-1", "class-2a");
        lesson2.setTimeslot(MONDAY_P1);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherConflict)
                .given(lesson1, lesson2)
                .penalizesBy(1);
    }

    @Test
    void givenSameTeacherDifferentTimeslot_whenScored_thenNoTeacherConflict() {
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-1", "class-2a");
        lesson2.setTimeslot(MONDAY_P2);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherConflict)
                .given(lesson1, lesson2)
                .penalizesBy(0);
    }

    // -- Room Conflict tests --

    @Test
    void givenSameRoomSameTimeslot_whenScored_thenRoomConflictPenalized() {
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-2", "class-2a");
        lesson2.setTimeslot(MONDAY_P1);
        lesson2.setRoom(ROOM_A);

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomConflict)
                .given(lesson1, lesson2)
                .penalizesBy(1);
    }

    @Test
    void givenSameRoomDifferentTimeslot_whenScored_thenNoRoomConflict() {
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-2", "class-2a");
        lesson2.setTimeslot(MONDAY_P2);
        lesson2.setRoom(ROOM_A);

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomConflict)
                .given(lesson1, lesson2)
                .penalizesBy(0);
    }

    // -- Teacher Availability tests --

    @Test
    void givenTeacherBlockedOnMonP1_whenLessonOnMonP1_thenAvailabilityPenalized() {
        Lesson lesson = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson.setTimeslot(MONDAY_P1);
        lesson.setRoom(ROOM_A);

        TeacherAvailability blocked = new TeacherAvailability("teacher-1", "MONDAY", 1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherAvailability)
                .given(lesson, blocked)
                .penalizesBy(1);
    }

    @Test
    void givenTeacherBlockedOnMonP1_whenLessonOnTueP1_thenNoAvailabilityPenalty() {
        Lesson lesson = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson.setTimeslot(TUESDAY_P1);
        lesson.setRoom(ROOM_A);

        TeacherAvailability blocked = new TeacherAvailability("teacher-1", "MONDAY", 1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherAvailability)
                .given(lesson, blocked)
                .penalizesBy(0);
    }

    @Test
    void givenDifferentTeacherBlocked_whenOtherTeacherScheduled_thenNoAvailabilityPenalty() {
        Lesson lesson = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson.setTimeslot(MONDAY_P1);
        lesson.setRoom(ROOM_A);

        TeacherAvailability blocked = new TeacherAvailability("teacher-2", "MONDAY", 1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherAvailability)
                .given(lesson, blocked)
                .penalizesBy(0);
    }

    // -- Student Group Conflict tests --

    @Test
    void givenTwoWholeClassLessonsSameTimeslot_whenScored_thenStudentGroupConflict() {
        // Two whole-class lessons (groupId = null) for same class at same time
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-2", "class-1a");
        lesson2.setTimeslot(MONDAY_P1);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(lesson1, lesson2)
                .penalizesBy(1);
    }

    @Test
    void givenWholeClassAndGroupLessonSameTimeslot_whenScored_thenStudentGroupConflict() {
        // Whole-class (null) + group lesson at same time = clash
        Lesson wholeClass = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        wholeClass.setTimeslot(MONDAY_P1);
        wholeClass.setRoom(ROOM_A);

        Lesson groupLesson = new Lesson("l2", "Werken", "teacher-2", "class-1a");
        groupLesson.setGroupId("group-a");
        groupLesson.setTimeslot(MONDAY_P1);
        groupLesson.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(wholeClass, groupLesson)
                .penalizesBy(1);
    }

    @Test
    void givenSameGroupSameTimeslot_whenScored_thenStudentGroupConflict() {
        // Same group at same time = clash
        Lesson lesson1 = new Lesson("l1", "Werken", "teacher-1", "class-1a");
        lesson1.setGroupId("group-a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Textiles Gestalten", "teacher-2", "class-1a");
        lesson2.setGroupId("group-a");
        lesson2.setTimeslot(MONDAY_P1);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(lesson1, lesson2)
                .penalizesBy(1);
    }

    @Test
    void givenDifferentGroupsSameTimeslot_whenScored_thenNoStudentGroupConflict() {
        // Different groups at same time = OK (disjoint student sets)
        Lesson lesson1 = new Lesson("l1", "Werken", "teacher-1", "class-1a");
        lesson1.setGroupId("group-a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Textiles Gestalten", "teacher-2", "class-1a");
        lesson2.setGroupId("group-b");
        lesson2.setTimeslot(MONDAY_P1);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(lesson1, lesson2)
                .penalizesBy(0);
    }

    @Test
    void givenDifferentClassesSameTimeslot_whenScored_thenNoStudentGroupConflict() {
        // Different classes at same timeslot = no conflict
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-2", "class-2a");
        lesson2.setTimeslot(MONDAY_P1);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(lesson1, lesson2)
                .penalizesBy(0);
    }

    // -- Full solution feasibility test --

    @Test
    void givenNoConflicts_whenAllConstraintsScored_thenZeroHardPenalty() {
        // 2 lessons with different teachers, different timeslots, different rooms = no violations
        Lesson lesson1 = new Lesson("l1", "Mathematik", "teacher-1", "class-1a");
        lesson1.setTimeslot(MONDAY_P1);
        lesson1.setRoom(ROOM_A);

        Lesson lesson2 = new Lesson("l2", "Deutsch", "teacher-2", "class-2a");
        lesson2.setTimeslot(MONDAY_P2);
        lesson2.setRoom(ROOM_B);

        constraintVerifier.verifyThat()
                .given(lesson1, lesson2)
                .scores(HardSoftScore.ZERO);
    }
}
