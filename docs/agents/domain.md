# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring

- Read `CONTEXT.md` at the repository root.
- Read ADRs under `docs/adr/` that affect the area being explored.
- If a referenced file or directory does not exist, proceed silently. Create domain documentation only when a real term or decision needs to be recorded.

## Layout

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

## Use the glossary's vocabulary

When output names a domain concept—in an issue title, proposal, hypothesis, or test—use the term defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is absent, reconsider whether new terminology is necessary. Record a genuine domain-language gap through the domain-modeling workflow.

## Flag ADR conflicts

Surface any conflict with an existing ADR explicitly rather than silently overriding the decision.
