package at.schoolflow.solver.dto;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Progress payload sent via callback to NestJS during solving.
 * Contains current score, violation details, and improvement metrics.
 */
public class SolveProgress {

    @JsonProperty("runId")
    private String runId;

    @JsonProperty("hardScore")
    private int hardScore;

    @JsonProperty("softScore")
    private int softScore;

    @JsonProperty("elapsedSeconds")
    private int elapsedSeconds;

    @JsonProperty("remainingViolations")
    private List<ViolationGroup> remainingViolations = new ArrayList<>();

    @JsonProperty("improvementRate")
    private String improvementRate; // "improving", "plateauing", "stagnant"

    @JsonProperty("scoreHistory")
    private List<ScoreHistoryEntry> scoreHistory = new ArrayList<>();

    // No-arg constructor for Jackson
    public SolveProgress() {
    }

    // Getters and setters

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
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

    public List<ViolationGroup> getRemainingViolations() {
        return remainingViolations;
    }

    public void setRemainingViolations(List<ViolationGroup> remainingViolations) {
        this.remainingViolations = remainingViolations;
    }

    public String getImprovementRate() {
        return improvementRate;
    }

    public void setImprovementRate(String improvementRate) {
        this.improvementRate = improvementRate;
    }

    public List<ScoreHistoryEntry> getScoreHistory() {
        return scoreHistory;
    }

    public void setScoreHistory(List<ScoreHistoryEntry> scoreHistory) {
        this.scoreHistory = scoreHistory;
    }

    /**
     * Groups constraint violations by type for the progress dashboard.
     */
    public static class ViolationGroup {

        @JsonProperty("type")
        private String type;

        @JsonProperty("count")
        private int count;

        @JsonProperty("examples")
        private List<String> examples = new ArrayList<>();

        public ViolationGroup() {
        }

        public ViolationGroup(String type, int count, List<String> examples) {
            this.type = type;
            this.count = count;
            this.examples = examples != null ? examples : new ArrayList<>();
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public int getCount() {
            return count;
        }

        public void setCount(int count) {
            this.count = count;
        }

        public List<String> getExamples() {
            return examples;
        }

        public void setExamples(List<String> examples) {
            this.examples = examples;
        }
    }

    /**
     * A point in the score improvement history for charting.
     */
    public static class ScoreHistoryEntry {

        @JsonProperty("timestamp")
        private long timestamp;

        @JsonProperty("hard")
        private int hard;

        @JsonProperty("soft")
        private int soft;

        public ScoreHistoryEntry() {
        }

        public ScoreHistoryEntry(long timestamp, int hard, int soft) {
            this.timestamp = timestamp;
            this.hard = hard;
            this.soft = soft;
        }

        public long getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(long timestamp) {
            this.timestamp = timestamp;
        }

        public int getHard() {
            return hard;
        }

        public void setHard(int hard) {
            this.hard = hard;
        }

        public int getSoft() {
            return soft;
        }

        public void setSoft(int soft) {
            this.soft = soft;
        }
    }
}
