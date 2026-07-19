# Common Pulse prototype

Throwaway Stage A learning vehicle for issue #9, the **second** Cooperative
Game prototype. It asks whether **real-time complementary control** — one shared
Pulse plus one distinct held channel per Player — creates understandable
interdependence, fair participation, a meaningful shared goal, voluntary
immediate replay, and unprompted Social Interaction for two to four Players,
without making speech a hard rule.

Its Interaction Pattern is deliberately distinct from Split Signal's asymmetric
inference (#8) and Relay Canvas's expressive co-creation (#20). Per ADR 0005
that distinctness is a design-time aspiration, not a selection gate.

## The mechanic

- One shared **Pulse** (a level 0–100) drifts downward on its own and must be
  kept inside a **target band that moves** up and down over time.
- Each Player continuously **holds one complementary channel**, assigned by join
  order, and only the combination keeps the Pulse in the band:
  - **Rise** — hold to lift the Pulse toward a high target.
  - **Ease** — hold to settle it toward a low target.
  - **Steady** — hold to calm the drift so the others can aim (3+ Players).
  - **Surge** — hold in bursts to chase a fast-moving target (4 Players).
- Filling the **shared stability** meter to 100% by staying in the band wins the
  round. Drifting out drains it, so a group that cannot coordinate never
  finishes — a deliberate, observable failure mode.
- Difficulty scales with group size (faster target, narrower band, more wobble)
  so every added channel is load-bearing and the 2–4 floor (ADR 0005) holds:
  the Rise/Ease pair already works at two.

## Run it

Start the mobile app and the API, then open one phone per Player:

```text
http://localhost:5173/games/common-pulse?host=1&name=Host
http://localhost:5173/games/common-pulse?room=ROOMCODE&name=Player
```

`variant=A|B|C` switches the three renderings of the same shared state — **A
Pulse orb** (vertical, keep the orb in the band), **B Channel mixer** (who is
holding what, participation at a glance), **C Live waveform** (level vs band
over time). The bottom switcher and the left/right arrow keys update the
shareable URL.

The relay is intentionally in memory with no auth, D1, persistence, or
production guarantees. The Pulse evolves on wall-clock time and is computed
lazily on each poll (a few times a second), which is why it feels real-time over
plain HTTP; the production real-time transport question remains issue #7.

## Observation capture

Record these after real Play Group sessions before deciding to absorb or delete
the prototype:

- time to first unprompted hint, callout, reaction, glance, or gesture;
- whether every Player understands that their own channel is needed, and whether
  anyone becomes a passenger (Steady/Surge are the ones to watch);
- whether the group coordinates verbally, nonverbally, or not at all, and how
  the ~300 ms polling latency affects that coordination;
- first-round completion time and whether the group chooses **Pulse again**
  without encouragement;
- failure modes, especially one Player back-seat coordinating everyone,
  silent panic-mashing, and a flat or confusing ending.

`Finish & log out` removes a Player from the disposable relay only after a round
is complete, so the cooperative dependency is preserved during play.

## Decision

Pending observed Play Groups. Capture the verdict here (and in the issue) before
absorbing the validated mechanic into real code or deleting the prototype.
