# Accessibility (WCAG 2.2 AA) & Perceived Performance

## Why WCAG 2.2, and what standard to hold work to

WCAG 2.2 is the current version of the international accessibility standard. For nearly all legal/regulatory purposes (ADA-adjacent claims, EU/UK accessibility regulations, most enterprise procurement requirements), **Level AA** is the expected conformance target — not the more permissive Level A, and not the far stricter Level AAA. Default to auditing against AA unless the user specifies otherwise.

## New in WCAG 2.2 — check these specifically, they're easy to miss

- **Focus Appearance (AA)**: visible keyboard-focus indicators need at least a 2 CSS pixel thick perimeter around the focused element, and at least 3:1 contrast between focused and unfocused states. A focus ring that's a thin 1px outline, or one that's the same color as the background, fails this. This matters for anyone navigating by keyboard, who has no mouse cursor to fall back on for orientation.
- **Target Size Minimum (AA)**: pointer targets need to be at least 24×24 CSS pixels. This is the *compliance floor* — it's lower than the 44px mobile-usability recommendation in interaction-laws.md, so a target can pass this criterion and still be a poor Fitts's Law citizen. Treat sub-24px targets as Critical/compliance failures, and 24-44px targets as Major usability findings even though technically compliant.
- **Accessible Authentication Minimum (AA)**: cognitive function tests (CAPTCHAs, "solve this puzzle," memorized password composition tricks) shouldn't be required during login/authentication unless an accessible alternative exists — biometric login, or simply allowing password managers to paste into the field (a shockingly common violation is disabling paste on password fields).
- **Redundant Entry (A)**: see component-checklists.md — don't make users re-enter information the system already collected in the same session, unless required for security.

## Practical testing approach

Automated tools (axe, Lighthouse, WAVE) reliably catch roughly a third of accessibility issues — missing alt text, insufficient color contrast ratios, missing form labels, missing ARIA roles on custom components. The remaining, larger share of issues are structural/behavioral and require manual testing:
- Tab through the entire interface using only the keyboard — can every interactive element be reached and activated, and does focus order match visual order?
- Turn on a screen reader (VoiceOver/NVDA) for at least the primary flow — does it announce state changes, form errors, and dynamic content updates?
- Check color contrast on any pairing not covered by common component libraries (Shadcn/UI's defaults are generally fine, but custom brand colors laid on top are the usual failure point).

## Prioritizing accessibility findings

Don't just rank by technical severity — factor in:
- **Legal/compliance risk**: WCAG 2.2 AA violations on a public-facing or enterprise product carry real litigation exposure; weight these up regardless of how "minor" they look visually.
- **User impact breadth**: a missing form label affects every screen-reader user on every visit to that form; a slightly-too-small icon button affects fewer people less often.

## Perceived Performance (the psychological side of speed)

Speed is part of the UX, not just an engineering metric. Response-time thresholds that hold up consistently:
- **Under 0.1s**: feels instantaneous — the user's train of thought isn't broken.
- **Under 1s**: still feels like a fluid, connected experience, though the user notices the delay.
- **Over 10s**: the user's attention breaks and they're likely to abandon the task (outside of flows the user already expects to be slow, like a large export).

Even sub-second delays matter: a ~0.3s gap between a click and any visual feedback reads as uncertainty ("did that work?") rather than "fast." Audit for immediate feedback on every interactive action (button press states, optimistic UI updates, skeleton loaders) rather than waiting for the full response before showing anything.
