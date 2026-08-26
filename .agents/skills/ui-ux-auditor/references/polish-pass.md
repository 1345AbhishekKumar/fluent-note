---
name: polish-pass
description: Run a final "shipped vs. polished" pass on a UI — typography, spacing, color, micro-interactions/animation timing, states, copy, accessibility, and a full CSS/token audit — then fix the issues directly in the code once the user approves the findings. Use this whenever the user asks to polish, refine, tighten up, or do a "final pass" on a component, page, or app; says something looks "clunky," "unfinished," "amateur," or "not quite professional"; asks for an animation/motion audit or CSS cleanup; or shares a functionally-complete component/page without explicit instructions (proactively offer a polish pass). This is a fix-oriented workflow (audit report → approval → direct code edits), not just a critique document — use `ui-ux-auditor` instead if the user only wants a written audit/report with no code changes, or `web-design-pro`/`design:design-critique` for pure aesthetic-direction feedback with no checklist.
---

# Polish Pass

Turns "make it feel polished" into a systematic audit with measurable criteria, followed by actual fixes — not just a list of opinions. The gap between "shipped" and "polished" is almost always: inconsistent spacing/type, missing interaction states, unaligned-to-tokens colors, animation timing that's too slow/linear/missing, and copy that wasn't proofread. This skill catches all of it in one pass.

**Relationship to other skills**: If a DESIGN.md or design-tokens file exists (or was built with `design-md-from-image` / `design-md-from-code`), read it — it's the source of truth for what "aligned" means. If `ui-ux-auditor`'s `spacing_audit.py` is more convenient for scanning a codebase for spacing violations, reuse it rather than reimplementing. This skill's job that those don't cover: triage cosmetic-vs-functional, classify drift by root cause, and **apply the fixes**.

## Workflow

### Step 0 — Is it ready to polish?

Polish is the *last* step. Before doing anything else, confirm:
- Is the component/page functionally complete? If not, say so and stop — polishing incomplete work wastes effort and will need redoing.
- What's the quality bar — MVP or flagship? This changes how much structural-overhaul work is worth doing vs. quick wins only. If unclear and it materially changes scope, ask once.
- When does it ship? Tight timelines mean triage hard: functional issues before cosmetic ones (see Step 2).

### Step 1 — Find the design system (or its absence)

1. Search the project for a DESIGN.md, design-tokens file, Tailwind config, CSS custom properties, or a component library/style guide.
2. If found: extract the color tokens, spacing scale, type scale, and motion conventions. These are the standard everything gets checked against.
3. If not found: polish against whatever conventions are *already established* in the codebase (existing spacing values, existing color usage) rather than inventing a new system. Don't guess at principles that aren't evident — if truly ambiguous and it matters, ask.
4. For every inconsistency you find later, classify its root cause (this determines the fix):
   - **Missing token** — the value should exist in the system but doesn't → add it, then use it.
   - **One-off implementation** — a shared component/pattern already exists but wasn't used → swap to the shared version.
   - **Conceptual misalignment** — the flow/IA/hierarchy doesn't match neighboring features (e.g. a modal where the rest of the app uses full-page flows) → rework the flow, not just the surface styling.

### Step 2 — Audit systematically

Work through the dimensions in `references/polish-checklist.md` (typography, spacing/grid, color & contrast, interaction states, micro-interactions & animation timing, content/copy, icons/images, forms, edge cases, responsiveness, performance, code quality, IA/flow-shape). Each item there has a concrete, checkable criterion — pixel values, contrast ratios, timing ranges, not vibes.

For a fast gut-check before or alongside the full audit, run the 5-minute heuristic walkthrough in `references/heuristic-walkthrough.md` — it catches the most common overlooked details (trailing whitespace, missing pressed states, broken tab order, janky motion, unclear copy) in about five minutes of manual interaction.

While auditing, classify every finding along two axes:
- **Cosmetic vs. Functional** — cosmetic looks off but doesn't impede the user; functional breaks, blocks, or confuses. On a tight timeline, functional ships first.
- **Quick Win vs. Structural Overhaul** — quick win is a local fix (a color, a spacing value, an easing curve); structural overhaul touches the design system itself (a new type scale, a new token set) and should be flagged as a separate, larger effort rather than done inline.

### Step 3 — Report findings, then wait for approval

Produce a prioritized report before touching code:

```markdown
# Polish Audit: [Component/Page]

## Summary
1-3 sentences: overall state, biggest issue, ready-to-ship or not.

## Findings
| # | Area | Issue | Criterion violated | Cosmetic/Functional | Effort | Fix |
|---|------|-------|---------------------|----------------------|--------|-----|

## Design System Drift
[Missing token / One-off / Conceptual misalignment — grouped by root cause]

## Recommended Fix Order
1. [Functional + quick win first]
...

## Out of Scope / Structural
[Anything needing a system-level change beyond this pass]
```

Ask the user which findings to apply — default assumption is "apply everything tagged Quick Win + Functional," but confirm before touching Structural Overhaul items or anything with broad blast radius (e.g. changing a token used in 40 places).

### Step 4 — Fix directly in the code

Once approved:
- Edit the actual files. Prefer existing design-system components/tokens over new one-off values — never hardcode a color/spacing value that has a token equivalent.
- Fix issues at the system level when they're systemic (e.g. if spacing is off on every card, fix the shared card component/class, not each instance).
- Don't introduce new patterns, animation curves, or component variants that diverge from what's established.
- Preserve behavior — polishing should never change functionality or introduce regressions. If a fix is ambiguous or risky, flag it rather than guessing.
- After fixing, re-check the specific criteria that were violated (re-run `spacing_audit.py` if used, re-check contrast, re-time the animation) rather than assuming the fix landed correctly.

### Step 5 — Clean up

- Remove console.logs, commented-out code, and unused imports touched during the pass.
- Consolidate any new values into tokens if they'll be reused.
- Summarize what changed, grouped by the report's findings — don't just say "polished the UI," reference specific fixes ("button padding now uses `space-4` instead of hardcoded 13px; disabled state added to the submit button; modal open/close now 220ms ease-out-quint instead of 400ms linear").

## What not to do

- Don't polish before functional completeness — say so and stop.
- Don't apply structural-overhaul-level changes without explicit approval — those have wider blast radius.
- Don't invent design-system principles when none are evident — ask.
- Don't perfect one corner while leaving neighboring areas rough — consistency of quality bar matters more than local perfection.
- Don't cite a clean linter/contrast-checker run as proof the design is polished — those catch defects, not whether the experience feels right. Actually interact with it.
- Don't reproduce bounce/elastic easing or decorative motion — see the animation criteria in the checklist.
