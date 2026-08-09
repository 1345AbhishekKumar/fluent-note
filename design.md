# Fluent Notes — Sidebar & Core Design System (`design.md`)

This document defines the official design system for **Fluent Notes**, synthesized directly from the application's implementation, Windows 11 Fluent Design principles, component styles, and theme modes.

---

## 1. Visual Theme & Atmosphere

Fluent Notes incorporates Microsoft Windows 11 **Fluent Design Guidelines**, utilizing **Mica material** as its primary structural surface and **Acrylic translucent materials** for floating menus, popovers, and overlays.

* **Atmosphere:** Modern, fluid, tactile, and highly responsive desktop productivity app with complete Dark and Light theme parity.
* **Surface Strategy:**
  * **Mica Surface (`.win`):** Subtly tinted background sampling the desktop wallpaper beneath with continuous blur (`blur(32px) saturate(1.25)`).
  * **Acrylic Glassmorphism (`.flyout`, `.t-dropdown`):** High-level floating cards with heavy blur (`blur(30px) saturate(1.5)`), subtle borders (`--acr-brd`), and a procedural SVG noise texture overlay (`--acr-noise`).
  * **Wallpaper Layer (`.wall`):**
    * Light Mode (`.wall-l`): Radial gradient (`radial-gradient(120% 90% at 70% 10%, #dfe9ff 0%, #b9c8f2 60%, #9fb0e0 100%)`) with `soft-light` background blend mode.
    * Dark Mode (`.wall-d`): Deep nocturnal radial gradient (`radial-gradient(120% 90% at 70% 10%, #0d1526 0%, #0a0f1d 60%, #070b16 100%)`) with `soft-light` blending and `opacity: 1` when `body[data-wall="dark"]`.
  * **Interactive Reveal (`.rv`):** Radial gradient mouse-spotlight illumination tracking cursor movement (`--mx`, `--my`) to provide tactile depth on hover. In Dark Mode, uses higher opacity white tint (`rgba(255, 255, 255, 0.07)`).

---

## 2. Design Tokens & Color Palette

### 2.1 Theme Surfaces & Color Tokens (Light vs. Dark Parity)

| Token Name | Light Theme | Dark Theme | Functional Description |
| :--- | :--- | :--- | :--- |
| `--mica` | `rgba(243, 243, 243, 0.82)` | `rgba(32, 32, 32, 0.80)` | Main window translucent background |
| `--mica-solid` | `#f3f3f3` | `#202020` | Opaque fallback for overlays & modal frames |
| `--pane` | `rgba(251, 251, 251, 0.55)` | `rgba(255, 255, 255, 0.045)` | Sidebar & pane background surface |
| `--pane-ed` | `rgba(252, 252, 252, 0.78)` | `rgba(255, 255, 255, 0.065)` | Editor pane background surface |
| `--pane-brd` | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.075)` | Pane boundary line |
| `--card` | `#ffffff` | `#2d2d2d` | Container & action row surface |
| `--card-h` | `#f4f6f8` | `#333333` | Card hover state surface |
| `--card-sel` | `#eef5fc` | `#31393f` | Card selected state surface |
| `--card-brd` | `rgba(0, 0, 0, 0.0578)` | `rgba(255, 255, 255, 0.0693)` | Card border |
| `--text1` | `#1a1a1a` | `#ffffff` | Primary high-contrast text |
| `--text2` | `rgba(26, 26, 26, 0.72)` | `rgba(255, 255, 255, 0.75)` | Secondary body & nav text |
| `--text3` | `rgba(26, 26, 26, 0.45)` | `rgba(255, 255, 255, 0.45)` | Muted labels, item counts & shortcut hints |
| `--accent` | `#0067c0` | `#60cdff` | Brand accent color (Windows Blue in Light / Electric Cyan in Dark) |
| `--accent-fill` | `#0067c0` | `#4cc2ff` | Primary action button fill |
| `--accent-fill-h` | `#1a75c7` | `#62c9f2` | Primary action button hover fill |
| `--accent-on` | `#ffffff` | `#06262e` | Text color rendered on top of accent fill (Dark Teal in Dark Mode) |
| `--accent-soft` | `rgba(0, 103, 192, 0.10)` | `rgba(96, 205, 255, 0.13)` | Focus ring background highlight |
| `--accent-brd` | `rgba(0, 103, 192, 0.45)` | `rgba(96, 205, 255, 0.5)` | Focus ring border |
| `--rv-hi` | `rgba(0, 0, 0, 0.055)` | `rgba(255, 255, 255, 0.07)` | Cursor-following reveal highlight |
| `--nav-h` | `rgba(0, 0, 0, 0.045)` | `rgba(255, 255, 255, 0.06)` | Navigation item hover background |
| `--acr` | `rgba(249, 249, 249, 0.82)` | `rgba(44, 44, 44, 0.80)` | Acrylic flyout container background |
| `--acr-brd` | `rgba(0, 0, 0, 0.10)` | `rgba(255, 255, 255, 0.11)` | Acrylic flyout border |
| `--acr-noise` | `0.035` | `0.05` | Texture noise opacity overlay |
| `--input` | `rgba(255, 255, 255, 0.7)` | `rgba(0, 0, 0, 0.28)` | Form input background |
| `--danger` | `#c42b1c` | `#ff99a4` | Destructive action color (Crimson in Light / Soft Pinkish Red in Dark) |
| `--focus` | `#0067c0` | `#60cdff` | Outline focus state ring |
| `--sh-card` | `0 1px 2px rgba(0, 0, 0, .06)` | `0 1px 2px rgba(0, 0, 0, .3)` | Card elevation shadow |
| `--divider` | `rgba(0, 0, 0, 0.08)` | `rgba(255, 255, 255, 0.09)` | Horizontal rules & section dividers |

### 2.2 Dynamic Entity Color Swatches

* **Notebook Color Palette Swatches:**
  * Royal Lavender: `#8470ff`
  * Warm Amber: `#ff9d42`
  * Teal Cyan: `#23b8b8`
  * Coral Rose: `#ff6a8f`
* **Tag Chip Dynamic Color Mixing:**
  * Active tag chip background uses `color-mix(in srgb, var(--tc) 16%, transparent)`
  * Active tag chip border uses `color-mix(in srgb, var(--tc) 45%, transparent)`

### 2.3 Dark Mode Syntax Highlighting Palette (`[data-theme="dark"]`)

| Code Token Type | Light Theme Color | Dark Theme Color | Description |
| :--- | :--- | :--- | :--- |
| `token.comment` | `#7a7a7a` (Italic) | `#8a8a8a` (Italic) | Code comments & prolog |
| `token.property`, `token.number`, `token.boolean` | `#b91d47` | `#f47094` | Numbers, booleans, constants & deleted code |
| `token.string`, `token.selector`, `token.builtin` | `#00a300` | `#6dbb6d` | Strings, selectors, built-in symbols |
| `token.keyword`, `token.atrule`, `token.attr-value` | `#2b579a` | `#68a0f8` | Language keywords, CSS at-rules |
| `token.function`, `token.class-name` | `#7e3878` | `#d69cd2` | Function names & class identifiers |

---

## 3. Typography Rules

* **Font Stack:** `'Inter Variable'`, `'Segoe UI Variable Text'`, `'Segoe UI'`, system-ui, sans-serif.
* **Monospace Stack (Keyboard Shortcuts & Code):** `ui-monospace`, `Consolas`, monospace.

### 3.1 Text Hierarchy & Scales

| Component / Role | Font Size | Weight | Tracking | Color Token |
| :--- | :--- | :--- | :--- | :--- |
| **Section Labels (`.sb-label`)** | `11px` | `600` (SemiBold) | `.05em` (Uppercase) | `--text3` |
| **Primary Nav Item (`.sb-txt`)** | `12.5px` | `500` / `600` selected | Normal | `--text2` / `--text1` |
| **Primary Action (`.sb-new`)** | `12.5px` | `600` (SemiBold) | Normal | `--accent-on` |
| **Tag Chip Label (`.tagchip`)** | `11.5px` | `500` (Medium) | Normal | `--text2` / `--text1` |
| **Count Badges (`.cnt`)** | `10.5px` | `500` (Medium) | Normal | `--text3` |
| **Hotkeys (`.kbd`)** | `10px` | `400` (Regular) | Normal | `--text3` |
| **Modal Heading (`.vm-brand-name`)** | `22px` | `700` (Bold) | `-0.4px` | `--text1` |

---

## 4. Component Stylings & Sidebar Hierarchy

### 4.1 Primary Action Button (`.sb-new`)
* **Dimensions:** Full container width (`100%`), `34px` height, `13px` horizontal padding.
* **Styling:** Pill-like rounded box (`7px` border radius), background `--accent-fill`, text `--accent-on`.
* **Icons:** `15px x 15px` SVG icon (`stroke-width: 2`).
* **Interactions:** Subtle background tint shift to `--accent-fill-h` on hover; scales down on click (`scale(0.97)`).

### 4.2 Navigation Row (`.nav-item`)
* **Dimensions:** `35px` height, `10px` horizontal padding, `6px` border-radius.
* **Visual Anchor (`.ni-bar`):** Absolute-positioned indicator bar on the left edge (`left: 1px`, `width: 3px`, `border-radius: 3px`).
  * Unselected: `height: 0px`
  * Selected (`.sel`): `height: 15px` with `--accent` fill (Electric Cyan `#60cdff` in Dark Mode).
* **Selection State:** `--nav-h` background, `--text1` font color, `600` font weight.

### 4.3 Hierarchical Tree Item (`.tree-row`)
* **Tree Item Heights:** `32px` height, `8px` gap, dynamic `padding-left: level * 12 + 10 px`.
* **Chevron Toggle (`.tree-chevron`):** `18px x 18px` square container, `rotate(-90deg)` collapsed, `rotate(0deg)` expanded (`.open`).
* **Contextual Add Button (`.tree-add-btn`):** `20px x 20px` button, hidden by default (`display: none`), appears on row hover (`display: inline-flex`).
* **Drag-and-Drop Feedback:**
  * Item being dragged (`.dragging`): `opacity: 0.4`.
  * Drop target row (`.drag-over`): `--nav-h` background with `1.5px dashed var(--accent)` outline (`outline-offset: -1px`).

### 4.4 Tag Chips (`.tagchip`)
* **Shape:** Fully pill-shaped (`border-radius: 999px`), `4px 10px` padding.
* **Color Dot Indicator (`.dot`):** `8px x 8px` circular dot with inline `--tc` background color.
* **State Behavior:** Toggles between muted `--nav-h` and custom RGB `color-mix` tint when selected (`.on`).

### 4.5 Acrylic Context Menus & Flyouts (`.flyout`)
* **Container:** Floating Acrylic box (`min-width: 210px`, `max-width: 280px`, `border-radius: 8px`), `blur(30px) saturate(1.5)`. In Dark Mode, background shifts to `rgba(44, 44, 44, 0.80)`.
* **Menu Item (`.fly-item`):** `7px 10px` padding, flex layout with icon, text label, keyboard shortcut (`.kbd`), or checkmark (`.fly-chk`). Supports danger variant (`.danger`) using `--danger` (`#ff99a4` in Dark Mode).
* **Autocomplete & Search Pickers:** Switches container background to `#202020` in Dark Mode with `rgba(255, 255, 255, 0.08)` hover highlighting.

### 4.6 Vault Switcher Manager (`.vault-overlay`)
* **Layout:** Centered two-column modal dialog (`800px x 550px`, `12px` border radius).
* **Left Panel (`.vm-left`):** `280px` width recent vaults list with left active border (`3px solid var(--accent)`).
* **Right Panel (`.vm-right`):** Vault branding hero with gradient logo box (`linear-gradient(135deg, var(--accent-fill), color-mix(in srgb, var(--accent-fill) 50%, #8b5cf6))`), action rows (`.vm-action-row`), and inline vault creation input (`.vm-name-input`).

---

## 5. Comprehensive Motion & Animation System

The Fluent Notes motion system is built on strict timing tiers and custom bezier curves to create responsive, natural, and fluid software interactions.

### 5.1 Animation Duration Scale

```css
:root {
  --duration-stagger: 40ms;     /* Per-item staggered sequence offset */
  --duration-micro: 80ms;       /* Cursor press scale down, hover highlight delay */
  --duration-quick: 150ms;      /* Dropdown/flyout close, chevron rotation, tagchip toggle */
  --duration-fast: 250ms;       /* Dropdown/flyout open, selection bar height grow */
  --duration-medium: 350ms;     /* Sidebar & panel close */
  --duration-slow: 400ms;       /* Panel open, overlay reveal */
  --duration-very-slow: 500ms;  /* Wallpaper transition, badge pop, emphasis moments */
}
```

### 5.2 Easing Curves

```css
:root {
  --ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1);    /* Fluid Windows 11 Deceleration Curve */
  --ease-in-out: ease-in-out;                           /* Smooth S-curve for icon/text morphing */
  --ease-out: ease-out;                                 /* Standard deceleration */
  --ease-linear: linear;                               /* Shimmer & background spinners */
  --ease-bounce: cubic-bezier(0.34, 1.36, 0.64, 1);     /* Playful spring pop for badges */
  --ease-bounce-strong: cubic-bezier(0.34, 3.85, 0.64, 1); /* High tension spring return */
}
```

### 5.3 Transform Scale & Distance Tokens

```css
:root {
  --scale-large: 0.96;    /* Modal dialog open / close initial scale */
  --scale-medium: 0.97;   /* Dropdown menu pre-scale / button active click scale */
  --scale-small: 0.98;    /* Nav item click feedback scale */
  --scale-tiny: 0.99;     /* Closing menu fallback scale */

  --distance-micro: 4px;   /* Micro-text shift */
  --distance-small: 6px;   /* Error shake segment */
  --distance-base: 8px;    /* Menu dropdown slide-down distance */
  --distance-medium: 12px; /* Modal slide-up distance */
}
```

### 5.4 Keyframe Animations & Micro-Interactions

#### 1. Vault Switcher Fade-In (`@keyframes vault-fade-in`)
```css
@keyframes vault-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* Applied to .vault-overlay with 0.18s var(--ease-smooth-out) */
```

#### 2. Vault Switcher Modal Slide-In (`@keyframes vault-slide-in`)
```css
@keyframes vault-slide-in {
  from { transform: translateY(12px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
/* Applied to .vault-manager with 0.3s var(--ease-smooth-out) */
```

#### 3. Selection Indicator Pill Height Transition (`.ni-bar`)
```css
.ni-bar {
  transition: height var(--duration-fast) var(--ease-smooth-out);
}
.nav-item.sel .ni-bar {
  height: 15px; /* Smoothly expands from 0px to 15px on selection */
}
```

#### 4. Tree Chevron Rotation
```css
.tree-chevron {
  transform: rotate(-90deg);
  transition: transform var(--duration-quick) var(--ease-smooth-out),
              background var(--duration-quick) var(--ease-smooth-out);
}
.tree-chevron.open {
  transform: rotate(0deg);
}
```

#### 5. Flyout Popover Scale-and-Fade
```css
.flyout, .t-dropdown {
  transform-origin: var(--fo, top left);
  transform: scale(var(--dropdown-pre-scale));
  opacity: 0;
  transition: transform var(--dropdown-open-dur) var(--ease-smooth-out),
              opacity var(--dropdown-open-dur) var(--ease-smooth-out);
}
.flyout.open, .flyout.is-open {
  transform: scale(1);
  opacity: 1;
}
.flyout.is-closing {
  transform: scale(var(--dropdown-closing-scale));
  opacity: 0;
  transition: transform var(--dropdown-close-dur) var(--ease-smooth-out),
              opacity var(--dropdown-close-dur) var(--ease-smooth-out);
}
```

#### 6. Cursor Reveal Spotlight Effect (`.rv::before`)
```css
.rv::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--duration-quick) var(--ease-smooth-out);
  background: radial-gradient(110px circle at var(--mx, 50%) var(--my, 50%), var(--rv-hi), transparent 72%);
}
.rv:hover::before {
  opacity: 1;
}
```

#### 7. Accessibility Reduced Motion Overrides
```css
@media (prefers-reduced-motion: reduce) {
  .flyout, .t-dropdown, .nav-item, .sb-new, .vault-overlay, .vault-manager {
    transition: none !important;
    animation: none !important;
  }
}
```

---
*Created and maintained as the definitive Design System reference for Fluent Notes.*
