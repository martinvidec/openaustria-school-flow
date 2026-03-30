package at.schoolflow.solver.constraints;

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.Constraint;
import ai.timefold.solver.core.api.score.stream.ConstraintFactory;
import ai.timefold.solver.core.api.score.stream.ConstraintProvider;
import ai.timefold.solver.core.api.score.stream.Joiners;

import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.TeacherAvailability;

/**
 * Defines the hard constraints for the school timetable.
 *
 * Hard constraints (D-02: physical constraints only):
 * 1. Teacher conflict: same teacher cannot teach two lessons at the same time
 * 2. Room conflict: same room cannot host two lessons at the same time
 * 3. Teacher availability: teacher cannot be scheduled during blocked timeslots
 * 4. Student group conflict: same class/group cannot have overlapping lessons
 *
 * Soft constraints will be added in Plan 04 (constraint weight configuration).
 */
public class TimetableConstraintProvider implements ConstraintProvider {

    @Override
    public Constraint[] defineConstraints(ConstraintFactory constraintFactory) {
        return new Constraint[] {
                teacherConflict(constraintFactory),
                roomConflict(constraintFactory),
                teacherAvailability(constraintFactory),
                studentGroupConflict(constraintFactory),
        };
    }

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
     *
     * This is achieved by: penalize any pair with same classId and same timeslot,
     * UNLESS both lessons have non-null, different groupIds (meaning disjoint groups).
     */
    public Constraint studentGroupConflict(ConstraintFactory constraintFactory) {
        return constraintFactory
                .forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getTimeslot),
                        Joiners.equal(Lesson::getClassId))
                .filter((l1, l2) ->
                        // Penalize unless both have different non-null groups (disjoint students)
                        l1.getGroupId() == null
                                || l2.getGroupId() == null
                                || l1.getGroupId().equals(l2.getGroupId()))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Student group conflict");
    }
}
