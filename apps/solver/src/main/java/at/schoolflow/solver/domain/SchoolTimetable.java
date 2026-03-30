package at.schoolflow.solver.domain;

import java.util.ArrayList;
import java.util.List;

import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty;
import ai.timefold.solver.core.api.domain.solution.PlanningScore;
import ai.timefold.solver.core.api.domain.solution.PlanningSolution;
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty;
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider;
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;

/**
 * The planning solution representing a complete school timetable problem.
 * Contains all lessons (planning entities), timeslots and rooms (problem facts),
 * and teacher availability constraints.
 *
 * NOTE: ConstraintWeightOverrides will be added in Plan 04 for soft constraint tuning.
 */
@PlanningSolution
public class SchoolTimetable {

    @PlanningEntityCollectionProperty
    private List<Lesson> lessons;

    @ProblemFactCollectionProperty
    @ValueRangeProvider
    private List<SolverTimeslot> timeslots;

    @ProblemFactCollectionProperty
    @ValueRangeProvider
    private List<SolverRoom> rooms;

    @ProblemFactCollectionProperty
    private List<TeacherAvailability> blockedSlots;

    @PlanningScore
    private HardSoftScore score;

    // No-arg constructor required by Timefold
    public SchoolTimetable() {
        this.lessons = new ArrayList<>();
        this.timeslots = new ArrayList<>();
        this.rooms = new ArrayList<>();
        this.blockedSlots = new ArrayList<>();
    }

    public SchoolTimetable(List<Lesson> lessons,
                           List<SolverTimeslot> timeslots,
                           List<SolverRoom> rooms,
                           List<TeacherAvailability> blockedSlots) {
        this.lessons = lessons;
        this.timeslots = timeslots;
        this.rooms = rooms;
        this.blockedSlots = blockedSlots != null ? blockedSlots : new ArrayList<>();
    }

    // Getters

    public List<Lesson> getLessons() {
        return lessons;
    }

    public List<SolverTimeslot> getTimeslots() {
        return timeslots;
    }

    public List<SolverRoom> getRooms() {
        return rooms;
    }

    public List<TeacherAvailability> getBlockedSlots() {
        return blockedSlots;
    }

    public HardSoftScore getScore() {
        return score;
    }

    // Setters

    public void setLessons(List<Lesson> lessons) {
        this.lessons = lessons;
    }

    public void setTimeslots(List<SolverTimeslot> timeslots) {
        this.timeslots = timeslots;
    }

    public void setRooms(List<SolverRoom> rooms) {
        this.rooms = rooms;
    }

    public void setBlockedSlots(List<TeacherAvailability> blockedSlots) {
        this.blockedSlots = blockedSlots;
    }

    public void setScore(HardSoftScore score) {
        this.score = score;
    }
}
