---
status: accepted
---

# Four-prototype validation design

Gamebuds validates its Cooperative-First bet by observing real teen Play Groups play throwaway prototypes, not by interviewing them. The validation set was extended from two contrasting cooperative prototypes to **four** (three cooperative + one light competitive), tested with an **incomplete-block** observation design in which each of about six groups plays two of the three cooperative prototypes plus the competitive probe, and the two Cooperative MVP Games are selected as the **top two of three** cooperative prototypes by observed group behavior. The driving reason: two prototypes give only a binary A-vs-B comparison, too thin to rank which cooperative mechanic should lead — but naïvely making every group play all four would push sessions past the 5–20 minute occasion the product targets and let fatigue corrupt the very Social Interaction signal being measured.

## Decisions

- **Four prototypes, breadth not depth.** Add two *distinct* mechanics on new social axes (Relay Canvas — expressive co-creation; Crowd Read — light competitive social prediction) rather than replicate variants of the existing two. The goal is to explore more of the design space, not to harden two points.
- **Three cooperative + one competitive.** The three cooperative prototypes (Split Signal, Common Pulse, Relay Canvas) compete for the two cooperative Catalog slots; Crowd Read probes the single competitive slot. The MVP Catalog size is unchanged at three Games (two cooperative + one competitive) — this expands the *validation set*, not the ship list.
- **Incomplete-block observation, not within-subjects.** About six teen Play Groups; each plays two of the three cooperative prototypes (~25 minutes) plus Crowd Read. Cooperative pairs are rotated so all three pairs are each directly compared by at least two groups, and every cooperative prototype is observed by four of the six groups.
- **Two-layer cooperative gate + separate competitive gate.** Each cooperative prototype must clear an absolute per-prototype bar (in at least three of its four groups) before ranking; the top two of those that clear become the two Cooperative MVP Games. Crowd Read is scored pass/fail on its own criteria (teachable in ~1 minute, rematch desire, no exclusion, outcomes independent of prior gaming skill) and never competes for or borrows a cooperative slot.

## Considered options

- **Keep two prototypes (within-subjects A vs B).** Rejected as too thin to rank a field; two points cannot triangulate which cooperative mechanic should lead.
- **Two mechanics × two variants (depth/replication).** Rejected in favor of breadth: for a solo creator on a nine-month budget, four distinct mechanics buy more learning than confidence that a single implementation was representative.
- **Four cooperative prototypes (no competitive in the set).** Rejected in favor of three + one: the Catalog's competitive slot is otherwise entirely unvalidated as a prototype, and folding it in on a separate gate de-risks it without contaminating the cooperative comparison.
- **Within-subjects, every group plays all four.** Rejected: 45–60-minute sessions break the 5–20 minute occasion and fatigue suppresses the Social Interaction signal, systematically disadvantaging later-played prototypes.

## Consequences

- Recruitment rises from about four to about six Play Groups. This is the real cost of "assessing" more prototypes — piling more prototypes onto the same groups would give *less* evidence per prototype, not more.
- No single group experiences the full field, so cross-prototype comparison relies on the rotated pair overlap rather than every group ranking all four directly.
- The competitive prototype is validated in isolation on its own gate, so it yields less comparative evidence than each cooperative prototype; acceptable because it fills the secondary variety slot.
- The prototype *concepts* remain throwaway learning vehicles and may be replaced; this ADR records the *validation design* — set size, composition, observation method, and gate — which is the part that would be costly to revisit mid-recruitment.
