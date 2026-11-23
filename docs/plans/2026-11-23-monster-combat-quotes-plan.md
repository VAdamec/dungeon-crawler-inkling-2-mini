# Implementation checklist

- [x] Add short quote pool and separate transient dialogue state with active-time expiration/global cooldown.
- [x] Hook surviving player hits and eligible monster attack attempts; clear on death, actor recreation/travel, restart, and ending.
- [x] Add monster-relative, fog-aware, camera-clamped speech drawing above the world and below hazard warnings.
- [x] Test triggers/timing/lifecycle/visibility/RNG/NPC independence, run syntax/smoke, and inspect real combat bubbles over file://. All 56 tests, syntax, legacy smoke, and controlled Chrome checks pass; screenshots inspected.
- [x] Update documentation and handover; do not stage or commit.
