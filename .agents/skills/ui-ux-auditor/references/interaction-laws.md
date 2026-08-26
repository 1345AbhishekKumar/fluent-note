# Interaction Laws & Visual Hierarchy

This is the core reference for the "margin, padding, size" part of an audit — the measurable, law-backed criteria rather than subjective taste.

## Fitts's Law — target size and distance

Time to acquire a target is a function of its distance and size: smaller/farther targets take longer and are more error-prone to hit.

Audit checklist:
- **Mobile touch targets**: minimum 44×44px (Apple's standard since the original iPhone). Anything smaller is a "fat-finger" risk, especially in dense UIs.
- **Desktop click targets**: minimum ~1cm² (~0.4in), roughly 38-40px at typical screen densities.
- **WCAG 2.2 AA hard floor**: 24×24 CSS pixels minimum for pointer targets — this is a legal/compliance floor, not a design recommendation; treat anything below it as Critical, not Minor.
- Frequently-used actions (primary CTA, compose, send) should be large and placed in easily reachable zones — screen corners/edges on desktop, thumb-reachable zones (bottom of screen) on mobile.
- Adjacent tap targets need enough spacing between them (not just size) to prevent accidental mis-taps — flag targets that are individually large enough but packed edge-to-edge.

## Hick's Law — decision time vs. choice count

Decision time increases with the number and complexity of choices presented at once.

Audit checklist:
- Count options in any single menu, nav bar, or choice screen. More than ~7-9 flat items is a candidate for grouping or progressive disclosure.
- Look for opportunities to hide advanced/rarely-used options behind a secondary level (settings sub-menus, "more options") rather than surfacing everything at once.
- This is in tension with Fitts's Law sometimes (fewer, bigger buttons vs. more, smaller ones) — when they conflict, prioritize based on how frequently each option is actually used.

## Miller's Law — working memory limit (7±2 items)

The average person holds about seven items in working memory at once.

Audit checklist:
- Navigation menus, tab bars, and selection lists with more than 7-9 items should be chunked into logical groups (categories, sections) rather than presented flat.
- This applies to information density generally — a form with 15 ungrouped fields should be split into logical sections/steps.

## Jakob's Law — users expect familiar patterns

Users spend most of their time on other products, so they expect a new one to work the same way.

Audit checklist:
- Platform conventions: does navigation/gesture behavior match iOS/Android/web norms, or does it require relearning for no clear benefit?
- Common patterns (hamburger menu = more options, trash icon = delete, back arrow = previous screen) — check they're not repurposed to mean something unexpected.
- Deviation from convention isn't automatically wrong, but it should be flagged as a discoverability risk requiring extra affordance (labels, onboarding) to compensate.

## The 8pt Grid System

All spacing and sizing (margins, padding, widths, heights, gaps) should be multiples of 8px, with 4px as an acceptable half-step for finer adjustments. This creates consistent vertical rhythm and makes a layout feel deliberate rather than arbitrary.

Audit checklist:
- Flag any margin/padding/gap/dimension value that isn't a multiple of 4 (e.g., 13px, 22px, 7px) — these are almost always accidental rather than intentional.
- In Tailwind-based projects specifically, arbitrary values in brackets (`p-[13px]`, `gap-[22px]`) are a strong signal — the design system's spacing scale (`p-1` through `p-96`, all multiples of 4px at the default `1 = 0.25rem = 4px` scale) was bypassed. This is exactly what `scripts/spacing_audit.py` detects automatically in code audits.
- Consistency matters more than the exact multiple chosen — a codebase that consistently uses a 4pt grid is fine; the problem is *inconsistency* (mixing 13px, 8px, and 24px with no discernible system).

## Typography Scale

A modular scale (each size a consistent ratio of the previous, e.g., 1.25x) tied to the same base grid keeps type consistent and removes ad-hoc sizing decisions. Audit for: how many distinct font sizes appear across the product (more than ~6-8 distinct sizes usually signals drift), and whether line-height/spacing around type also follows the grid.

## Color Semantics & WCAG 1.4.1

- Color should be used intentionally and consistently: e.g., blue for interactive links/actions, red for destructive actions, green for success/confirmation.
- **Color must never be the sole means of conveying information** (WCAG 1.4.1) — an error state needs a text label or icon in addition to a red border/text; a status indicator needs a shape/icon difference in addition to color, so the design works for users with color vision deficiencies. This is a common, easy-to-spot violation: scan every status/error/success indicator for a non-color signal.

## Visual Hierarchy

Hierarchy is created through deliberate variation in scale, weight, color/contrast, and alignment — the eye should land on the most important element first without being told to. When auditing a screen, ask: what does the eye land on first, and is that the thing the user actually needs first? A screen where the biggest/boldest element is a decorative image rather than the primary action is a hierarchy failure worth flagging even if every individual element looks fine in isolation.
