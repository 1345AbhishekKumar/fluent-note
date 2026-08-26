# Polish Checklist — Measurable Criteria by Dimension

Every item below has a concrete, checkable standard. Use these as the criteria column in the audit report. "Quick Win" = local fix, isolated blast radius. "Structural Overhaul" = touches the design system itself.

## Typography

- **Type scale consistency** (Quick Win): every text element (H1–H6, body, caption, label) uses a size/weight/style from the established scale — no one-off font-sizes.
- **Line height** (Quick Win): ~1.5x font size for body text.
- **Line length**: 45–75 characters per line for body text.
- **Modular scale** (Structural Overhaul): if no type scale exists, define one using a consistent ratio (e.g. golden ratio, 1.25x/1.333x steps) rather than ad hoc sizes.
- **Widows & orphans**: no single words stranded on the last line of a paragraph/button.
- **Kerning**: adjust letter-spacing on large headlines where default tracking looks loose.
- **Font loading**: no visible FOUT/FOIT flash — use `font-display: swap` or preload critical fonts.

## Spacing, Sizing & Grid

- **Baseline grid** (Structural Overhaul if absent): all spacing in multiples of a base unit — 4px or 8px increments.
- **Spacing tokens**: no arbitrary values (e.g. Tailwind `p-[13px]`) when a token/scale exists — that's a missing-token or one-off-implementation drift, not a style choice.
- **Optical alignment**: icons/glyphs often need a small offset to *look* centered even when they're numerically centered — check visually, not just in devtools.
- **Responsive consistency**: spacing and alignment hold at each breakpoint, not just desktop.
- **Last-pixel check**: no trailing whitespace, no un-flush edge elements, nothing orphaned at the bottom of a scroll container.

## Color & Contrast

- **Text contrast**: minimum **4.5:1** against background; large text (≥18pt, or ≥14pt bold) minimum **3:1**.
- **UI element contrast**: interactive elements (buttons, icons, inputs) minimum **3:1** against adjacent non-text elements.
- **Focus indicator contrast**: at least **3:1** against the unfocused state, indicator at least **2 CSS px thick**.
- **Token usage**: every color traces to a token with a single semantic purpose (primary action, warning, success, etc.) — no hardcoded hex values, no one color used for two unrelated meanings.
- **Gray-on-color**: never place gray text on a colored background — use a tint/shade of that color or an alpha-transparent version of the text color instead.
- **Theme consistency**: check dark/light (or other theme variants) — a fix in one theme that isn't mirrored in the other is a common miss.
- **Data viz**: charts/graphs never rely on color alone — pair with pattern, label, or icon for color-vision-deficient users.

## Interaction States

Every interactive element needs, at minimum: **default, hover, focus, active/pressed, disabled**. Add **loading, error, success** for elements that trigger async actions or validation. A missing state is a functional gap, not cosmetic — flag as such.

- **Disabled**: visually distinguishable (opacity/color change) AND non-interactive (not just styled to look disabled).
- **Focus**: visible on every focusable element, never removed without a replacement indicator.
- **Loading**: every action triggering a server response shows a spinner, skeleton, or equivalent — never a blank/frozen UI.

## Micro-interactions & Animation

- **Duration**: most transitions 100–300ms; complex/multi-element transitions (list reorder, page transition) up to 350–500ms max.
- **Doherty threshold**: system responses should complete within 400ms to feel instantaneous — anything visibly longer needs a loading state, not just a longer animation.
- **Easing**: use ease-out-quart/quint/expo style curves for natural deceleration. Avoid linear (feels robotic) and avoid bounce/elastic (feels dated/cartoonish) unless there's a specific playful-brand reason and it's used consistently.
- **Choreography**: when multiple elements animate together, sequence them (stagger, don't fire all at once) so the motion reads as one coherent event, not simultaneous noise.
- **Optimistic UI**: reversible actions (toggle, add-to-list) update the UI immediately, before server confirmation, to feel responsive — reserve pessimistic (wait-for-server) updates for irreversible or high-stakes actions.
- **prefers-reduced-motion**: respected — decorative motion disabled, functional motion (e.g. a loading spinner) can remain but should degrade to something equally clear.
- **Content that moves**: anything that auto-updates, blinks, or moves for more than 5 seconds must be pausable/stoppable by the user.

## Content & Copy

- **Actionable errors**: every error message states what went wrong AND how to fix it — never just "Something went wrong."
- **Error placement**: adjacent to the field/element it describes, not floated elsewhere on the page.
- **Button labels**: strong active verbs describing the outcome ("Save Changes," "Export Report") — avoid generic "Submit"/"OK" where a more specific label is possible.
- **Confirmation dialogs**: state the consequence plainly, especially for irreversible actions; button labels disambiguate the choice ("Yes, Delete File" / "Cancel," not "OK"/"Cancel").
- **Plain language**: no unexplained technical jargon in user-facing copy.
- **Terminology consistency**: the same concept uses the same noun everywhere (don't call it a "Workspace" here and a "Project" three screens later).
- **Tone consistency**: one voice throughout (Structural Overhaul if this requires a style guide to fix at scale).
- **Capitalization/punctuation**: Title Case vs. Sentence case applied consistently; periods on sentences, not on short labels (unless every label has one).

## Icons & Images

- Consistent icon family/style throughout — no mixing outline and filled sets without a deliberate reason.
- Consistent sizing for a given context (e.g. all inline icons 16px, all nav icons 20px).
- Optical alignment with adjacent text (icons often need a 1-2px nudge to look vertically centered against text baseline).
- Alt text on informative images; empty `alt=""` on purely decorative ones.
- Reserved space / aspect-ratio boxes so images don't cause layout shift while loading.
- 2x assets for high-DPI displays where raster images are used.

## Forms

- Every input has a visible, associated label (not just a placeholder).
- Required-field indicators are consistent across the form.
- Tab order is logical (matches visual left-to-right, top-to-bottom flow).
- Validation timing is consistent app-wide (on-blur vs. on-submit — pick one pattern and stick to it).
- Auto-focus used sparingly and only where it clearly helps (e.g. a search box on a search page, not every modal).

## Accessibility (WCAG 2.2 AA baseline)

- Full keyboard operability — no functionality reachable only via mouse/pointer.
- Visible focus indicator on every focusable element (see Color & Contrast above for the exact thresholds).
- Touch targets minimum **44×44px** for anything on a touch-usable surface.
- ARIA roles/labels on custom (non-native) interactive components.
- Adjustable time limits on any session/task timeout.
- Text and images-of-text meet 4.5:1 contrast (3:1 for large text) — duplicated here because it's WCAG-load-bearing, not just aesthetic.

## Edge Cases & States

- **Empty states**: never a blank view — explain what belongs there and point to the first action (e.g. "No projects yet — create your first one").
- **Loading states**: present for every async action, not just page load.
- **Long content**: test with an unrealistically long name/description — does it truncate gracefully or break layout?
- **No/missing data**: fields with null/undefined values render a placeholder, not "undefined" or a blank gap.
- **Offline**: connectivity status is visible; network-dependent features disable gracefully rather than failing silently.

## Responsiveness

- Test at mobile, tablet, and desktop breakpoints — not just desktop devtools resize.
- No horizontal scroll from overflow content.
- No text under 14px on mobile.
- Content reflows logically, not just shrinks.

## Performance Perception

- **LCP** (Largest Contentful Paint): ≤ 2.5s.
- **CLS** (Cumulative Layout Shift): < 0.1 — no unexpected shifts after initial load, especially from late-loading images/ads/fonts.
- **INP** (Interaction to Next Paint): ≤ 200ms for the large majority of interactions.
- Skeleton screens instead of blank white on full-page loads.
- Lazy-load and/or low-res-placeholder large/below-fold images.
- Above-the-fold content prioritized in render order.

## Code Quality (when fixing, not just auditing)

- No `console.log`/debug output left in.
- No commented-out dead code.
- No unused imports.
- No `any` types or silently-ignored TypeScript errors introduced or left in place.
- Naming follows the codebase's existing conventions.
- Semantic HTML and ARIA used correctly, not just visually correct markup.

## Information Architecture & Flow Shape

This is the one dimension that visual polish can't fix — it requires comparing against neighboring features, not just this one screen.

- **Progressive disclosure**: does this feature reveal the same *amount* at once as comparable features (e.g. don't expose 40 settings fields at once if the rest of the app reveals ~5 at a time)?
- **Flow shape**: modal vs. full-page, inline-edit vs. separate route, save-on-blur vs. explicit-submit, optimistic vs. pessimistic — match whatever the rest of the product already does for comparable actions.
- **Hierarchy weight**: a primary action shouldn't become visually tertiary in one corner of the product, and vice versa.
- **Naming/mental model**: same nouns and verbs as neighboring features for the same concepts.
