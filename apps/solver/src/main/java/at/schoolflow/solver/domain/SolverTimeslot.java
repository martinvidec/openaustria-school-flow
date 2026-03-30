package at.schoolflow.solver.domain;

import java.util.Objects;

import ai.timefold.solver.core.api.domain.lookup.PlanningId;

/**
 * A timeslot in the school timetable (problem fact, not a planning entity).
 * Represents a specific period on a specific day, e.g., Monday period 1.
 */
public class SolverTimeslot {

    @PlanningId
    private String id;

    private String dayOfWeek; // MONDAY, TUESDAY, ..., SATURDAY
    private int periodNumber; // 1..N from TimeGrid
    private String startTime; // "08:00"
    private String endTime;   // "08:50"
    private String weekType;  // "A", "B", or "BOTH"
    private boolean isBreak;
    private String nextTimeslotId; // ID of the next consecutive timeslot (same day, period+1)

    // No-arg constructor required by Timefold
    public SolverTimeslot() {
    }

    public SolverTimeslot(String id, String dayOfWeek, int periodNumber,
                          String startTime, String endTime, String weekType,
                          boolean isBreak, String nextTimeslotId) {
        this.id = id;
        this.dayOfWeek = dayOfWeek;
        this.periodNumber = periodNumber;
        this.startTime = startTime;
        this.endTime = endTime;
        this.weekType = weekType;
        this.isBreak = isBreak;
        this.nextTimeslotId = nextTimeslotId;
    }

    // Getters

    public String getId() {
        return id;
    }

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public int getPeriodNumber() {
        return periodNumber;
    }

    public String getStartTime() {
        return startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public String getWeekType() {
        return weekType;
    }

    public boolean isBreak() {
        return isBreak;
    }

    public String getNextTimeslotId() {
        return nextTimeslotId;
    }

    // Setters (needed for Jackson deserialization)

    public void setId(String id) {
        this.id = id;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public void setPeriodNumber(int periodNumber) {
        this.periodNumber = periodNumber;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public void setWeekType(String weekType) {
        this.weekType = weekType;
    }

    public void setBreak(boolean isBreak) {
        this.isBreak = isBreak;
    }

    public void setNextTimeslotId(String nextTimeslotId) {
        this.nextTimeslotId = nextTimeslotId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SolverTimeslot that = (SolverTimeslot) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return dayOfWeek + " P" + periodNumber + " (" + startTime + "-" + endTime + ")";
    }
}
