package at.schoolflow.solver.dto;

import at.schoolflow.solver.domain.SchoolTimetable;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request payload for starting a solve operation.
 * Sent by the NestJS backend to initiate timetable generation.
 */
public class SolveRequest {

    @JsonProperty("runId")
    private String runId;

    @JsonProperty("callbackUrl")
    private String callbackUrl;

    @JsonProperty("problem")
    private SchoolTimetable problem;

    @JsonProperty("maxSolveSeconds")
    private int maxSolveSeconds = 300; // Default 5 minutes

    // No-arg constructor for Jackson
    public SolveRequest() {
    }

    public SolveRequest(String runId, String callbackUrl, SchoolTimetable problem, int maxSolveSeconds) {
        this.runId = runId;
        this.callbackUrl = callbackUrl;
        this.problem = problem;
        this.maxSolveSeconds = maxSolveSeconds;
    }

    // Getters

    public String getRunId() {
        return runId;
    }

    public String getCallbackUrl() {
        return callbackUrl;
    }

    public SchoolTimetable getProblem() {
        return problem;
    }

    public int getMaxSolveSeconds() {
        return maxSolveSeconds;
    }

    // Setters

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public void setCallbackUrl(String callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    public void setProblem(SchoolTimetable problem) {
        this.problem = problem;
    }

    public void setMaxSolveSeconds(int maxSolveSeconds) {
        this.maxSolveSeconds = maxSolveSeconds;
    }
}
