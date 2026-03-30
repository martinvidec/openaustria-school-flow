package at.schoolflow.solver.domain;

import java.util.Objects;

/**
 * Represents a BLOCKED timeslot for a teacher (problem fact).
 * Derived from Phase 2 AvailabilityRule records (BLOCKED_PERIOD, BLOCKED_DAY_PART).
 * If a TeacherAvailability exists for teacher X on Monday period 3,
 * it means teacher X is NOT available at that time.
 */
public class TeacherAvailability {

    private String teacherId;
    private String dayOfWeek; // MONDAY, TUESDAY, etc.
    private int periodNumber; // Period number that is blocked

    // No-arg constructor required by Timefold
    public TeacherAvailability() {
    }

    public TeacherAvailability(String teacherId, String dayOfWeek, int periodNumber) {
        this.teacherId = teacherId;
        this.dayOfWeek = dayOfWeek;
        this.periodNumber = periodNumber;
    }

    // Getters

    public String getTeacherId() {
        return teacherId;
    }

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public int getPeriodNumber() {
        return periodNumber;
    }

    // Setters (needed for Jackson deserialization)

    public void setTeacherId(String teacherId) {
        this.teacherId = teacherId;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public void setPeriodNumber(int periodNumber) {
        this.periodNumber = periodNumber;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TeacherAvailability that = (TeacherAvailability) o;
        return periodNumber == that.periodNumber
                && Objects.equals(teacherId, that.teacherId)
                && Objects.equals(dayOfWeek, that.dayOfWeek);
    }

    @Override
    public int hashCode() {
        return Objects.hash(teacherId, dayOfWeek, periodNumber);
    }

    @Override
    public String toString() {
        return "Blocked: " + teacherId + " on " + dayOfWeek + " P" + periodNumber;
    }
}
