package at.schoolflow.solver.rest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

import ai.timefold.solver.core.api.score.analysis.ScoreAnalysis;
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore;
import ai.timefold.solver.core.api.solver.SolutionManager;
import ai.timefold.solver.core.api.solver.SolverManager;
import at.schoolflow.solver.domain.Lesson;
import at.schoolflow.solver.domain.SchoolTimetable;
import at.schoolflow.solver.dto.SolveProgress;
import at.schoolflow.solver.dto.SolveRequest;
import at.schoolflow.solver.dto.SolveResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jboss.logging.Logger;

/**
 * REST API for the Timefold timetable solver sidecar.
 *
 * Endpoints:
 * - POST /solve -- Start async solving with callback
 * - GET /solve/{runId}/status -- Check solve status
 * - DELETE /solve/{runId} -- Terminate solve early
 * - GET /health -- Health check for Docker
 */
@Path("/solve")
@ApplicationScoped
public class SolverResource {

    private static final Logger LOG = Logger.getLogger(SolverResource.class);

    @Inject
    SolverManager<SchoolTimetable, String> solverManager;

    @Inject
    SolutionManager<SchoolTimetable, HardSoftScore> solutionManager;

    @Inject
    ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Shared secret used to authenticate sidecar -> NestJS callbacks.
     * NestJS SolverCallbackController.validateSolverSecret rejects requests
     * without a matching X-Solver-Secret header; we read it from env at
     * request time so docker-compose env propagation works without rebuild.
     */
    private static final String SOLVER_SHARED_SECRET =
            System.getenv().getOrDefault("SOLVER_SHARED_SECRET", "dev-secret");

    /** Tracks solve start times for elapsed seconds calculation */
    private final Map<String, Instant> startTimes = new ConcurrentHashMap<>();

    /** Tracks callback URLs per run */
    private final Map<String, String> callbackUrls = new ConcurrentHashMap<>();

    /** Tracks score history per run for improvement rate calculation */
    private final Map<String, List<SolveProgress.ScoreHistoryEntry>> scoreHistories = new ConcurrentHashMap<>();

    /**
     * POST /solve -- Start an asynchronous solve operation.
     * Returns 202 Accepted immediately. Progress and completion are reported via callbacks.
     */
    @POST
    public Response startSolve(SolveRequest request) {
        String runId = request.getRunId();
        String callbackUrl = request.getCallbackUrl();
        SchoolTimetable problem = request.getProblem();

        LOG.infof("Starting solve for runId=%s, lessons=%d, timeslots=%d, rooms=%d",
                runId,
                problem.getLessons().size(),
                problem.getTimeslots().size(),
                problem.getRooms().size());

        startTimes.put(runId, Instant.now());
        callbackUrls.put(runId, callbackUrl);
        scoreHistories.put(runId, Collections.synchronizedList(new ArrayList<>()));

        solverManager.solveBuilder()
                .withProblemId(runId)
                .withProblem(problem)
                .withBestSolutionConsumer(solution -> onBestSolution(runId, solution))
                .withFinalBestSolutionConsumer(solution -> onFinalSolution(runId, solution))
                .run();

        return Response.accepted(Map.of(
                "runId", runId,
                "status", "SOLVING"
        )).build();
    }

    /**
     * GET /solve/{runId}/status -- Check current solve status.
     */
    @GET
    @Path("/{runId}/status")
    public Response getStatus(@PathParam("runId") String runId) {
        var status = solverManager.getSolverStatus(runId);
        return Response.ok(Map.of(
                "runId", runId,
                "status", status.name()
        )).build();
    }

    /**
     * DELETE /solve/{runId} -- Terminate solve early. Uses best solution found so far.
     */
    @DELETE
    @Path("/{runId}")
    public Response terminateSolve(@PathParam("runId") String runId) {
        LOG.infof("Terminating solve for runId=%s", runId);
        solverManager.terminateEarly(runId);
        return Response.ok(Map.of(
                "runId", runId,
                "status", "STOPPED"
        )).build();
    }

    /**
     * Callback invoked by SolverManager when a new best solution is found.
     * Sends progress update to NestJS via HTTP callback.
     * NOTE: Do NOT modify the solution object (Pitfall 3).
     */
    private void onBestSolution(String runId, SchoolTimetable solution) {
        try {
            int elapsed = getElapsedSeconds(runId);
            HardSoftScore score = solution.getScore();

            // Record score history
            List<SolveProgress.ScoreHistoryEntry> history = scoreHistories.get(runId);
            if (history != null) {
                history.add(new SolveProgress.ScoreHistoryEntry(
                        System.currentTimeMillis(),
                        score.hardScore(),
                        score.softScore()
                ));
            }

            // Build progress DTO
            SolveProgress progress = new SolveProgress();
            progress.setRunId(runId);
            progress.setHardScore(score.hardScore());
            progress.setSoftScore(score.softScore());
            progress.setElapsedSeconds(elapsed);
            progress.setImprovementRate(calculateImprovementRate(history));
            progress.setScoreHistory(history != null ? new ArrayList<>(history) : List.of());

            // Build violation groups from score analysis
            try {
                ScoreAnalysis<HardSoftScore> analysis = solutionManager.analyze(solution);
                progress.setRemainingViolations(buildViolationGroups(analysis));
            } catch (Exception e) {
                LOG.warnf("Could not analyze solution for runId=%s: %s", runId, e.getMessage());
            }

            // Send progress callback
            sendCallback(runId, "/progress/" + runId, progress);

        } catch (Exception e) {
            LOG.errorf(e, "Error in onBestSolution for runId=%s", runId);
        }
    }

    /**
     * Callback invoked by SolverManager when solving completes (final best solution).
     * Sends completion result to NestJS via HTTP callback.
     */
    private void onFinalSolution(String runId, SchoolTimetable solution) {
        try {
            int elapsed = getElapsedSeconds(runId);
            HardSoftScore score = solution.getScore();

            LOG.infof("Solve completed for runId=%s: score=%s, elapsed=%ds",
                    runId, score, elapsed);

            // Build result DTO
            SolveResult result = new SolveResult();
            result.setRunId(runId);
            result.setStatus("COMPLETED");
            result.setHardScore(score.hardScore());
            result.setSoftScore(score.softScore());
            result.setElapsedSeconds(elapsed);

            // Map solved lessons to SolvedLesson DTOs
            List<SolveResult.SolvedLesson> solvedLessons = new ArrayList<>();
            for (Lesson lesson : solution.getLessons()) {
                if (lesson.getTimeslot() != null && lesson.getRoom() != null) {
                    solvedLessons.add(new SolveResult.SolvedLesson(
                            lesson.getId(),
                            lesson.getTimeslot().getId(),
                            lesson.getRoom().getId()
                    ));
                }
            }
            result.setLessons(solvedLessons);

            // Build violation groups
            try {
                ScoreAnalysis<HardSoftScore> analysis = solutionManager.analyze(solution);
                result.setViolations(buildViolationGroups(analysis));
            } catch (Exception e) {
                LOG.warnf("Could not analyze final solution for runId=%s: %s", runId, e.getMessage());
            }

            // Send completion callback
            sendCallback(runId, "/complete/" + runId, result);

        } catch (Exception e) {
            LOG.errorf(e, "Error in onFinalSolution for runId=%s", runId);
        } finally {
            // Clean up tracking state
            startTimes.remove(runId);
            callbackUrls.remove(runId);
            scoreHistories.remove(runId);
        }
    }

    /**
     * Build violation groups from Timefold ScoreAnalysis for the progress dashboard (D-10).
     * Each group includes up to 5 human-readable entity reference examples
     * so the admin understands WHY constraints are violated.
     */
    private List<SolveProgress.ViolationGroup> buildViolationGroups(ScoreAnalysis<HardSoftScore> analysis) {
        List<SolveProgress.ViolationGroup> groups = new ArrayList<>();
        analysis.constraintMap().forEach((ref, constraintAnalysis) -> {
            HardSoftScore constraintScore = constraintAnalysis.score();
            if (constraintScore.hardScore() < 0 || constraintScore.softScore() < 0) {
                List<String> examples = new ArrayList<>();
                try {
                    // Extract human-readable examples from match justifications
                    // Cap at 5 examples per constraint type to avoid oversized responses
                    constraintAnalysis.matches().stream()
                            .limit(5)
                            .forEach(match -> {
                                try {
                                    Object justification = match.justification();
                                    if (justification instanceof Lesson lesson) {
                                        examples.add(String.format("%s (%s): %s P%d",
                                                lesson.getTeacherName(),
                                                lesson.getSubjectName(),
                                                lesson.getTimeslot() != null ? lesson.getTimeslot().getDayOfWeek() : "unassigned",
                                                lesson.getTimeslot() != null ? lesson.getTimeslot().getPeriodNumber() : 0));
                                    } else if (justification != null) {
                                        examples.add(justification.toString());
                                    }
                                } catch (Exception e) {
                                    // Skip individual match if justification extraction fails
                                    LOG.debugf("Could not extract justification for constraint %s: %s",
                                            ref.constraintName(), e.getMessage());
                                }
                            });
                } catch (Exception e) {
                    // matches() may not be available in all ScoreAnalysis modes
                    LOG.debugf("Could not extract matches for constraint %s: %s",
                            ref.constraintName(), e.getMessage());
                }
                groups.add(new SolveProgress.ViolationGroup(
                        ref.constraintName(),
                        constraintAnalysis.matchCount(),
                        examples
                ));
            }
        });
        return groups;
    }

    /**
     * Calculate improvement rate from recent score history.
     * "improving" -- score improving in last 3 entries
     * "plateauing" -- less than 1% change in last 3 entries
     * "stagnant" -- no change in last 3 entries
     */
    private String calculateImprovementRate(List<SolveProgress.ScoreHistoryEntry> history) {
        if (history == null || history.size() < 3) {
            return "improving";
        }

        int size = history.size();
        SolveProgress.ScoreHistoryEntry recent = history.get(size - 1);
        SolveProgress.ScoreHistoryEntry prev = history.get(size - 3);

        int hardDiff = recent.getHard() - prev.getHard();
        int softDiff = recent.getSoft() - prev.getSoft();

        if (hardDiff == 0 && softDiff == 0) {
            return "stagnant";
        }

        // Check if improvement is less than 1% of the absolute score
        int absHard = Math.max(1, Math.abs(prev.getHard()));
        int absSoft = Math.max(1, Math.abs(prev.getSoft()));
        double hardPct = Math.abs((double) hardDiff / absHard);
        double softPct = Math.abs((double) softDiff / absSoft);

        if (hardPct < 0.01 && softPct < 0.01) {
            return "plateauing";
        }

        return "improving";
    }

    /**
     * Get elapsed seconds since solve started for a run.
     */
    private int getElapsedSeconds(String runId) {
        Instant start = startTimes.get(runId);
        if (start == null) {
            return 0;
        }
        return (int) Duration.between(start, Instant.now()).getSeconds();
    }

    /**
     * Send a JSON payload to the NestJS callback URL.
     */
    private void sendCallback(String runId, String path, Object payload) {
        String callbackUrl = callbackUrls.get(runId);
        if (callbackUrl == null || callbackUrl.isBlank()) {
            LOG.debugf("No callback URL for runId=%s, skipping callback", runId);
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(payload);
            String url = callbackUrl + path;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("X-Solver-Secret", SOLVER_SHARED_SECRET)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(5))
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() >= 400) {
                            LOG.warnf("Callback to %s returned status %d", url, response.statusCode());
                        }
                    })
                    .exceptionally(e -> {
                        LOG.warnf("Callback to %s failed: %s", url, e.getMessage());
                        return null;
                    });

        } catch (JsonProcessingException e) {
            LOG.errorf(e, "Failed to serialize callback payload for runId=%s", runId);
        }
    }
}
