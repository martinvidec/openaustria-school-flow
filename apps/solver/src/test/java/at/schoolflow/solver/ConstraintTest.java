package at.schoolflow.solver;

import java.util.List;

import jakarta.inject.Inject;

import ai.timefold.solver.test.api.score.stream.ConstraintVerifier;
import at.schoolflow.solver.constraints.TimetableConstraintProvider;
import at.schoolflow.solver.domain.ClassTimeslotRestriction;
import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.SchoolTimetable;
import at.schoolflow.solver.domain.SolverRoom;
import at.schoolflow.solver.domain.SolverTimeslot;
import at.schoolflow.solver.domain.SubjectTimePreference;
import at.schoolflow.solver.domain.TeacherAvailability;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Comprehensive constraint tests for all hard and soft constraints
 * using Timefold ConstraintVerifier for fast, deterministic unit tests.
 */
@QuarkusTest
class ConstraintTest {

    @Inject
    ConstraintVerifier<TimetableConstraintProvider, SchoolTimetable> constraintVerifier;

    // -- Test fixtures --

    private static SolverTimeslot timeslot(String id, String day, int period, String nextId) {
        return new SolverTimeslot(id, day, period, "08:00", "08:50", "BOTH", false, nextId);
    }

    private static SolverRoom room(String id, String type) {
        return new SolverRoom(id, "Room " + id, type, 30, List.of());
    }

    private static Lesson lesson(String id, String teacherId, String classId, String subjectId) {
        Lesson l = new Lesson();
        l.setId(id);
        l.setTeacherId(teacherId);
        l.setTeacherName("Teacher " + teacherId);
        l.setClassId(classId);
        l.setClassName("Class " + classId);
        l.setSubjectId(subjectId);
        l.setSubjectName("Subject " + subjectId);
        l.setWeekType("BOTH");
        return l;
    }

    // Reusable fixtures
    private static final SolverTimeslot MON_P1 = timeslot("mon-1", "MONDAY", 1, "mon-2");
    private static final SolverTimeslot MON_P2 = timeslot("mon-2", "MONDAY", 2, "mon-3");
    private static final SolverTimeslot MON_P3 = timeslot("mon-3", "MONDAY", 3, "mon-4");
    private static final SolverTimeslot MON_P4 = timeslot("mon-4", "MONDAY", 4, null);
    private static final SolverTimeslot MON_P7 = timeslot("mon-7", "MONDAY", 7, null);
    private static final SolverTimeslot TUE_P1 = timeslot("tue-1", "TUESDAY", 1, "tue-2");
    private static final SolverTimeslot TUE_P2 = timeslot("tue-2", "TUESDAY", 2, null);

    private static final SolverRoom ROOM_K1 = room("room-k1", "Klassenzimmer");
    private static final SolverRoom ROOM_K2 = room("room-k2", "Klassenzimmer");
    private static final SolverRoom ROOM_TURNSAAL = room("room-ts", "Turnsaal");
    private static final SolverRoom ROOM_EDV = room("room-edv", "EDV-Raum");

    // ===== HARD CONSTRAINT TESTS =====

    // -- Teacher Conflict --

    @Test
    void testTeacherConflict_penalized() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t1", "c2", "s2");
        l2.setTimeslot(MON_P1);
        l2.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherConflict)
                .given(l1, l2)
                .penalizesBy(1);
    }

    @Test
    void testTeacherConflict_noConflict() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c2", "s2");
        l2.setTimeslot(MON_P1);
        l2.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherConflict)
                .given(l1, l2)
                .penalizesBy(0);
    }

    // -- Room Conflict --

    @Test
    void testRoomConflict_penalized() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c2", "s2");
        l2.setTimeslot(MON_P1);
        l2.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomConflict)
                .given(l1, l2)
                .penalizesBy(1);
    }

    @Test
    void testRoomConflict_noConflict() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c2", "s2");
        l2.setTimeslot(MON_P1);
        l2.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomConflict)
                .given(l1, l2)
                .penalizesBy(0);
    }

    // -- Room Type Requirement --

    @Test
    void testRoomTypeRequirement_violated() {
        Lesson l1 = lesson("l1", "t1", "c1", "turnen");
        l1.setRequiredRoomType("Turnsaal");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1); // Klassenzimmer, not Turnsaal

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomTypeRequirement)
                .given(l1)
                .penalizesBy(1);
    }

    @Test
    void testRoomTypeRequirement_satisfied() {
        Lesson l1 = lesson("l1", "t1", "c1", "turnen");
        l1.setRequiredRoomType("Turnsaal");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_TURNSAAL);

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomTypeRequirement)
                .given(l1)
                .penalizesBy(0);
    }

    @Test
    void testRoomTypeRequirement_noRequirement() {
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        // requiredRoomType is null (default)
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::roomTypeRequirement)
                .given(l1)
                .penalizesBy(0);
    }

    // -- Teacher Availability --

    @Test
    void testTeacherAvailability_blocked() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        TeacherAvailability blocked = new TeacherAvailability("t1", "MONDAY", 1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherAvailability)
                .given(l1, blocked)
                .penalizesBy(1);
    }

    @Test
    void testTeacherAvailability_notBlocked() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(TUE_P1);
        l1.setRoom(ROOM_K1);

        TeacherAvailability blocked = new TeacherAvailability("t1", "MONDAY", 1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::teacherAvailability)
                .given(l1, blocked)
                .penalizesBy(0);
    }

    // -- Student Group Conflict --

    @Test
    void testStudentGroupConflict_wholeClassClash() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c1", "s2");
        l2.setTimeslot(MON_P1);
        l2.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(l1, l2)
                .penalizesBy(1);
    }

    @Test
    void testStudentGroupConflict_differentGroups() {
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setGroupId("group-a");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c1", "s2");
        l2.setGroupId("group-b");
        l2.setTimeslot(MON_P1);
        l2.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::studentGroupConflict)
                .given(l1, l2)
                .penalizesBy(0);
    }

    // ===== SOFT CONSTRAINT TESTS =====

    // -- No Same Subject Doubling --

    @Test
    void testNoSameSubjectDoubling_penalized() {
        // Two lessons of same subject on same day for same class, NOT consecutive (P1 and P3)
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t1", "c1", "mathe");
        l2.setTimeslot(MON_P3);
        l2.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::noSameSubjectDoubling)
                .given(l1, l2)
                .penalizesBy(1);
    }

    @Test
    void testNoSameSubjectDoubling_doublePeriod() {
        // Two consecutive lessons of same subject = double period = OK
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t1", "c1", "mathe");
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::noSameSubjectDoubling)
                .given(l1, l2)
                .penalizesBy(0);
    }

    // -- Prefer Double Period --

    @Test
    void testPreferDoublePeriod_satisfied() {
        // Double-period-preferred lesson has a consecutive partner
        Lesson l1 = lesson("l1", "t1", "c1", "turnen");
        l1.setPreferDoublePeriod(true);
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_TURNSAAL);

        Lesson l2 = lesson("l2", "t1", "c1", "turnen");
        l2.setPreferDoublePeriod(true);
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_TURNSAAL);

        constraintVerifier.verifyThat(TimetableConstraintProvider::preferDoublePeriod)
                .given(l1, l2)
                .penalizesBy(0);
    }

    @Test
    void testPreferDoublePeriod_violated() {
        // Double-period-preferred lesson with no consecutive partner
        Lesson l1 = lesson("l1", "t1", "c1", "turnen");
        l1.setPreferDoublePeriod(true);
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_TURNSAAL);

        // No other turnen lesson exists for the same class on the same day

        constraintVerifier.verifyThat(TimetableConstraintProvider::preferDoublePeriod)
                .given(l1)
                .penalizesBy(1);
    }

    // -- Max Lessons Per Day --

    @Test
    void testMaxLessonsPerDay_penalized() {
        // Create 9 lessons for the same class on Monday = 1 over the limit of 8
        Lesson[] lessons = new Lesson[9];
        SolverTimeslot[] slots = new SolverTimeslot[9];
        for (int i = 0; i < 9; i++) {
            slots[i] = timeslot("mon-" + (i + 1), "MONDAY", i + 1,
                    i < 8 ? "mon-" + (i + 2) : null);
            lessons[i] = lesson("l" + (i + 1), "t" + (i + 1), "c1", "s" + (i + 1));
            lessons[i].setTimeslot(slots[i]);
            lessons[i].setRoom(ROOM_K1);
        }

        constraintVerifier.verifyThat(TimetableConstraintProvider::maxLessonsPerDay)
                .given((Object[]) lessons)
                .penalizesBy(1); // 9 - 8 = 1
    }

    @Test
    void testMaxLessonsPerDay_notExceeded() {
        // 4 lessons on Monday = well under limit
        Lesson l1 = lesson("l1", "t1", "c1", "s1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c1", "s2");
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_K1);

        Lesson l3 = lesson("l3", "t3", "c1", "s3");
        l3.setTimeslot(MON_P3);
        l3.setRoom(ROOM_K1);

        Lesson l4 = lesson("l4", "t4", "c1", "s4");
        l4.setTimeslot(MON_P4);
        l4.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::maxLessonsPerDay)
                .given(l1, l2, l3, l4)
                .penalizesBy(0);
    }

    // -- Balanced Weekly Distribution --

    @Test
    void testBalancedWeeklyDistribution_balanced() {
        // 2 Mathe lessons for c1 spread across Monday and Tuesday = balanced
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t1", "c1", "mathe");
        l2.setTimeslot(TUE_P1);
        l2.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::balancedWeeklyDistribution)
                .given(l1, l2)
                .penalizesBy(0);
    }

    @Test
    void testBalancedWeeklyDistribution_unbalanced() {
        // 2 Mathe lessons for c1 both on Monday = unbalanced
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t1", "c1", "mathe");
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_K1);

        // loadBalance unfairness > 0 when all lessons on same day
        constraintVerifier.verifyThat(TimetableConstraintProvider::balancedWeeklyDistribution)
                .given(l1, l2)
                .penalizes();
    }

    // -- Home Room Preference --

    @Test
    void testHomeRoomPreference_matched() {
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setHomeRoomId("room-k1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::homeRoomPreference)
                .given(l1)
                .penalizesBy(0);
    }

    @Test
    void testHomeRoomPreference_notMatched() {
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setHomeRoomId("room-k1");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K2); // Not the home room

        constraintVerifier.verifyThat(TimetableConstraintProvider::homeRoomPreference)
                .given(l1)
                .penalizesBy(1);
    }

    @Test
    void testHomeRoomPreference_noHomeRoom() {
        // No home room set = no penalty regardless
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        // homeRoomId is null (default)
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::homeRoomPreference)
                .given(l1)
                .penalizesBy(0);
    }

    // -- Minimize Room Changes --

    @Test
    void testMinimizeRoomChanges_penalized() {
        // Two consecutive lessons for same class in different regular rooms
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c1", "deutsch");
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_K2);

        constraintVerifier.verifyThat(TimetableConstraintProvider::minimizeRoomChanges)
                .given(l1, l2)
                .penalizesBy(1);
    }

    @Test
    void testMinimizeRoomChanges_specialRoomExempt() {
        // Room change is OK when one lesson requires a special room
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c1", "turnen");
        l2.setRequiredRoomType("Turnsaal");
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_TURNSAAL);

        constraintVerifier.verifyThat(TimetableConstraintProvider::minimizeRoomChanges)
                .given(l1, l2)
                .penalizesBy(0);
    }

    @Test
    void testMinimizeRoomChanges_sameRoom() {
        // Same room = no penalty
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        Lesson l2 = lesson("l2", "t2", "c1", "deutsch");
        l2.setTimeslot(MON_P2);
        l2.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::minimizeRoomChanges)
                .given(l1, l2)
                .penalizesBy(0);
    }

    // -- Prefer Morning for Main Subjects --

    @Test
    void testPreferMorningForMainSubjects_penalized() {
        // Main subject (no special room required) in period 7 = penalized
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P7);
        l1.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::preferMorningForMainSubjects)
                .given(l1)
                .penalizesBy(1);
    }

    @Test
    void testPreferMorningForMainSubjects_morningOk() {
        // Main subject in period 1 = no penalty
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P1);
        l1.setRoom(ROOM_K1);

        constraintVerifier.verifyThat(TimetableConstraintProvider::preferMorningForMainSubjects)
                .given(l1)
                .penalizesBy(0);
    }

    @Test
    void testPreferMorningForMainSubjects_specialRoomExempt() {
        // Turnen in period 7 = not penalized (requires special room, not a main subject)
        Lesson l1 = lesson("l1", "t1", "c1", "turnen");
        l1.setRequiredRoomType("Turnsaal");
        l1.setTimeslot(MON_P7);
        l1.setRoom(ROOM_TURNSAAL);

        constraintVerifier.verifyThat(TimetableConstraintProvider::preferMorningForMainSubjects)
                .given(l1)
                .penalizesBy(0);
    }

    // ===== CLASS TIMESLOT RESTRICTION (NO_LESSONS_AFTER) TESTS =====

    @Test
    void testClassTimeslotRestriction_penalized() {
        // Class has maxPeriod=4, lesson is at period 7 = hard violation
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P7);
        l1.setRoom(ROOM_K1);

        ClassTimeslotRestriction restriction = new ClassTimeslotRestriction("c1", 4);

        constraintVerifier.verifyThat(TimetableConstraintProvider::classTimeslotRestriction)
                .given(l1, restriction)
                .penalizesBy(1);
    }

    @Test
    void testClassTimeslotRestriction_withinLimit() {
        // Class has maxPeriod=4, lesson is at period 3 = no violation
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P3);
        l1.setRoom(ROOM_K1);

        ClassTimeslotRestriction restriction = new ClassTimeslotRestriction("c1", 4);

        constraintVerifier.verifyThat(TimetableConstraintProvider::classTimeslotRestriction)
                .given(l1, restriction)
                .penalizesBy(0);
    }

    @Test
    void testClassTimeslotRestriction_differentClass() {
        // Restriction is for c2, lesson is for c1 = no violation
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P7);
        l1.setRoom(ROOM_K1);

        ClassTimeslotRestriction restriction = new ClassTimeslotRestriction("c2", 4);

        constraintVerifier.verifyThat(TimetableConstraintProvider::classTimeslotRestriction)
                .given(l1, restriction)
                .penalizesBy(0);
    }

    // ===== SUBJECT TIME PREFERENCE (SUBJECT_MORNING) TESTS =====

    @Test
    void testSubjectTimePreference_penalized() {
        // Subject mathe has latestPeriod=4, lesson is at period 7 = soft penalty
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P7);
        l1.setRoom(ROOM_K1);

        SubjectTimePreference pref = new SubjectTimePreference("mathe", 4);

        constraintVerifier.verifyThat(TimetableConstraintProvider::subjectTimePreference)
                .given(l1, pref)
                .penalizesBy(1);
    }

    @Test
    void testSubjectTimePreference_withinLimit() {
        // Subject mathe has latestPeriod=4, lesson is at period 3 = no penalty
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P3);
        l1.setRoom(ROOM_K1);

        SubjectTimePreference pref = new SubjectTimePreference("mathe", 4);

        constraintVerifier.verifyThat(TimetableConstraintProvider::subjectTimePreference)
                .given(l1, pref)
                .penalizesBy(0);
    }

    @Test
    void testSubjectTimePreference_differentSubject() {
        // Preference is for deutsch, lesson is for mathe = no penalty
        Lesson l1 = lesson("l1", "t1", "c1", "mathe");
        l1.setTimeslot(MON_P7);
        l1.setRoom(ROOM_K1);

        SubjectTimePreference pref = new SubjectTimePreference("deutsch", 4);

        constraintVerifier.verifyThat(TimetableConstraintProvider::subjectTimePreference)
                .given(l1, pref)
                .penalizesBy(0);
    }

    // ===== A/B WEEK COMPATIBILITY TESTS =====

    @Test
    void testWeekCompatibility_bothLessonAnySlot() {
        Lesson l = lesson("l1", "t1", "c1", "s1");
        l.setWeekType("BOTH");

        SolverTimeslot slotA = timeslot("ts-a", "MONDAY", 1, null);
        slotA.setWeekType("A");
        SolverTimeslot slotB = timeslot("ts-b", "MONDAY", 1, null);
        slotB.setWeekType("B");
        SolverTimeslot slotBoth = timeslot("ts-both", "MONDAY", 1, null);
        slotBoth.setWeekType("BOTH");

        assertTrue(l.isWeekCompatible(slotA));
        assertTrue(l.isWeekCompatible(slotB));
        assertTrue(l.isWeekCompatible(slotBoth));
    }

    @Test
    void testWeekCompatibility_weekALessonRestricted() {
        Lesson l = lesson("l1", "t1", "c1", "s1");
        l.setWeekType("A");

        SolverTimeslot slotA = timeslot("ts-a", "MONDAY", 1, null);
        slotA.setWeekType("A");
        SolverTimeslot slotB = timeslot("ts-b", "MONDAY", 1, null);
        slotB.setWeekType("B");
        SolverTimeslot slotBoth = timeslot("ts-both", "MONDAY", 1, null);
        slotBoth.setWeekType("BOTH");

        assertTrue(l.isWeekCompatible(slotA));
        assertFalse(l.isWeekCompatible(slotB));
        assertTrue(l.isWeekCompatible(slotBoth));
    }

    @Test
    void testWeekCompatibility_weekBLessonRestricted() {
        Lesson l = lesson("l1", "t1", "c1", "s1");
        l.setWeekType("B");

        SolverTimeslot slotA = timeslot("ts-a", "MONDAY", 1, null);
        slotA.setWeekType("A");
        SolverTimeslot slotB = timeslot("ts-b", "MONDAY", 1, null);
        slotB.setWeekType("B");
        SolverTimeslot slotBoth = timeslot("ts-both", "MONDAY", 1, null);
        slotBoth.setWeekType("BOTH");

        assertFalse(l.isWeekCompatible(slotA));
        assertTrue(l.isWeekCompatible(slotB));
        assertTrue(l.isWeekCompatible(slotBoth));
    }
}
