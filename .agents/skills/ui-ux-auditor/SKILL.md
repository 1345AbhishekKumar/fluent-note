---
name: ui-ux-auditor
description: Audit a UI/UX design — screenshots, live URLs, Figma exports, or frontend code — for spacing/sizing (margin, padding, 8pt grid), touch target sizes, typography, color/contrast, navigation/form patterns, error handling, animation/motion quality (missing feedback, timing, easing, performance, prefers-reduced-motion), and WCAG 2.2 compliance. Use when the user asks to review/audit/critique a UI, wants margin/padding/spacing feedback, asks about the 8pt grid, wants a heuristic evaluation (Nielsen's, Fitts's/Hick's/Miller's/Jakob's Law), touch target or accessibility checks, or whether animations are present, missing, janky, or working correctly. Trigger proactively on a shared UI screenshot with "how does this look", shared frontend code needing a design/spacing pass, or "check if the animations work" — even without the word "audit." Produces a structured, prioritized report with severity scoring, not freeform opinions.
---

# UI/UX Auditor

A systematic, five-pillar audit methodology for evaluating digital products — heavier on measurable, checkable criteria (spacing math, touch target sizes, contrast, grid alignment) than on taste. The goal is to turn "this feels off" into "this button is 36x36px against a 44px minimum, and its left margin (13px) doesn't align to the 8pt grid."

This is a superset of general design critique — use `web-design-pro` or `design:design-critique` when the ask is purely about aesthetic direction/taste. Use this skill when the ask involves systematic auditing, measurable criteria, or a written report.

## Before starting: figure out what you're auditing

The input determines the method:

- **Screenshot/image**: view the image directly, estimate spacing/sizing visually using UI landmarks (a standard button is usually ~40-48px tall, body text ~14-16px — use these as rulers), and reason from those estimates. State clearly in the report that pixel values are visual estimates, not exact measurements, unless the user provides exact specs.
- **Live URL**: use `web_fetch` for content/structure, and if you can render/screenshot it, do so. Note that computed styles usually cannot be inspected without dev tools access — say so rather than guessing.
- **Codebase (CSS/Tailwind/React)**: this is the highest-precision case. Run `scripts/spacing_audit.py` against the project (see below) to get exact pixel/rem values rather than eyeballing anything. Always prefer this over visual estimation when code is available.
- **Figma/design file export**: if there's a DESIGN.md or design tokens file in the project (common in this user's workflow — check for one before assuming none exists), read it first; it's often more reliable than re-deriving tokens from screenshots.

If it's ambiguous what's being audited, or the person gives you a vague "review my app," ask what to point at (a URL, a folder, specific screens) rather than guessing — but if a screenshot or file is already in front of you, just proceed.

## The six pillars

Work through these in order. Skip a pillar only if it's clearly inapplicable (e.g., no forms exist, or the interface is fully static with no interactivity at all) — say so in the report rather than silently omitting it.

1. **Methodology** — frame the audit as heuristic evaluation + cognitive walkthrough, not a list of opinions. See `references/heuristics.md` for Nielsen's 10 heuristics and the cognitive walkthrough question set.
2. **Journey & component checklists** — onboarding/sign-up, navigation, forms/data entry, error handling. See `references/component-checklists.md`.
3. **Interaction laws & visual hierarchy** — Fitts's, Hick's, Miller's, Jakob's Law, the 8pt grid, typography scale, color semantics. See `references/interaction-laws.md`. This is where most of the "margin/padding/size" work lives.
4. **Motion & animation** — two separate questions: is motion missing where it should give feedback or clarify state, and where motion exists, is it correctly timed, eased, performant, and reduced-motion-safe. This pillar needs either live interaction (a URL/build you can click through) or code — a static screenshot can't reveal whether animations exist or work, so say so explicitly rather than guessing. See `references/animation-audit.md`.
5. **Accessibility & performance** — WCAG 2.2 AA, with special attention to the criteria added in 2.2 (Focus Appearance, Target Size, Accessible Authentication, Redundant Entry), plus perceived-performance thresholds. See `references/accessibility-wcag22.md`.
6. **Scoring & prioritization** — every finding gets a severity and an estimated user-frequency × business-impact score so the report ends in a ranked action list, not just a pile of observations. See `references/scoring-prioritization.md`.

## Running the spacing/sizing script on code

When a codebase is available, run:

```bash
python3 /mnt/skills/user/ui-ux-auditor/scripts/spacing_audit.py <path-to-project>
```

This scans CSS/SCSS/Tailwind class usage across the project and flags:
- px values for margin/padding/gap/width/height that aren't multiples of 4 (half-step) or 8 (full 8pt grid)
- Tailwind arbitrary values (`w-[43px]`, `p-[13px]`, etc.) — these bypass the design system's spacing scale by definition, so they're nearly always worth flagging
- Interactive elements (button, a, input) with computed height/width below 44px (mobile touch target minimum) or 24px (WCAG 2.2 AA minimum)

Treat the script's output as a starting list, not the whole audit — it catches numeric violations but can't judge whether a deliberate exception (e.g., a dense data-table row) is actually a problem. Use judgment on false positives before including something in the report.

## Report structure

Use this template. Keep prose tight — this is a working document, not an essay. Every finding needs: what's wrong, why it matters (which principle/law it violates), and a concrete fix.

```markdown
# UI/UX Audit: [Product/Screen Name]

## Executive Summary
2-4 sentences: overall state, the single biggest issue, overall risk level.

## Findings by Pillar

### Spacing, Sizing & Visual Hierarchy
| Element | Issue | Principle Violated | Severity | Fix |

### Navigation & Interaction
| Element | Issue | Principle Violated | Severity | Fix |

### Forms & Error Handling
| Element | Issue | Principle Violated | Severity | Fix |

### Motion & Animation
| Element | Issue | Missing or Incorrect | Severity | Fix |

### Accessibility (WCAG 2.2 AA)
| Element | Issue | Criterion | Severity | Fix |

## Prioritized Action List
Ranked by (severity × frequency × business impact) — see references/scoring-prioritization.md.
1. [Highest priority fix]
2. ...

## Quick Wins
Fixes that take <30 min but meaningfully improve the experience.
```

Severity scale: **Critical** (blocks task completion or violates accessibility law), **Major** (causes friction/confusion for most users), **Minor** (polish-level, inconsistent but not confusing), **Nitpick** (would only bother a trained eye).

## Handing off to a fix

This skill stops at the report — it doesn't edit code. If the user wants the findings actually applied (not just documented), that's the `polish-pass` skill: same underlying criteria, but it produces a report *and then* makes the fixes on approval, plus adds design-token drift classification and a code-quality/cleanup pass this skill doesn't cover. See `references/polish-pass.md` for its workflow, `references/polish-pass-checklist.md` for its full criteria table, and `references/polish-pass-heuristic-walkthrough.md` for its 5-minute manual walkthrough — useful here too as a fast pre-audit gut-check before running the full six-pillar pass.

## What not to do

- Don't pad the report with restated best-practice trivia the user didn't ask about (e.g., a paragraph explaining what Fitts's Law is, in every audit) — cite the principle briefly and move on to the specific finding.
- Don't invent exact pixel measurements from a screenshot and present them as precise fact — say "approximately" and note the estimation method.
- Don't skip the accessibility pillar just because the user only asked about "spacing" — flag anything critical you notice in passing, but keep the main report focused on what was asked.
