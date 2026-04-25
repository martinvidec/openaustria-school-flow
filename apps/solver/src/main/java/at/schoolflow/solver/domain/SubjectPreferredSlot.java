package at.schoolflow.solver.domain;

/**
 * Represents a SUBJECT_PREFERRED_SLOT constraint template:
 * a subject is preferred at a specific (dayOfWeek, period) slot.
 *
 * Lessons matching the triple (subjectId, dayOfWeek, period) are rewarded.
 * Multiple preferred slots per subject are allowed (cumulative reward) — see
 * D-14 in 14-CONTEXT.md and the SolverInputService dedupe rules.
 *
 * Added in Phase 14 (D-12 Sub-Tab b "Bevorzugte Slots").
 * Mirrors NestJS-side type SubjectPreferredSlotInput in solver-input.service.ts.
 * Field names MUST match the JSON the NestJS payload sends (camelCase) so
 * Jackson deserialization populates them without extra annotations.
 */
public class SubjectPreferredSlot {

    private String subjectId;
    private String dayOfWeek;  // 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY'
    private int period;

    // No-arg constructor for Jackson deserialization
    public SubjectPreferredSlot() {
    }

    public SubjectPreferredSlot(String subjectId, String dayOfWeek, int period) {
        this.subjectId = subjectId;
        this.dayOfWeek = dayOfWeek;
        this.period = period;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public int getPeriod() {
        return period;
    }

    public void setPeriod(int period) {
        this.period = period;
    }

    @Override
    public String toString() {
        return "SubjectPreferredSlot{subjectId='" + subjectId
                + "', dayOfWeek='" + dayOfWeek
                + "', period=" + period + "}";
    }
}
