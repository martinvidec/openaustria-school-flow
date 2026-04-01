---
status: partial
phase: 04-timetable-viewing-editing-room-management
source: [04-VERIFICATION.md]
started: "2026-04-01T17:05:00Z"
updated: "2026-04-01T17:05:00Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Teacher timetable rendering in browser
expected: Authenticated lehrer user sees their personal weekly timetable grid with colored subject cells
result: [pending]

### 2. Drag-and-drop lesson move with constraint feedback
expected: Admin drags a lesson to a new slot, green/red/yellow overlay appears based on constraint result, move persists after drop
result: [pending]

### 3. PDF export downloads a real file
expected: Clicking 'Als PDF exportieren' triggers a browser download of a properly formatted A4 landscape PDF
result: [pending]

### 4. Real-time room booking propagation
expected: When a teacher books a room, the timetable view on another browser tab updates within 1-2 seconds
result: [pending]

### 5. Student timetable auto-perspective
expected: Authenticated schueler user sees their class timetable immediately without needing to select a perspective
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
