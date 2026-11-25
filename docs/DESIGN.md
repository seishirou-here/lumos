---
version: alpha
name: Lumos
description: "Obsidian-dark personal command center with dual-theme accents: Kuro Sakura (rose) and Kuro Midori (emerald)."
colors:
  # ── Kuro Sakura (default) ──────────────────────────────
  primary: "#09090b"
  surface: "#0d0b0e"
  elevated: "#141114"
  line: "#2d272b"
  line-strong: "#3f353b"
  accent: "#fb7185"
  accent-soft: "#fda4af"
  accent-strong: "#f43f5e"
  accent-ink: "#20090f"
  glow: "#fb7185"
  # ── Semantic (theme-agnostic) ──────────────────────────
  ink: "#f4f4f5"
  ink-muted: "#a1a1aa"
  ink-faint: "#71717a"
  status-online: "#34d399"
  status-syncing: "#38bdf8"
  status-offline: "#fbbf24"
  status-failed: "#fb7185"
  # ── Kuro Midori (alt theme, documented for parity) ─────
  forest-primary: "#090a09"
  forest-surface: "#0b0f0c"
  forest-elevated: "#101612"
  forest-line: "#232e27"
  forest-line-strong: "#344439"
  forest-accent: "#34d399"
  forest-accent-soft: "#6ee7b7"
  forest-accent-strong: "#10b981"
  forest-accent-ink: "#03160f"
  forest-glow: "#10b981"
typography:
  brand:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.16em"
  subtitle:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.2em"
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.625
  body-desktop:
    fontFamily: Inter
    fontSize: 14.5px
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
  label-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
    letterSpacing: "0.04em"
    lineHeight: 1.4
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-dump:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: 16px
  button-dump-hover:
    backgroundColor: "{colors.accent-soft}"
  button-dump-active:
    backgroundColor: "{colors.accent-strong}"
  button-dump-disabled:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.ink-muted}"
  card-memo:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 16px
  card-memo-hover:
    backgroundColor: "{colors.surface}"
  pill-status:
    rounded: "{rounded.full}"
    padding: 12px
  pill-tag:
    backgroundColor: "{colors.accent-ink}"
    textColor: "{colors.accent}"
    rounded: "{rounded.xs}"
    padding: 4px
  composer:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  composer-focused:
    backgroundColor: "{colors.surface}"
  header:
    backgroundColor: "{colors.primary}"
---

## Overview

Lumos is a personal command center and quick-dump PWA built for one user. The
visual identity is anchored in near-OLED obsidian blacks — warm-tinted, never
blue-grey — with a single accent color that shifts between two named themes:

- **Kuro Sakura** 🌸 — rose petals on obsidian. Default.
- **Kuro Midori** 🌿 — emerald botanicals on slate-black.

The mood is calm, private, and precise. UI density favours a mobile-first
quick-dump flow: one column, docked composer, memo stream. Texture comes from
film grain and a soft ambient glow, not decoration.

Font feature settings `cv02 cv03 cv04 cv11` are active on Inter to sharpen
letterforms on small text.

## Colors

- **Primary (`#09090b`):** Near-black page background. Warm-shifted via the
  surface/elevated layers above it; never a cold `#000`.
- **Surface (`#0d0b0e`):** Card and composer fill. Barely visible lift from bg.
- **Elevated (`#141114`):** Hover/pressed states, tooltips, dropdowns.
- **Line / Line-Strong:** Border tones. Theme-tinted, not neutral grey.
- **Accent (`#fb7185` sakura / `#34d399` forest):** The single interaction
  color. Buttons, focus rings, caret, selection highlight, ambient glow.
  Everything interactive is accent; nothing decorative is.
- **Accent-Soft / Accent-Strong:** Hover-up and active-down states.
- **Accent-Ink (`#20090f`):** Text on accent-filled surfaces (e.g. the Dump
  button label). Dark enough for contrast, tinted to match.
- **Ink (`#f4f4f5` · zinc-100):** Primary text.
- **Ink-Muted (`#a1a1aa` · zinc-400):** Timestamps, metadata, secondary labels.
- **Ink-Faint (`#71717a` · zinc-500):** Placeholders, disabled text, hints.

Status colors are fixed across both themes:

| Status     | Color     | Usage                |
|------------|-----------|----------------------|
| Online     | `#34d399` | Connected to host    |
| Syncing    | `#38bdf8` | Push/pull in flight  |
| Offline    | `#fbbf24` | Host unreachable     |
| Failed     | `#fb7185` | Sync error           |

## Typography

Inter is the only typeface. The font stack falls through to Geist, then
system-ui. Hierarchy is carried by size, weight, and letter-spacing — never
by switching font families.

| Role         | Size    | Weight | Spacing  | Use                          |
|--------------|---------|--------|----------|------------------------------|
| Brand        | 17px    | 600    | 0.16em   | "LUMOS" header wordmark      |
| Subtitle     | 10px    | 500    | 0.2em    | Subhead beneath brand        |
| Body         | 15/14.5px | 400  | default  | Memo content (mobile/desktop)|
| Label        | 11px    | 500    | default  | Status pills, timestamps     |
| Label-XS     | 10px    | 500    | default  | Tag pills, footer            |
| Caption      | 11px    | 500    | 0.04em   | Tooltips, counter text       |

Font features active: `cv02` `cv03` `cv04` `cv11` (alternate character
variants for Inter).

## Layout

Mobile-first, single-column, max-width `xl` (576px content).

- Composer is docked to the bottom on mobile (`< 640px`), inline at the top
  on desktop.
- Memo stream flows vertically with staggered `rise-in` entrance animation.
- Header is sticky with backdrop-blur.
- Safe-area insets (`env(safe-area-inset-*)`) are respected for notch/home-bar
  devices.

Spacing uses a 4px baseline grid:

| Token | Value | Use                           |
|-------|-------|-------------------------------|
| xs    | 4px   | Inline gaps, pill padding     |
| sm    | 8px   | Tight component gaps          |
| md    | 16px  | Card padding, section gaps    |
| lg    | 24px  | Between components            |
| xl    | 48px  | Section breaks                |

## Elevation & Depth

Elevation is conveyed through layered shadows and subtle inset highlights,
not border-width or colour alone.

| Token        | Value                                                                              |
|--------------|------------------------------------------------------------------------------------|
| panel        | `0 18px 38px -28px rgb(0 0 0 / 0.9), inset 0 1px 0 0 rgb(255 255 255 / 0.035)`   |
| panel-raised | `0 24px 48px -30px rgb(0 0 0 / 0.95), inset 0 1px 0 0 rgb(255 255 255 / 0.045)`  |
| glow         | `0 0 40px -12px rgb(accent / 0.5)` — accent-tinted ambient halo                   |

Film grain texture at 2.2% opacity (screen blend) prevents OLED black from
feeling synthetic. An ambient glow radial gradient sits at the viewport top.

## Shapes

| Token | Radius | Use                                |
|-------|--------|------------------------------------|
| xs    | 4px    | Hashtag chips                      |
| sm    | 8px    | General small rounding             |
| md    | 12px   | Buttons (Dump, Tag, toolbar)       |
| lg    | 16px   | Cards, composer, tooltips          |
| full  | 9999px | Status pills, theme toggle, dots   |

## Components

### Dump Button (`button-dump`)

The only high-emphasis action. Accent fill, dark accent-ink text. Glow shadow
on hover. Scale-down on press (`active:scale-95`). Disabled state drops to
elevated surface with faint text, no shadow.

### Memo Card (`card-memo`)

Surface fill, 16px padding, `lg` radius. Border `line` at 80% opacity, lifts
to `line-strong` on hover. Panel shadow. Rise-in animation staggered by
`index × 40ms` (capped at 6).

### Status Pill (`pill-status`)

Full-radius capsule. Coloured border + tinted background at low alpha + status
text. Breathing dot animation when connected or syncing.

### Hashtag Chip (`pill-tag`)

Inline `xs`-radius chip. Full-strength accent text on a barely-visible accent
background (8% alpha) with a subtle ring (12% alpha).

### Composer (`composer`)

Surface fill, `lg` radius, `line` border. On focus: accent-tinted border
(40%), glow shadow, accent ring (15%). Textarea has accent-coloured caret.

### Header (`header`)

Sticky, blurred backdrop (`backdrop-blur-xl`), 80% bg opacity. Bottom border
at 60% line. Contains brand wordmark, theme toggle, and status pill.

## Do's and Don'ts

- **Do** use the CSS variable system (`--lumos-*` as RGB triplets) for all
  colour references. This enables the dual-theme switch with zero JS re-renders.
- **Do** keep accent as the single interactive colour. If it's clickable or
  focusable, it's accent. If it's not, it isn't.
- **Do** respect `prefers-reduced-motion` — all animations have a
  `0.01ms !important` override for users who need it.
- **Don't** introduce new hues outside the defined palette without extending
  the token system first.
- **Don't** use pure `#000000` for backgrounds — the warm-shifted blacks are
  intentional and part of the identity.
- **Don't** add decorative elements (illustrations, icons for aesthetics,
  gradient backgrounds). Texture comes from grain and glow only.
