package at.schoolflow.solver.dto;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Final result payload sent via callback to NestJS when solving completes.
 * Contains the solved lesson assignments and any remaining violations.
 */
public class SolveResult {

    @JsonProperty("runId")
    private String runId;

    @JsonProperty("status")
    private String status; // COMPLETED, STOPPED, FAILED

    @JsonProperty("hardScore")
    private int hardScore;

    @JsonProperty("softScore")
    private int softScore;

    @JsonProperty("elapsedSeconds")
    private int elapsedSeconds;

    @JsonProperty("lessons")
    private List<SolvedLesson> lessons = new ArrayList<>();

    @JsonProperty("violations")
    private List<SolveProgress.ViolationGroup> violations = new ArrayList<>();

    // No-arg constructor for Jackson
    public SolveResult() {
    }

    // Getters and setters

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getHardScore() {
        return hardScore;
    }

    public void setHardScore(int hardScore) {
        this.hardScore = hardScore;
    }

    public int getSoftScore() {
        return softScore;
    }

    public void setSoftScore(int softScore) {
        this.softScore = softScore;
    }

    public int getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(int elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public List<SolvedLesson> getLessons() {
        return lessons;
    }

    public void setLessons(List<SolvedLesson> lessons) {
        this.lessons = lessons;
    }

    public List<SolveProgress.ViolationGroup> getViolations() {
        return violations;
    }

    public void setViolations(List<SolveProgress.ViolationGroup> violations) {
        this.violations = violations;
    }

    /**
     * A lesson with its solved timeslot and room assignments.
     * Only the IDs are sent back -- NestJS maps them to full entities.
     */
    public static class SolvedLesson {

        @JsonProperty("lessonId")
        private String lessonId;

        @JsonProperty("timeslotId")
        private String timeslotId;

        @JsonProperty("roomId")
        private String roomId;

        public SolvedLesson() {
        }

        public SolvedLesson(String lessonId, String timeslotId, String roomId) {
            this.lessonId = lessonId;
            this.timeslotId = timeslotId;
            this.roomId = roomId;
        }

        public String getLessonId() {
            return lessonId;
        }

        public void setLessonId(String lessonId) {
            this.lessonId = lessonId;
        }

        public String getTimeslotId() {
            return timeslotId;
        }

        public void setTimeslotId(String timeslotId) {
            this.timeslotId = timeslotId;
        }

        public String getRoomId() {
            return roomId;
        }

        public void setRoomId(String roomId) {
            this.roomId = roomId;
        }
    }
}
