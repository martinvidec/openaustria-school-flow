package at.schoolflow.solver.domain;

/**
 * Represents a NO_LESSONS_AFTER constraint template:
 * a class must not have lessons after a specific period number.
 *
 * Example: class "1a" has no lessons after period 5 (early dismissal).
 */
public class ClassTimeslotRestriction {

    private String classId;
    private int maxPeriod; // no lessons with periodNumber > maxPeriod

    // No-arg constructor for Jackson deserialization
    public ClassTimeslotRestriction() {
    }

    public ClassTimeslotRestriction(String classId, int maxPeriod) {
        this.classId = classId;
        this.maxPeriod = maxPeriod;
    }

    public String getClassId() {
        return classId;
    }

    public void setClassId(String classId) {
        this.classId = classId;
    }

    public int getMaxPeriod() {
        return maxPeriod;
    }

    public void setMaxPeriod(int maxPeriod) {
        this.maxPeriod = maxPeriod;
    }

    @Override
    public String toString() {
        return "ClassTimeslotRestriction{classId='" + classId + "', maxPeriod=" + maxPeriod + "}";
    }
}
