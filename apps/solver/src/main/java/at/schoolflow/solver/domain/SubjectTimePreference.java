package at.schoolflow.solver.domain;

/**
 * Represents a SUBJECT_MORNING constraint template:
 * a subject should be scheduled before a specific period number.
 *
 * Example: "Mathematik" should be scheduled before period 4 (morning).
 * Lessons scheduled after latestPeriod receive a soft penalty.
 */
public class SubjectTimePreference {

    private String subjectId;
    private int latestPeriod; // soft penalty for scheduling after this period

    // No-arg constructor for Jackson deserialization
    public SubjectTimePreference() {
    }

    public SubjectTimePreference(String subjectId, int latestPeriod) {
        this.subjectId = subjectId;
        this.latestPeriod = latestPeriod;
    }

    public String getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(String subjectId) {
        this.subjectId = subjectId;
    }

    public int getLatestPeriod() {
        return latestPeriod;
    }

    public void setLatestPeriod(int latestPeriod) {
        this.latestPeriod = latestPeriod;
    }

    @Override
    public String toString() {
        return "SubjectTimePreference{subjectId='" + subjectId + "', latestPeriod=" + latestPeriod + "}";
    }
}
