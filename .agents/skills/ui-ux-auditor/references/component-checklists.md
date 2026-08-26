# Journey & Component Checklists

Granular checklists for the four highest-friction areas of most products. Use whichever apply to what's being audited.

## Onboarding & Sign-up

Goal: minimize friction and time-to-value, maximize clarity.

- Prefer skipping tutorials/walkthroughs where possible in favor of contextual help that appears only when the user needs it — forced tutorials are usually skipped or forgotten anyway.
- Sign-up forms: required fields kept to the absolute minimum; social login offered as a lower-friction alternative; plain, unambiguous language throughout (no jargon in field labels or error text).
- Flag onboarding flows that front-load information the user doesn't need yet, use more than a couple of steps before reaching real value, or have unclear/multiple competing calls-to-action.
- If there's a "first task" the user needs to complete (e.g., add first item, connect first account), verify the cognitive walkthrough (see heuristics.md) passes for that specific flow.

## Navigation

Goal: predictable, consistent, efficient wayfinding.

- **Desktop**: local/section navigation conventionally on the left; site-wide nav conventionally horizontal at top; footer nav clearly categorized.
- **Mobile**: frequently used nav (bottom tab bar) should be large and thumb-reachable (ties to Fitts's Law).
- Accordions are fine for simplifying long desktop content pages, but flag them where they hide content that users actually need to scan/compare — accordions increase interaction cost for finding information even as they reduce visual clutter.
- Terminology and interaction patterns must stay consistent across the whole product — same word/icon should always mean the same thing (ties to heuristic #4, Consistency and Standards).

## Forms & Data Entry

Goal: fast, easy, forgiving.

- **Inline validation**: fields should validate as the user moves to the next field (on blur/tab), not only on submit. Submit-only validation that dumps a wall of errors after the fact is a Major-severity finding — it multiplies the user's error-correction burden.
- **Redundant entry (WCAG 2.2 SC 3.3.7)**: information the system already has (previously entered in the same flow, or from a prior session) should be pre-filled or offered for selection rather than re-typed, unless re-entry is essential for security (e.g., re-entering a password to confirm a sensitive change is fine; re-entering your name on the next screen is not).
- Every field needs an associated, visible label (not just a placeholder that disappears on focus) and clear instructions/format hints (e.g., date format) before the user hits an error.
- Related fields should be grouped logically to reduce cognitive strain — ties to Miller's Law for anything with many fields.

## Error Handling & Recovery States

Goal: the app should never leave the user confused about what went wrong or what to do next.

- Error messages must use plain language, precisely state the problem, and constructively suggest a fix. "Error 404" or a raw error code is always a finding — compare against something like "Your password must be at least 8 characters long."
- Audit coverage of all system states, not just the happy path: input validation errors, empty states (a list with zero items), loading states, alerts/toasts, and account recovery flows (e.g., reset password).
- Empty states should guide the user toward the next action (illustration + clear CTA like "Add your first task") rather than presenting a blank, ambiguous screen.
- Destructive-action error/confirmation flows should follow heuristic #3 (User Control and Freedom) — a clear way to cancel or undo.
