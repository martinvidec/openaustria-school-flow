package at.schoolflow.solver.domain;

import java.util.Map;

import ai.timefold.solver.core.api.domain.constraintweight.ConstraintConfiguration;
import ai.timefold.solver.core.api.domain.constraintweight.ConstraintWeight;
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;

/**
 * Defines default weights for all configurable soft constraints.
 * Hard constraints are NOT listed here -- they always use HardSoftScore.ONE_HARD.
 *
 * Admin can override individual weights via the constraint template API.
 * NestJS sends weight overrides as a JSON map which is applied via applyOverrides().
 *
 * Default soft constraint weights:
 * - "No same subject doubling": 10
 * - "Balanced weekly distribution": 5
 * - "Max lessons per day": 8
 * - "Prefer double periods": 8
 * - "Home room preference": 2
 * - "Minimize room changes": 3
 * - "Prefer morning for main subjects": 1
 * - "Subject time preference": 3
 */
@ConstraintConfiguration
public class TimetableConstraintConfiguration {

    @ConstraintWeight("No same subject doubling")
    private HardSoftScore noSameSubjectDoublingWeight = HardSoftScore.ofSoft(10);

    @ConstraintWeight("Balanced weekly distribution")
    private HardSoftScore balancedWeeklyDistributionWeight = HardSoftScore.ofSoft(5);

    @ConstraintWeight("Max lessons per day")
    private HardSoftScore maxLessonsPerDayWeight = HardSoftScore.ofSoft(8);

    @ConstraintWeight("Prefer double periods")
    private HardSoftScore preferDoublePeriodsWeight = HardSoftScore.ofSoft(8);

    @ConstraintWeight("Home room preference")
    private HardSoftScore homeRoomPreferenceWeight = HardSoftScore.ofSoft(2);

    @ConstraintWeight("Minimize room changes")
    private HardSoftScore minimizeRoomChangesWeight = HardSoftScore.ofSoft(3);

    @ConstraintWeight("Prefer morning for main subjects")
    private HardSoftScore preferMorningForMainSubjectsWeight = HardSoftScore.ofSoft(1);

    @ConstraintWeight("Subject time preference")
    private HardSoftScore subjectTimePreferenceWeight = HardSoftScore.ofSoft(3);

    // No-arg constructor with defaults
    public TimetableConstraintConfiguration() {
    }

    // Getters and setters

    public HardSoftScore getNoSameSubjectDoublingWeight() {
        return noSameSubjectDoublingWeight;
    }

    public void setNoSameSubjectDoublingWeight(HardSoftScore noSameSubjectDoublingWeight) {
        this.noSameSubjectDoublingWeight = noSameSubjectDoublingWeight;
    }

    public HardSoftScore getBalancedWeeklyDistributionWeight() {
        return balancedWeeklyDistributionWeight;
    }

    public void setBalancedWeeklyDistributionWeight(HardSoftScore balancedWeeklyDistributionWeight) {
        this.balancedWeeklyDistributionWeight = balancedWeeklyDistributionWeight;
    }

    public HardSoftScore getMaxLessonsPerDayWeight() {
        return maxLessonsPerDayWeight;
    }

    public void setMaxLessonsPerDayWeight(HardSoftScore maxLessonsPerDayWeight) {
        this.maxLessonsPerDayWeight = maxLessonsPerDayWeight;
    }

    public HardSoftScore getPreferDoublePeriodsWeight() {
        return preferDoublePeriodsWeight;
    }

    public void setPreferDoublePeriodsWeight(HardSoftScore preferDoublePeriodsWeight) {
        this.preferDoublePeriodsWeight = preferDoublePeriodsWeight;
    }

    public HardSoftScore getHomeRoomPreferenceWeight() {
        return homeRoomPreferenceWeight;
    }

    public void setHomeRoomPreferenceWeight(HardSoftScore homeRoomPreferenceWeight) {
        this.homeRoomPreferenceWeight = homeRoomPreferenceWeight;
    }

    public HardSoftScore getMinimizeRoomChangesWeight() {
        return minimizeRoomChangesWeight;
    }

    public void setMinimizeRoomChangesWeight(HardSoftScore minimizeRoomChangesWeight) {
        this.minimizeRoomChangesWeight = minimizeRoomChangesWeight;
    }

    public HardSoftScore getPreferMorningForMainSubjectsWeight() {
        return preferMorningForMainSubjectsWeight;
    }

    public void setPreferMorningForMainSubjectsWeight(HardSoftScore preferMorningForMainSubjectsWeight) {
        this.preferMorningForMainSubjectsWeight = preferMorningForMainSubjectsWeight;
    }

    public HardSoftScore getSubjectTimePreferenceWeight() {
        return subjectTimePreferenceWeight;
    }

    public void setSubjectTimePreferenceWeight(HardSoftScore subjectTimePreferenceWeight) {
        this.subjectTimePreferenceWeight = subjectTimePreferenceWeight;
    }

    /**
     * Apply weight overrides from a map of constraint name -> soft weight value.
     * Only recognized constraint names are applied; unknown names are ignored.
     */
    public void applyOverrides(Map<String, Integer> overrides) {
        if (overrides == null) {
            return;
        }
        for (Map.Entry<String, Integer> entry : overrides.entrySet()) {
            HardSoftScore weight = HardSoftScore.ofSoft(entry.getValue());
            switch (entry.getKey()) {
                case "No same subject doubling" -> this.noSameSubjectDoublingWeight = weight;
                case "Balanced weekly distribution" -> this.balancedWeeklyDistributionWeight = weight;
                case "Max lessons per day" -> this.maxLessonsPerDayWeight = weight;
                case "Prefer double periods" -> this.preferDoublePeriodsWeight = weight;
                case "Home room preference" -> this.homeRoomPreferenceWeight = weight;
                case "Minimize room changes" -> this.minimizeRoomChangesWeight = weight;
                case "Prefer morning for main subjects" -> this.preferMorningForMainSubjectsWeight = weight;
                case "Subject time preference" -> this.subjectTimePreferenceWeight = weight;
                default -> { /* unknown constraint name, ignore */ }
            }
        }
    }
}
