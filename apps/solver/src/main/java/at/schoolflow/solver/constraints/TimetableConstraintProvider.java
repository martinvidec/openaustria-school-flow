package at.schoolflow.solver.constraints;

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.Constraint;
import ai.timefold.solver.core.api.score.stream.ConstraintCollectors;
import ai.timefold.solver.core.api.score.stream.ConstraintFactory;
import ai.timefold.solver.core.api.score.stream.ConstraintProvider;
import ai.timefold.solver.core.api.score.stream.Joiners;

import at.schoolflow.solver.domain.ClassTimeslotRestriction;
import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.SubjectTimePreference;
import at.schoolflow.solver.domain.TeacherAvailability;

/**
 * Defines hard and soft constraints for the school timetable.
 *
 * Hard constraints (physical/logical -- must never be violated):
 * 1. Teacher conflict: same teacher cannot teach two lessons at the same time
 * 2. Room conflict: same room cannot host two lessons at the same time
 * 3. Teacher availability: teacher cannot be scheduled during blocked timeslots
 * 4. Student group conflict: same class/group cannot have overlapping lessons
 * 5. Room type requirement: lesson requiring specific room type must be in matching room
 * 6. Class timeslot restriction: class must not have lessons after maxPeriod (NO_LESSONS_AFTER)
 *
 * Soft constraints (pedagogical quality -- optimized by solver, weights configurable):
 * 7. No same-subject doubling: penalize two non-consecutive lessons of same subject/class/day
 * 8. Balanced weekly distribution: spread subject lessons evenly across the week
 * 9. Max lessons per day: penalize excessive lessons (>8) per class per day
 * 10. Prefer double periods: reward consecutive scheduling for double-period-preferred subjects
 * 11. Home room preference: prefer scheduling classes in their home room
 * 12. Minimize room changes: penalize unnecessary room switches during the day
 * 13. Prefer morning for main subjects: main subjects penalized for afternoon scheduling
 * 14. Subject time preference: penalize subjects scheduled after their preferred latest period (SUBJECT_MORNING)
 *
 * Soft constraint weights are defined in TimetableConstraintConfiguration and can be
 * overridden at runtime via the constraint template API (D-03, D-04).
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
                classTimeslotRestriction(constraintFactory),
                // Soft constraints (weights from TimetableConstraintConfiguration)
                noSameSubjectDoubling(constraintFactory),
                balancedWeeklyDistribution(constraintFactory),
                maxLessonsPerDay(constraintFactory),
                preferDoublePeriod(constraintFactory),
                homeRoomPreference(constraintFactory),
                minimizeRoomChanges(constraintFactory),
                preferMorningForMainSubjects(constraintFactory),
                subjectTimePreference(constraintFactory),
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

    /**
     * Class timeslot restriction (NO_LESSONS_AFTER template): a class must not have
     * lessons after the specified maxPeriod. This is a hard constraint because
     * it represents a school-mandated dismissal rule.
     */
    public Constraint classTimeslotRestriction(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .join(ClassTimeslotRestriction.class,
                        Joiners.equal(Lesson::getClassId, ClassTimeslotRestriction::getClassId))
                .filter((lesson, restriction) ->
                        lesson.getTimeslot() != null
                                && lesson.getTimeslot().getPeriodNumber() > restriction.getMaxPeriod())
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Class timeslot restriction");
    }

    // ===== Soft Constraints (configurable weights via @ConstraintConfiguration) =====

    /**
     * Penalize two non-consecutive lessons of the same subject on the same day
     * for the same class (TIME-02). Consecutive lessons (double periods) are OK.
     * Default weight: 10
     */
    public Constraint noSameSubjectDoubling(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getClassId),
                        Joiners.equal(Lesson::getSubjectId),
                        Joiners.equal(lesson -> lesson.getTimeslot().getDayOfWeek()))
                .filter((l1, l2) -> !areConsecutive(l1, l2))
                .penalizeConfigurable()
                .asConstraint("No same subject doubling");
    }

    /**
     * Spread subject lessons evenly across the week (TIME-02).
     * Uses Timefold's loadBalance collector to penalize uneven distribution
     * of lessons per day for each class-subject combination.
     * Default weight: 5
     */
    public Constraint balancedWeeklyDistribution(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .groupBy(Lesson::getClassId, Lesson::getSubjectId,
                        ConstraintCollectors.loadBalance(
                                lesson -> lesson.getTimeslot().getDayOfWeek()))
                .penalizeConfigurable(
                        (classId, subjectId, balance) -> balance.unfairness().intValue())
                .asConstraint("Balanced weekly distribution");
    }

    /**
     * Penalize each lesson beyond 8 per day for a class (TIME-02).
     * Represents excessive workload per day for students.
     * Default weight: 8
     */
    public Constraint maxLessonsPerDay(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .groupBy(Lesson::getClassId,
                        lesson -> lesson.getTimeslot().getDayOfWeek(),
                        ConstraintCollectors.count())
                .filter((classId, dayOfWeek, count) -> count > 8)
                .penalizeConfigurable(
                        (classId, dayOfWeek, count) -> count - 8)
                .asConstraint("Max lessons per day");
    }

    /**
     * For lessons where preferDoublePeriod=true, penalize if the lesson
     * has no consecutive partner of the same subject+class on the same day (D-05, TIME-04).
     * This encourages the solver to schedule double periods for flagged subjects.
     * Default weight: 8
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
                .penalizeConfigurable()
                .asConstraint("Prefer double periods");
    }

    /**
     * Prefer scheduling a class in their home room (Stammklasse-Raum) (D-13).
     * If lesson.homeRoomId is set and the assigned room does not match, penalize soft.
     * Default weight: 2
     */
    public Constraint homeRoomPreference(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .filter(lesson -> lesson.getHomeRoomId() != null)
                .filter(lesson -> !lesson.getHomeRoomId().equals(lesson.getRoom().getId()))
                .penalizeConfigurable()
                .asConstraint("Home room preference");
    }

    /**
     * Minimize unnecessary room changes during the day (D-15).
     * For each pair of consecutive lessons for the same class on the same day,
     * if they are in different rooms AND neither requires a special room type
     * (both could be in a regular Klassenzimmer), penalize the room change.
     * Default weight: 3
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
                .penalizeConfigurable()
                .asConstraint("Minimize room changes");
    }

    /**
     * Main subjects (those not requiring a special room type, i.e., typical
     * classroom subjects like Mathematik, Deutsch) are penalized for being
     * scheduled after period 6 (afternoon). This encourages scheduling demanding
     * subjects in the morning when students are more attentive.
     * Default weight: 1
     */
    public Constraint preferMorningForMainSubjects(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .filter(lesson -> lesson.getRequiredRoomType() == null)
                .filter(lesson -> lesson.getTimeslot().getPeriodNumber() > 6)
                .penalizeConfigurable()
                .asConstraint("Prefer morning for main subjects");
    }

    /**
     * Subject time preference (SUBJECT_MORNING template): penalize scheduling a
     * subject after its preferred latest period. For example, Mathematik should
     * be scheduled before period 4.
     * Default weight: 3
     */
    public Constraint subjectTimePreference(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEach(Lesson.class)
                .join(SubjectTimePreference.class,
                        Joiners.equal(Lesson::getSubjectId, SubjectTimePreference::getSubjectId))
                .filter((lesson, pref) ->
                        lesson.getTimeslot() != null
                                && lesson.getTimeslot().getPeriodNumber() > pref.getLatestPeriod())
                .penalizeConfigurable()
                .asConstraint("Subject time preference");
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
