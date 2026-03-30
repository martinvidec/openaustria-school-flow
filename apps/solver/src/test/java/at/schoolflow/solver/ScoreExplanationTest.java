package at.schoolflow.solver;

import java.util.List;

import jakarta.inject.Inject;

import ai.timefold.solver.core.api.score.analysis.ScoreAnalysis;
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.core.api.solver.SolutionManager;
import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.SchoolTimetable;
import at.schoolflow.solver.domain.SolverRoom;
import at.schoolflow.solver.domain.SolverTimeslot;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests for ScoreAnalysis violation grouping (D-10, TIME-07).
 * Verifies that SolutionManager.analyze() correctly identifies and groups
 * constraint violations for the conflict explanation endpoint.
 */
@QuarkusTest
class ScoreExplanationTest {

    @Inject
    SolutionManager<SchoolTimetable, HardSoftScore> solutionManager;

    // -- Test fixtures --

    private static SolverTimeslot timeslot(String id, String day, int period, String nextId) {
        return new SolverTimeslot(id, day, period, "08:00", "08:50", "BOTH", false, nextId);
    }

    private static SolverRoom room(String id) {
        return new SolverRoom(id, "Room " + id, "KLASSENZIMMER", 30, List.of());
    }

    private static Lesson lesson(String id, String subjectName, String teacherId,
                                  String teacherName, String classId, String className) {
        return new Lesson(id, "sub-" + subjectName, subjectName,
                teacherId, teacherName, classId, className,
                null, 25, false, null, List.of(), null, "BOTH");
    }

    @Test
    void givenTeacherConflict_whenAnalyze_thenViolationReported() {
        // Two lessons with same teacher assigned to same timeslot = teacher conflict
        SolverTimeslot ts1 = timeslot("ts1", "MONDAY", 1, "ts2");
        SolverRoom room1 = room("r1");
        SolverRoom room2 = room("r2");

        Lesson l1 = lesson("l1", "Math", "t1", "Mueller", "c1", "1A");
        l1.setTimeslot(ts1);
        l1.setRoom(room1);

        Lesson l2 = lesson("l2", "German", "t1", "Mueller", "c2", "2A");
        l2.setTimeslot(ts1); // Same timeslot, same teacher = conflict
        l2.setRoom(room2);

        SchoolTimetable solution = new SchoolTimetable(
                List.of(l1, l2), List.of(ts1), List.of(room1, room2), List.of()
        );

        ScoreAnalysis<HardSoftScore> analysis = solutionManager.analyze(solution);

        assertNotNull(analysis);
        assertTrue(analysis.score().hardScore() < 0,
                "Hard score should be negative due to teacher conflict");

        // Verify the constraint breakdown includes "Teacher conflict"
        boolean hasTeacherConflict = analysis.constraintMap().entrySet().stream()
                .anyMatch(e -> e.getKey().constraintName().equals("Teacher conflict")
                        && e.getValue().matchCount() > 0);
        assertTrue(hasTeacherConflict,
                "ScoreAnalysis must identify 'Teacher conflict' constraint violation");
    }

    @Test
    void givenRoomDoubleBooking_whenAnalyze_thenViolationReported() {
        // Two lessons in same room at same timeslot = room conflict
        SolverTimeslot ts1 = timeslot("ts1", "MONDAY", 1, "ts2");
        SolverRoom room1 = room("r1");

        Lesson l1 = lesson("l1", "Math", "t1", "Mueller", "c1", "1A");
        l1.setTimeslot(ts1);
        l1.setRoom(room1);

        Lesson l2 = lesson("l2", "German", "t2", "Schmidt", "c2", "2A");
        l2.setTimeslot(ts1);
        l2.setRoom(room1); // Same room, same timeslot = conflict

        SchoolTimetable solution = new SchoolTimetable(
                List.of(l1, l2), List.of(ts1), List.of(room1), List.of()
        );

        ScoreAnalysis<HardSoftScore> analysis = solutionManager.analyze(solution);

        assertTrue(analysis.score().hardScore() < 0,
                "Hard score should be negative due to room conflict");

        boolean hasRoomConflict = analysis.constraintMap().entrySet().stream()
                .anyMatch(e -> e.getKey().constraintName().equals("Room conflict")
                        && e.getValue().matchCount() > 0);
        assertTrue(hasRoomConflict,
                "ScoreAnalysis must identify 'Room conflict' constraint violation");
    }

    @Test
    void givenFeasibleSolution_whenAnalyze_thenNoHardViolations() {
        // Two lessons with different teachers, different rooms, different timeslots
        SolverTimeslot ts1 = timeslot("ts1", "MONDAY", 1, "ts2");
        SolverTimeslot ts2 = timeslot("ts2", "MONDAY", 2, null);
        SolverRoom room1 = room("r1");

        Lesson l1 = lesson("l1", "Math", "t1", "Mueller", "c1", "1A");
        l1.setTimeslot(ts1);
        l1.setRoom(room1);

        Lesson l2 = lesson("l2", "German", "t2", "Schmidt", "c1", "1A");
        l2.setTimeslot(ts2);
        l2.setRoom(room1);

        SchoolTimetable solution = new SchoolTimetable(
                List.of(l1, l2), List.of(ts1, ts2), List.of(room1), List.of()
        );

        ScoreAnalysis<HardSoftScore> analysis = solutionManager.analyze(solution);

        assertEquals(0, analysis.score().hardScore(),
                "Feasible solution should have hard score = 0");
    }
}
