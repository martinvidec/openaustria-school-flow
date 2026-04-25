package at.schoolflow.solver.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import ai.timefold.solver.core.api.domain.constraintweight.ConstraintConfigurationProvider;
import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty;
import ai.timefold.solver.core.api.domain.solution.PlanningScore;
import ai.timefold.solver.core.api.domain.solution.PlanningSolution;
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty;
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider;
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;

/**
 * The planning solution representing a complete school timetable problem.
 * Contains all lessons (planning entities), timeslots and rooms (problem facts),
 * teacher availability constraints, custom constraint template data, and
 * configurable constraint weights via TimetableConstraintConfiguration.
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

    @ProblemFactCollectionProperty
    private List<ClassTimeslotRestriction> classTimeslotRestrictions;

    @ProblemFactCollectionProperty
    private List<SubjectTimePreference> subjectTimePreferences;

    /**
     * Phase 14 D-12: SUBJECT_PREFERRED_SLOT preferences (admin-configured).
     * The matching constraint stream lives in TimetableConstraintProvider
     * (subjectPreferredSlot) and the configurable weight is registered in
     * TimetableConstraintConfiguration as @ConstraintWeight("Subject preferred slot").
     */
    @ProblemFactCollectionProperty
    private List<SubjectPreferredSlot> subjectPreferredSlots;

    @ConstraintConfigurationProvider
    private TimetableConstraintConfiguration constraintConfiguration;

    @PlanningScore
    private HardSoftScore score;

    // No-arg constructor required by Timefold
    public SchoolTimetable() {
        this.lessons = new ArrayList<>();
        this.timeslots = new ArrayList<>();
        this.rooms = new ArrayList<>();
        this.blockedSlots = new ArrayList<>();
        this.classTimeslotRestrictions = new ArrayList<>();
        this.subjectTimePreferences = new ArrayList<>();
        this.subjectPreferredSlots = new ArrayList<>();
        this.constraintConfiguration = new TimetableConstraintConfiguration();
    }

    public SchoolTimetable(List<Lesson> lessons,
                           List<SolverTimeslot> timeslots,
                           List<SolverRoom> rooms,
                           List<TeacherAvailability> blockedSlots) {
        this.lessons = lessons;
        this.timeslots = timeslots;
        this.rooms = rooms;
        this.blockedSlots = blockedSlots != null ? blockedSlots : new ArrayList<>();
        this.classTimeslotRestrictions = new ArrayList<>();
        this.subjectTimePreferences = new ArrayList<>();
        this.subjectPreferredSlots = new ArrayList<>();
        this.constraintConfiguration = new TimetableConstraintConfiguration();
    }

    public SchoolTimetable(List<Lesson> lessons,
                           List<SolverTimeslot> timeslots,
                           List<SolverRoom> rooms,
                           List<TeacherAvailability> blockedSlots,
                           List<ClassTimeslotRestriction> classTimeslotRestrictions,
                           List<SubjectTimePreference> subjectTimePreferences,
                           TimetableConstraintConfiguration constraintConfiguration) {
        this.lessons = lessons;
        this.timeslots = timeslots;
        this.rooms = rooms;
        this.blockedSlots = blockedSlots != null ? blockedSlots : new ArrayList<>();
        this.classTimeslotRestrictions = classTimeslotRestrictions != null ? classTimeslotRestrictions : new ArrayList<>();
        this.subjectTimePreferences = subjectTimePreferences != null ? subjectTimePreferences : new ArrayList<>();
        this.subjectPreferredSlots = new ArrayList<>();
        this.constraintConfiguration = constraintConfiguration != null ? constraintConfiguration : new TimetableConstraintConfiguration();
    }

    public SchoolTimetable(List<Lesson> lessons,
                           List<SolverTimeslot> timeslots,
                           List<SolverRoom> rooms,
                           List<TeacherAvailability> blockedSlots,
                           List<ClassTimeslotRestriction> classTimeslotRestrictions,
                           List<SubjectTimePreference> subjectTimePreferences,
                           List<SubjectPreferredSlot> subjectPreferredSlots,
                           TimetableConstraintConfiguration constraintConfiguration) {
        this.lessons = lessons;
        this.timeslots = timeslots;
        this.rooms = rooms;
        this.blockedSlots = blockedSlots != null ? blockedSlots : new ArrayList<>();
        this.classTimeslotRestrictions = classTimeslotRestrictions != null ? classTimeslotRestrictions : new ArrayList<>();
        this.subjectTimePreferences = subjectTimePreferences != null ? subjectTimePreferences : new ArrayList<>();
        this.subjectPreferredSlots = subjectPreferredSlots != null ? subjectPreferredSlots : new ArrayList<>();
        this.constraintConfiguration = constraintConfiguration != null ? constraintConfiguration : new TimetableConstraintConfiguration();
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

    public List<ClassTimeslotRestriction> getClassTimeslotRestrictions() {
        return classTimeslotRestrictions;
    }

    public List<SubjectTimePreference> getSubjectTimePreferences() {
        return subjectTimePreferences;
    }

    public List<SubjectPreferredSlot> getSubjectPreferredSlots() {
        return subjectPreferredSlots;
    }

    public TimetableConstraintConfiguration getConstraintConfiguration() {
        return constraintConfiguration;
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

    public void setClassTimeslotRestrictions(List<ClassTimeslotRestriction> classTimeslotRestrictions) {
        this.classTimeslotRestrictions = classTimeslotRestrictions;
    }

    public void setSubjectTimePreferences(List<SubjectTimePreference> subjectTimePreferences) {
        this.subjectTimePreferences = subjectTimePreferences;
    }

    public void setSubjectPreferredSlots(List<SubjectPreferredSlot> subjectPreferredSlots) {
        this.subjectPreferredSlots = subjectPreferredSlots;
    }

    public void setConstraintConfiguration(TimetableConstraintConfiguration constraintConfiguration) {
        this.constraintConfiguration = constraintConfiguration;
    }

    public void setScore(HardSoftScore score) {
        this.score = score;
    }

    /**
     * Convenience method to apply weight overrides from a map (e.g., from NestJS API).
     * Keys are constraint names, values are soft weight integers.
     * Only soft constraint weights can be overridden; hard constraints are not configurable.
     */
    public void applyWeightOverrides(Map<String, Integer> overrides) {
        if (overrides == null || overrides.isEmpty()) {
            return;
        }
        if (this.constraintConfiguration == null) {
            this.constraintConfiguration = new TimetableConstraintConfiguration();
        }
        this.constraintConfiguration.applyOverrides(overrides);
    }
}
