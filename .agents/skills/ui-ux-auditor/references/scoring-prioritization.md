# Scoring & Prioritization

A finding list without prioritization is just a pile of opinions. Every audit should end in a ranked list someone could actually work from.

## Severity scale

Use consistently across every finding in the report:

- **Critical** — blocks task completion, or is a hard accessibility/compliance failure (e.g., sub-24px touch target, keyboard trap, missing focus indicator).
- **Major** — causes real friction or confusion for most users but has a workaround (e.g., submit-only form validation, unclear icon with no label, 8pt-grid violations scattered across a whole page rather than one spot).
- **Minor** — inconsistent or slightly off, but doesn't confuse or block anyone (e.g., a single element 2px off-grid, slightly inconsistent spacing in a rarely-visited settings page).
- **Nitpick** — would only bother someone specifically looking for it (a trained designer's eye, essentially). Fine to note but shouldn't dominate the report.

## Impact scoring for prioritization

Where useful (larger audits, or when the user explicitly wants a ranked backlog), score each finding as:

**Priority Score = User Frequency × Business Impact**

- **User frequency** (1-5): how many users hit this, and how often. A checkout-flow issue scores higher than a rarely-visited admin settings page issue, even if the underlying violation is identical in severity.
- **Business impact** (1-5): how much this plausibly affects conversion, retention, support burden, or legal exposure. Accessibility violations on public-facing flows should be scored high here regardless of how visually "minor" they seem, given litigation risk.

Multiply the two for a rough 1-25 priority score per finding, then sort the action list by that score (with Critical severity findings always bubbled to the top regardless of the numeric score — a compliance-breaking issue doesn't wait its turn just because frequency is low).

## What goes in "Quick Wins" vs. the ranked list

Quick Wins are a separate short list: fixes that take under ~30 minutes of engineering time regardless of their priority score (e.g., adding a missing `aria-label`, swapping a hardcoded `13px` for `p-3`). Surface these separately because they're often worth doing immediately even if they wouldn't otherwise rank near the top — cheap fixes shouldn't have to wait behind expensive high-priority ones.
