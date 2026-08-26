# Motion & Animation Audit

Two separate questions to answer, in order: **(1) is motion missing where it should exist**, and **(2) where motion exists, is it implemented correctly**. Most audits find problems in both directions — dead/static moments that need feedback, and existing animations that are janky, purposeless, or inaccessible.

## Part 1 — Where is motion missing?

Scan every interactive surface for these gaps. Each is a legitimate finding on its own, independent of anything already animated elsewhere:

- **Missing feedback**: a button, toggle, or submit action with no visual acknowledgment of the click/tap. Users are left unsure whether the action registered — this is a Fitts's/heuristic-#1 (visibility of system status) problem as much as a motion one.
- **Jarring instant transitions**: show/hide, route changes, or modal open/close that snap instead of transition. Not everything needs motion, but a hard cut on something the user is visually tracking (a panel appearing where their eyes already are) reads as broken rather than fast.
- **Unclear spatial/hierarchical relationships**: when a new element's relationship to what triggered it isn't obvious (e.g., a dropdown that just appears with no connection to the button that opened it), a shared-origin transition would clarify it. Flag the absence, not just the aesthetics.
- **Loading states with no signal**: a wait with zero feedback (no spinner, skeleton, or progress indicator) — the 10-second attention-loss threshold from accessibility-wcag22.md applies directly here.

Don't flag "missing" motion on every static element — over-animation is its own failure mode (see below). The question is whether the *absence* actually costs the user clarity or confidence, not whether more motion would be "nicer."

## Part 2 — Where motion exists, is it correct?

### Purpose check (do this first)

For every animation found, ask: does it convey state, give feedback, or clarify hierarchy — or does it exist purely for decoration? Decorative motion with no functional purpose (fade-and-rise-on-scroll applied to every section regardless of content) is a common AI-generated-design tell and should be flagged as noise even if smoothly executed. Reserve elaborate motion for moments that earn it; a well-rehearsed single hero entrance beats scattered micro-interactions everywhere.

### Timing

Check durations against these bands — anything well outside its band is worth flagging:

| Duration | Expected use | Flag if... |
|---|---|---|
| 100–150ms | Instant feedback (button press, toggle, color change) | Feels laggy above ~150ms |
| 200–300ms | State changes (menu open, tooltip, hover) | |
| 300–500ms | Layout changes (accordion, modal, drawer) | |
| 500–800ms | Entrance animations (page load, hero reveal) | Anything routine (not a hero moment) taking this long |

- Anything over **500ms on feedback-tier interactions** (button clicks, toggles) is close to always wrong — flag as Major.
- Exit animations should run faster than their matching entrance (~75% of the enter duration) — a modal that closes as slowly as it opened is a common miss.
- For staggered lists (cards in a grid, list items appearing), total stagger time should stay bounded — e.g. 10 items at 50ms each = 500ms total. If a list can have many items, per-item delay should shrink or cap out rather than let total time balloon with list length. A whole-section fade-on-scroll is not a "list" and shouldn't use stagger logic at all.

### Easing

- Flag bounce or elastic easing curves (`cubic-bezier(0.34, 1.56, 0.64, 1)` and similar overshoot curves) — these read as dated and draw attention to the animation itself rather than the content.
- Prefer natural deceleration curves (ease-out family) for entrances; default CSS easing (`ease`, linear) usually feels mechanical compared to a deliberate ease-out-quart/quint/expo curve.

### Performance

- **Layout-driving properties animated casually** (`width`, `height`, `top`, `left`, margins) — these force layout recalculation on every frame and are a common source of visible jank. Flag any animation touching these directly; check whether `transform`/`opacity`, a FLIP-style transform, or `grid-template-rows` could achieve the same effect without the layout cost.
- **`will-change` applied broadly** (e.g., on a whole page or every card in a list preemptively) rather than scoped to the moment it's needed (`:hover`, an `.animating` class) — this wastes GPU memory and can hurt performance rather than help it.
- **Scroll-triggered animation via scroll event listeners** instead of `IntersectionObserver` — scroll listeners fire far more often and are a common performance drag; flag if found in the code.
- **Unbounded expensive effects**: blur/filter/backdrop-filter/shadow effects applied across large or unbounded areas rather than small, isolated ones.
- If you can observe the running interface (not just code), watch for visible frame drops/stutter on the target device class — note where jank is visible even if you can't measure exact FPS from a screenshot.

### Accessibility — `prefers-reduced-motion`

This is a hard requirement, not a nice-to-have — treat any animated interface with no reduced-motion handling as a **Critical** accessibility finding, on the same tier as a WCAG violation (it is one, functionally). Check for something equivalent to:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Confirm it's present *and* that it doesn't just visually disable motion while leaving functional side effects (e.g., a carousel that still auto-advances on a timer even with animation duration zeroed).

### Perceived performance

- **~80ms threshold**: micro-interactions (button feedback, toggles) should register within roughly 80ms to feel instant — this is a perceptual buffering window, not an arbitrary number. Anything animated slower than this for pure feedback purposes is a candidate for shortening.
- **Optimistic UI**: for low-stakes, easily-reversible actions (likes, follows, saves), the interface should update immediately and reconcile with the server after, rather than waiting for a round-trip before showing any change. Flag the absence of this pattern on obviously low-stakes actions; flag its *presence* as a bug on high-stakes ones (payments, destructive deletes) where an optimistic update could mislead the user about whether something actually succeeded.
- **Preemptive start / early completion**: check whether loading sequences begin transitioning immediately (skeleton UI, progressive image loads) rather than showing nothing until the full response arrives.

## Severity guide specific to motion findings

- **Critical**: no `prefers-reduced-motion` handling anywhere in an animation-heavy interface; an animation that blocks user interaction with no clear intentional reason.
- **Major**: layout-property animation causing visible jank; feedback interactions taking >500ms; bounce/elastic easing on primary UI; missing feedback on a primary action (submit, delete, save).
- **Minor**: inconsistent timing across similar interactions (one button uses 150ms hover, another uses 400ms); a missing exit-animation speed-up; decorative motion that isn't harmful but isn't earning its place either.
- **Nitpick**: easing curve choice on a rarely-seen entrance; stagger delay slightly longer than ideal on a short list.

## Report integration

Add a **Motion & Animation** section to the standard report table (see SKILL.md's report template) alongside Spacing/Sizing, Navigation, Forms, and Accessibility. Use the same columns: Element | Issue | Principle/Rule Violated | Severity | Fix.
