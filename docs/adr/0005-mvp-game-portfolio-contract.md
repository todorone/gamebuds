---
status: accepted
---

# MVP Game portfolio contract

Issue #6 sets the *criteria and composition rule* for the three-Game MVP Catalog; it does **not** pick the winning Games (Stage A observation does, per ADR [0002](0002-four-prototype-validation-design.md)) and does **not** design the mechanics (the per-prototype issues #8/#9/#20/#10 do). The driving reason to pin this now: like ADR [0003](0003-staged-validation-gates-and-success-thresholds.md)'s thresholds, a composition rule only protects against wishful thinking if it is fixed *before* Stage A runs, so a lively session cannot bend the Catalog toward a favorite.

## The contract

- **Two coverage axes, as design-time aspirations only.** The Catalog should span distinct **Interaction Patterns** and distinct **Moods** — tracked separately, because two mechanically-different Games can still share a Mood. This is pursued by *authoring the three cooperative prototypes* across distinct patterns and moods (already so — Relay Canvas #20 is the warm/playful contrast), **not** by gating selection. Accepted residual risk: the shipped cooperative pair could share a Mood.

- **Hard 2–4 per-Game floor.** Every Catalog Game must deliver its Social Interaction at group sizes two, three, and four. A mechanic that cannot is disqualified *before* ranking, however it would rank. This bites Split Signal's asymmetric inference and Crowd Read's social prediction hardest — both must prove they still work at two, not merely "not crash."

- **Selection is pure top-two-of-three ranking; nothing overrides it.** The two cooperative slots are filled strictly by observed group behavior among prototypes that cleared their absolute per-prototype gate (ADR 0002). Neither Mood coverage nor solo-feasibility overrides the ranking — observed Social Interaction is the primary signal, and an a-priori taxonomy does not beat evidence of what groups actually enjoyed.

- **Competitive-slot backfill rule.** Crowd Read fills the single competitive slot iff it passes its own pass/fail gate (ADR 0002). If it fails: backfill with the 3rd-ranked cooperative prototype **iff that prototype cleared its absolute gate** → a 3-cooperative, 0-competitive Catalog (still Cooperative-First). If the 3rd cooperative did not clear its gate either, **ship two Games**. Never delay the MVP launch for the competitive slot; a competitive Game can arrive as post-launch Catalog expansion.

## Not re-specified here (owned elsewhere)

- **Replayability** — the per-prototype voluntary-immediate-replay gate (#8/#9/#20, ADR 0002/0003) plus Stage E's M1 repeat-gathering rate (ADR 0003). #6 adds no new replayability gate.
- **Solo-feasibility** — a design-time input and a Stage C scope-cutting lever (ADR 0003), never a selection override. If ranking picks two Games that are each feasible but *jointly* over-budget, scope is cut within them; selection is not reopened.
- **5–20 minute session** — the per-prototype gate plus the Launch Occasion (CONTEXT.md).

## Considered options

- **Coverage as a hard selection gate that can override ranking** (or as a bounded tie-break among near-equal ranks). Rejected: observed Social Interaction is the primary signal, and overriding a clear behavioral ranking to satisfy a Mood taxonomy privileges designer taste over evidence. Distinctness is pursued by spreading the prototype field, not by overriding results.
- **Enforce Mood/Pattern distinctness at the per-prototype gate** — the stale #9 framing ("meaningfully different from the first"). Rejected for the same reason, and because top-two-of-three has no fixed "first"/"second"; #9 is reworded to drop it.
- **On competitive-gate failure, delay launch** until a replacement competitive Game passes. Rejected: the competitive slot is the secondary/variety slot; blocking the MVP for it inverts the priority.
- **On competitive-gate failure, let a cooperative prototype "borrow" the competitive slot as a competitive Game.** N/A — ADR 0002 already forbids cross-slot borrowing; backfill promotes the 3rd cooperative *as a cooperative Game*, not as a competitive one.

## Consequences

- The Catalog may ship two same-Mood cooperative Games, or three cooperative Games and no competitive one. Both remain Cooperative-First and are deliberately accepted here rather than patched by overriding selection.
- Because feasibility never reopens selection, a jointly-expensive winning pair is absorbed by Stage C scope cuts, which may ship thinner Games than a re-selection would.
- This contract is pre-registered: revisiting the no-override rule or the backfill ladder mid-stage is itself an ADR-worthy change, not a judgment call, so a lively Stage A session cannot quietly relax it.
