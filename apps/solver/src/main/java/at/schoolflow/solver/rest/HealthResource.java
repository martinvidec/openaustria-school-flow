package at.schoolflow.solver.rest;

import java.util.Map;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;

/**
 * Simple health endpoint for Docker healthcheck.
 * Returns 200 with { status: "UP" } when the application is running.
 */
@Path("/health")
public class HealthResource {

    @GET
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
