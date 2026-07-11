---
status: accepted
---

# Staged validation gates and success thresholds

Gamebuds runs a five-stage validation program from throwaway prototypes to a public MVP, with a pre-registered evidence gate between stages and an explicit expand/iterate/kill decision at the six-month mark. This ADR sets the **numbers and the go/no-go logic**; sibling issues execute against them (#7 builds the connection prototype, #13 instruments the measurement, #16 owns production SLOs, #6/#17 make the portfolio and launch calls). ADR [0002](0002-four-prototype-validation-design.md) already defines the Stage A prototype-selection gate in full; this ADR covers the stages 0002 does not (connection, closed beta, six-month) plus the staging that ties them together. The driving reason for pinning exact thresholds now: gates only protect against wishful thinking if they are **pre-registered before the stage runs**, so a lively session or a hopeful launch week cannot move the goalposts.

## The stage spine

| Stage                              | Validates                                                          | Gate                                                     |
| ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| **A. Game-prototype observation**  | Desirability — does a mechanic spark Social Interaction?           | ADR 0002 (cooperative two-layer gate + competitive gate) |
| **B. Connection prototype**        | Feasibility — production WebRTC device-to-device + install-to-join | This ADR                                                 |
| **C. Build the 3-Game MVP**        | — (build stage, no gate)                                           | —                                                        |
| **D. Closed beta**                 | Integration — does the whole machine run unmoderated end-to-end?   | This ADR                                                 |
| **E. Public MVP → 6-month window** | Traction — group-level repeat play and organic growth              | This ADR                                                 |

## Decisions

- **Decouple the connection prototype from the recruiting path.** Stage A observations run on a _throwaway_ transport (same Wi-Fi / a trivial relay) because the point is the social signal, not production networking, and desirability is the bigger risk. Stage B (the ADR 0001 WebRTC spike) is at-the-keyboard work interleaved between recruiting sessions. The only hard dependency: **do not start Stage C until both A has selected a slate and B has cleared its bar or picked its pivot.**

- **Time is an estimate, not a gate.** Stage effort estimates (~2mo A, ~1mo B interleaved, ~4mo C, ~1mo D, ~1mo buffer inside the ADR 0001 ~9-month-to-launch budget) are for planning only. Pivots trigger on **evidence**, never on calendar overrun.

- **Connection gate (Stage B) — narrow scope.** Tests transport + join only (ADR 0001 spike Q1–Q3). Auth / RevenueCat / OpenTelemetry (Q4–Q6) are integration spikes against proven vendors, de-risked during Stage C; they do not gate the go/no-go on the one novel risk. Bars, measured on real devices across ≥30 formation attempts on ≥3 network conditions:
  - Session formation (3–4 phones in-game, ≤2 taps, TURN wired in): **≥ 90%**
  - Session hold (15-min session, no non-Host fatal drop): **≥ 95%**
  - Data-channel RTT: **median ≤ 100 ms, p95 ≤ 250 ms** (Common Pulse needs it snappy)
  - Install → tap-again → join: **works ≥ 90%**
  - Pivot ladder: formation low → wire Cloudflare TURN; still low → abandon device-to-device for a server-authoritative relay (new ADR); Host-disconnect frequent → host migration or server authority; tap-again broken → scoped deferred deep linking.

- **Closed-beta gate (Stage D) — funnel, not retention.** Durable retention belongs to Stage E; a ~4-week beta of recruited friends cannot prove it. Stage D proves the integrated funnel works with the creator **not in the room** (onboarding must teach itself, extending ADR 0002's "no moderator help after onboarding"):
  - Install → tap-again → join, uninstalled invitees same sitting: **≥ 70%**
  - Session completion (started → clean ending, excluding deliberate quits): **≥ 85%**
  - Same-sitting replay (2nd round or 2nd Game, same gathering): **≥ 50%** of groups
  - Group Unlock (buy → unlock-for-group at join): **functional**
  - Reliability: **meets #16's launch SLO** (referenced, not set here)
  - Loop-backs, not thesis-pivots, for most misses: install→join → flow fix / deferred deep linking; completion → Stage B / #16. **Same-sitting replay low is the alarm** — mechanics that landed in moderated observation fail as shipped product → back to #6 or Game iteration.

- **Six-month thresholds (Stage E) — measure the Play Group, not the individual.** CONTEXT.md rejects compulsive engagement and nobody plays alone, so individual DAU/screen-time is the wrong frame. Two group-level thesis metrics, each banded; the window starts at public store availability:
  - **M1 — Repeat-gathering rate** (share of first-session Play Groups with ≥2 distinct Play Gatherings in 6 months): Expand ≥ 30% · Iterate 10–30% · **Kill < 10%**
  - **M2 — Viral coefficient K** (new installs per session via Session Invitations + Result Card #15; existential because there is no paid acquisition): Expand ≥ 0.25 · below → iterate the growth loop

- **Expand/iterate/kill logic — retention primary, growth as the scaling gate, monetization separate.**

  | Condition              | Call                                                                                                            |
  | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
  | M1 < 10%               | **Kill / deep-pivot** — nobody replays; more Games cannot save it (regardless of M2)                            |
  | M1 ≥ 30% and M2 ≥ 0.25 | **Expand** toward 6–8 Games                                                                                     |
  | M1 ≥ 30% but M2 < 0.25 | **Iterate the growth loop** (#15) — the product works but will not spread; more Games will not fix distribution |
  | M1 10–30%              | **Iterate the Games** — retention soft; re-measure before expanding, whatever M2 says                           |

  Group Unlock conversion is a **#12** business-viability check, deliberately kept out of this decision: a beloved product that prices wrong is a pricing iterate, not a thesis kill.

## Considered options

- **Connection prototype as a gate-zero before any recruiting.** Rejected in favor of decoupling: desirability is the larger risk, the Stage A social signal does not need production networking, and blocking teen recruitment on a technical spike wastes the solo creator's scarcest calendar.
- **Calendar as a hard gate (time-box auto-pivots).** Considered and rejected: gates are evidence-based; time stays an estimate.
- **Closed beta as an early retention gate.** Rejected: recruited friends over four weeks cannot yield honest cross-gathering retention; conflating it with the funnel gate would either block launch on un-measurable data or launder a weak signal as a pass.
- **Individual engagement metrics (DAU / session length) for Stage E.** Rejected: contradicts the anti-compulsion stance in CONTEXT.md and misdescribes a product with no solo play.
- **Fold monetization into the expand/iterate/kill call.** Rejected: it muddies the product-thesis signal; pricing is separately owned and separately fixable (#12).

## Consequences

- **M1 depends on a measurement #13 has not yet solved.** Counting distinct Play Gatherings per group over six months needs a longitudinal group signal that collides with the ethical doc's 90-day pseudonymous-aggregate ceiling. Per the scope split, this ADR fixes _what_ to measure; #13 must find a privacy-preserving _how_, and if M1 is genuinely unmeasurable within those constraints it kicks back and a proxy is chosen here.
- **The throwaway Stage A transport is deliberate throwaway work**, with a small residual risk that a mechanic feels different on production latency than on Wi-Fi (bounded — these Games are co-located and low-latency by design).
- **These thresholds are pre-registered.** Revisiting a number mid-stage is itself an ADR-worthy change, not a judgment call, precisely so a good session or a hopeful launch week cannot quietly relax the bar.
