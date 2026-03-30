package at.schoolflow.solver.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import ai.timefold.solver.core.api.domain.lookup.PlanningId;

/**
 * A room available for scheduling lessons (problem fact, not a planning entity).
 * Rooms have a type (e.g., Klassenzimmer, Turnsaal) and equipment tags.
 */
public class SolverRoom {

    @PlanningId
    private String id;

    private String name;
    private String roomType; // "Klassenzimmer", "Turnsaal", "EDV-Raum", "Werkraum", "Labor", "Musikraum"
    private int capacity;
    private List<String> equipment; // "Beamer", "Smartboard", "PCs"

    // No-arg constructor required by Timefold
    public SolverRoom() {
        this.equipment = new ArrayList<>();
    }

    public SolverRoom(String id, String name, String roomType, int capacity, List<String> equipment) {
        this.id = id;
        this.name = name;
        this.roomType = roomType;
        this.capacity = capacity;
        this.equipment = equipment != null ? equipment : new ArrayList<>();
    }

    // Getters

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getRoomType() {
        return roomType;
    }

    public int getCapacity() {
        return capacity;
    }

    public List<String> getEquipment() {
        return equipment;
    }

    // Setters (needed for Jackson deserialization)

    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public void setEquipment(List<String> equipment) {
        this.equipment = equipment;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SolverRoom that = (SolverRoom) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return name + " (" + roomType + ", cap=" + capacity + ")";
    }
}
