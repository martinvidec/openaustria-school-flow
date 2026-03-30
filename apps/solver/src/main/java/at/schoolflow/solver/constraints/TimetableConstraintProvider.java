package at.schoolflow.solver.constraints;

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.Constraint;
import ai.timefold.solver.core.api.score.stream.ConstraintCollectors;
import ai.timefold.solver.core.api.score.stream.ConstraintFactory;
import ai.timefold.solver.core.api.score.stream.ConstraintProvider;
import ai.timefold.solver.core.api.score.stream.Joiners;

import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.TeacherAvailability;

/**
 * Defines hard and soft constraints for the school timetable.
 *
 * Hard constraints (physical/logical — must never be violated):
 * 1. Teacher conflict: same teacher cannot teach two lessons at the same time
 * 2. Room conflict: same room cannot host two lessons at the same time
 * 3. Teacher availability: teacher cannot be scheduled during blocked timeslots
 * 4. Student group conflict: same class/group cannot have overlapping lessons
 * 5. Room type requirement: lesson requiring specific room type must be in matching room
 *
 * Soft constraints (pedagogical quality — optimized by solver):
 * 6. No same-subject doubling: penalize two non-consecutive lessons of same subject/class/day
 * 7. Balanced weekly distribution: spread subject lessons evenly across the week
 * 8. Max lessons per day: penalize excessive lessons (>8) per class per day
 * 9. Prefer double periods: reward consecutive scheduling for double-period-preferred subjects
 * 10. Home room preference: prefer scheduling classes in their home room
 * 11. Minimize room changes: penalize unnecessary room switches during the day
 * 12. Prefer morning for main subjects: main subjects penalized for afternoon scheduling
 */
public class TimetableConstraintProvider implements ConstraintProvider {

    @Override
    public Constraint[] defineConstraints(ConstraintFactory constraintFactory) {
        return new Constraint[] {
                // Hard constraints
                teacherConflict(constraintFactory),
                roomConflict(constraintFactory),
                teacherAvailability(constraintFactory),
                studentGroupConflict(constraintFactory),
                roomTypeRequirement(constraintFactory),
                // Soft constraints
                noSameSubjectDoubling(constraintFactory),
                balancedWeeklyDistribution(constraintFactory),
                maxLessonsPerDay(constraintFactory),
                preferDoublePeriod(constraintFactory),
                homeRoomPreference(constraintFactory),
                minimizeRoomChanges(constraintFactory),
                preferMorningForMainSubjects(constraintFactory),
        };
    }

    // ===== Hard Constraints =====

    /**
     * A teacher can only teach one lesson at a time.
     * Two lessons with the same teacher at the same timeslot = hard violation.
     */
    public Constraint teacherConflict(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getTimeslot),
                        Joiners.equal(Lesson::getTeacherId))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Teacher conflict");
    }

    /**
     * A room can only host one lesson at a time.
     * Two lessons in the same room at the same timeslot = hard violation.
     */
    public Constraint roomConflict(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getTimeslot),
                        Joiners.equal(Lesson::getRoom))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Room conflict");
    }

    /**
     * A teacher cannot be scheduled during their blocked timeslots.
     * TeacherAvailability records represent BLOCKED slots (from Phase 2 AvailabilityRule).
     */
    public Constraint teacherAvailability(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .join(TeacherAvailability.class,
                        Joiners.equal(Lesson::getTeacherId, TeacherAvailability::getTeacherId),
                        Joiners.equal(
                                lesson -> lesson.getTimeslot().getDayOfWeek(),
                                TeacherAvailability::getDayOfWeek),
                        Joiners.equal(
                                lesson -> lesson.getTimeslot().getPeriodNumber(),
                                TeacherAvailability::getPeriodNumber))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Teacher availability");
    }

    /**
     * Students in the same class cannot have overlapping lessons.
     *
     * Logic (D-02):
     * - Two whole-class lessons at same time = clash (all students overlap)
     * - Whole-class + group lesson at same time = clash (group students are in the class)
     * - Same group at same time = clash (same students)
     * - Different groups at same time = OK (disjoint student sets)
     */
    public Constraint studentGroupConflict(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getTimeslot),
                        Joiners.equal(Lesson::getClassId))
                .filter((l1, l2) ->
                        l1.getGroupId() == null
                                || l2.getGroupId() == null
                                || l1.getGroupId().equals(l2.getGroupId()))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Student group conflict");
    }

    /**
     * If a lesson requires a specific room type (e.g., Turnsaal for Turnen,
     * EDV-Raum for Informatik), the assigned room must match (D-14).
     * Lessons with null requiredRoomType can go in any room.
     */
    public Constraint roomTypeRequirement(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .filter(lesson -> lesson.getRequiredRoomType() != null)
                .filter(lesson -> !lesson.getRequiredRoomType().equals(lesson.getRoom().getRoomType()))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Room type requirement");
    }

    // ===== Soft Constraints =====

    /**
     * Penalize two non-consecutive lessons of the same subject on the same day
     * for the same class (TIME-02). Consecutive lessons (double periods) are OK.
     */
    public Constraint noSameSubjectDoubling(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getClassId),
                        Joiners.equal(Lesson::getSubjectId),
                        Joiners.equal(lesson -> lesson.getTimeslot().getDayOfWeek()))
                .filter((l1, l2) -> !areConsecutive(l1, l2))
                .penalize(HardSoftScore.ONE_SOFT)
                .asConstraint("No same subject doubling");
    }

    /**
     * Spread subject lessons evenly across the week (TIME-02).
     * Uses Timefold's loadBalance collector to penalize uneven distribution
     * of lessons per day for each class-subject combination.
     */
    public Constraint balancedWeeklyDistribution(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .groupBy(Lesson::getClassId, Lesson::getSubjectId,
                        ConstraintCollectors.loadBalance(
                                lesson -> lesson.getTimeslot().getDayOfWeek()))
                .penalize(HardSoftScore.ONE_SOFT,
                        (classId, subjectId, balance) -> balance.unfairness().intValue())
                .asConstraint("Balanced weekly distribution");
    }

    /**
     * Penalize each lesson beyond 8 per day for a class (TIME-02).
     * Represents excessive workload per day for students.
     */
    public Constraint maxLessonsPerDay(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .groupBy(Lesson::getClassId,
                        lesson -> lesson.getTimeslot().getDayOfWeek(),
                        ConstraintCollectors.count())
                .filter((classId, dayOfWeek, count) -> count > 8)
                .penalize(HardSoftScore.ONE_SOFT,
                        (classId, dayOfWeek, count) -> count - 8)
                .asConstraint("Max lessons per day");
    }

    /**
     * For lessons where preferDoublePeriod=true, penalize if the lesson
     * has no consecutive partner of the same subject+class on the same day (D-05, TIME-04).
     * This encourages the solver to schedule double periods for flagged subjects.
     */
    public Constraint preferDoublePeriod(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .filter(Lesson::isPreferDoublePeriod)
                .ifNotExists(Lesson.class,
                        Joiners.equal(Lesson::getSubjectId),
                        Joiners.equal(Lesson::getClassId),
                        Joiners.equal(l -> l.getTimeslot().getDayOfWeek()),
                        Joiners.filtering((l1, l2) ->
                                !l1.getId().equals(l2.getId()) && areConsecutive(l1, l2)))
                .penalize(HardSoftScore.ONE_SOFT)
                .asConstraint("Prefer double periods");
    }

    /**
     * Prefer scheduling a class in their home room (Stammklasse-Raum) (D-13).
     * If lesson.homeRoomId is set and the assigned room does not match, penalize soft.
     */
    public Constraint homeRoomPreference(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .filter(lesson -> lesson.getHomeRoomId() != null)
                .filter(lesson -> !lesson.getHomeRoomId().equals(lesson.getRoom().getId()))
                .penalize(HardSoftScore.ONE_SOFT)
                .asConstraint("Home room preference");
    }

    /**
     * Minimize unnecessary room changes during the day (D-15).
     * For each pair of consecutive lessons for the same class on the same day,
     * if they are in different rooms AND neither requires a special room type
     * (both could be in a regular Klassenzimmer), penalize the room change.
     */
    public Constraint minimizeRoomChanges(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getClassId),
                        Joiners.equal(lesson -> lesson.getTimeslot().getDayOfWeek()))
                .filter((l1, l2) -> areConsecutive(l1, l2))
                .filter((l1, l2) -> !l1.getRoom().getId().equals(l2.getRoom().getId()))
                .filter((l1, l2) ->
                        l1.getRequiredRoomType() == null && l2.getRequiredRoomType() == null)
                .penalize(HardSoftScore.ONE_SOFT)
                .asConstraint("Minimize room changes");
    }

    /**
     * Main subjects (those not requiring a special room type, i.e., typical
     * classroom subjects like Mathematik, Deutsch) are penalized for being
     * scheduled after period 6 (afternoon). This encourages scheduling demanding
     * subjects in the morning when students are more attentive.
     */
    public Constraint preferMorningForMainSubjects(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .filter(lesson -> lesson.getRequiredRoomType() == null)
                .filter(lesson -> lesson.getTimeslot().getPeriodNumber() > 6)
                .penalize(HardSoftScore.ONE_SOFT)
                .asConstraint("Prefer morning for main subjects");
    }

    // ===== Helper Methods =====

    /**
     * Checks whether two lessons are scheduled in consecutive timeslots.
     * Uses the nextTimeslotId field for O(1) adjacency checks.
     */
    private static boolean areConsecutive(Lesson l1, Lesson l2) {
        return (l1.getTimeslot().getNextTimeslotId() != null
                && l1.getTimeslot().getNextTimeslotId().equals(l2.getTimeslot().getId()))
                || (l2.getTimeslot().getNextTimeslotId() != null
                && l2.getTimeslot().getNextTimeslotId().equals(l1.getTimeslot().getId()));
    }
}
