# CaseOS Design System — "Obsidian Intelligence"

Adopted 2026-07-25. Derived from a Google Stitch generation, refactored into the
CaseOS architecture. This document is the contract: every screen consumes these
tokens and primitives. One-off styling is a bug.

## 1. Identity

Obsidian ground, cyan light, glass depth. The product should read as a precise
instrument for reading difficult documents — luminous, quiet, and dense with
information rather than decorated.

CaseOS is **domain-neutral**. It serves anyone working through complex document
collections: researchers, analysts, investigators, compliance teams, journalists,
archivists. No legal terminology, no legal iconography, no legal examples
anywhere in the UI. `Matter` and `Firm` are internal model names only; users see
"project" and "workspace".

## 2. Colour

Colour carries meaning before it carries style. Chrome gets exactly one hue;
every other saturated hue in the product is reserved for a specific claim about
where information came from.

| Role | Hue | Reserved for |
|---|---|---|
| **Chrome / primary** | Cyan `h≈196` | Navigation, focus, links, brand, interactive affordance |
| **Citation** | Bronze-gold `h≈82` | Claims traced to an uploaded document chunk. Nothing else. |
| **AI context** | Violet `h≈296` | Content the model generated from its own knowledge |
| **External research** | Indigo `h≈268` | Verified material retrieved from the open web |
| **Grounded** | Emerald `h≈158` | Review approved / ingestion ready |
| **Pending** | Amber-orange `h≈62` | Awaiting review / processing |
| **Rejected** | Red `h≈24` | Review rejected / ingestion failed |

Two rules follow:

- **Cyan is never semantic.** It means "you can interact with this", never "this
  is trustworthy". A cyan citation pill would be a bug.
- **The provenance trio is never chrome.** Bronze, violet, and indigo never
  appear on a button, a nav item, or a focus ring.

The Stitch source used violet (`#571bc1`) as the active-navigation fill. We
deviate: active nav uses a cyan-tinted surface, because violet must keep meaning
"the model wrote this."

### Surface ladder

Six steps, dark-mode values from Stitch, light mode derived by inverting the
ladder against a cool near-white ground.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--surface-lowest` | `#0e0e0f` | white | Wells, document canvases, insets |
| `--background` | `#131314` | `oklch(.985 .002 265)` | Page ground |
| `--card` | `#1c1b1c` | white | Default raised surface |
| `--surface` | `#201f20` | `#fafafa` | Panels, secondary surfaces |
| `--muted` / `--accent` | `#2a2a2b` | `#f4f4f5` | Hover, inactive fills |
| `--surface-highest` | `#353436` | `#e9e9ec` | Chips, pressed states |

Light mode is a first-class variant, not an afterthought. Cyan darkens to
`oklch(.52 .11 200)` in light mode so text and icons hold WCAG AA; the raw
`#00dbe7` is unreadable on white.

## 3. Typography

| Role | Family | Size / leading / tracking / weight |
|---|---|---|
| `display-lg` | Hanken Grotesk | 64 / 1.1 / -0.02em / 700 |
| `headline-lg` | Hanken Grotesk | 40 / 1.2 / -0.01em / 600 |
| `headline-md` | Hanken Grotesk | 28 / 1.25 / -0.01em / 600 |
| `headline-sm` | Hanken Grotesk | 20 / 1.3 / 600 |
| `body-lg` | Inter | 18 / 1.6 / 400 |
| `body-md` | Inter | 16 / 1.6 / 400 |
| `body-sm` | Inter | 14 / 1.55 / 400 |
| `label-md` | Inter | 14 / 1.4 / 500 |
| `meta-sm` | JetBrains Mono | 12 / 1.4 / 0.05em / 500 |

Display sizes step down on mobile (`display-lg` → 40px, `headline-lg` → 32px).
All three families are self-hosted through `next/font/google` — no CDN, no
render-blocking stylesheet, no layout shift.

Mono is reserved for metadata: timestamps, counts, record ids, citation markers,
status labels. It is the typographic signal for "machine-generated fact".
Tabular figures everywhere numbers are compared.

## 4. Spacing, radius, elevation

**Spacing** follows a 4px unit. Named tokens: `gutter` 24px, `margin-mobile`
20px, `margin-desktop` 64px, `container-max` 1440px.

**Radius** is generous — the single strongest signal of the Stitch language.

| Token | Value | Use |
|---|---|---|
| `sm` | 6px | Chips, inline markers |
| `md` | 8px | Small controls |
| `lg` | 12px | Inputs, compact buttons |
| `xl` | 16px | Buttons, list rows, nav items |
| `2xl` | 24px | Cards, panels |
| `3xl` | 32px | Hero surfaces, large containers |
| `4xl` | 40px | Modals |

**Shadows** are two-layer (tight contact + wide ambient) and tinted with the
ground colour rather than pure black, so surfaces read as material.

## 5. Glassmorphism

Three tiers. Glass is for surfaces that float *above* content — never for
content itself, because backdrop blur over text costs legibility.

- `.glass` — 16px blur, translucent card. Popovers, floating toolbars.
- `.glass-panel` — 32px blur + inset top highlight. Sidebar, top bar, modals.
- `.glass-well` — subtle inset, no blur. Recessed areas inside cards.

Every glass surface carries a hairline border (`--glass-border`) and, in dark
mode, a 1px inset white highlight along the top edge. That highlight is what
makes glass read as a physical pane rather than a transparency.

## 6. Motion

| Token | Curve | Use |
|---|---|---|
| `--ease-liquid` | `cubic-bezier(.23,1,.32,1)` | Signature: panels, reveals, layout |
| `--ease-out-quart` | `cubic-bezier(.25,1,.5,1)` | Entering elements |
| `--ease-in-quart` | `cubic-bezier(.5,0,.75,0)` | Exiting elements |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | Colour and small state changes |

Durations: 150ms (colour/opacity), 250ms (transform/size), 400ms (panel), 700ms
(hero/page). Ambient loops run 20–30s.

Only `transform`, `opacity`, and `filter` animate. Nothing animates layout.

**Reduced motion is honoured globally** in a single base rule that zeroes every
animation and transition duration, so no future component can opt out by
forgetting. Ambient effects freeze rather than disappear.

The Stitch source shipped a full-screen WebGL fragment shader. We do not: it
costs a continuous GPU draw on every route, cannot be frozen for reduced-motion
without extra machinery, and is invisible behind content. The same aurora is
produced by three blurred radial gradients on GPU-composited transforms at zero
JS cost.

## 7. Iconography

`lucide-react`, 1.5px stroke, sized in 16/18/20/24. Stitch's Material Symbols
webfont is not shipped — it is ~250KB of network for glyphs lucide already has.

Icons are never the only carrier of meaning; every status icon pairs with a text
label or `aria-label`. Domain-neutral choices only — no gavels, scales, or
courthouse metaphors.

## 8. Interaction patterns

- **Focus**: 3px cyan ring at 50% opacity, offset from the element. Never
  removed, never replaced by colour alone.
- **Hover**: surfaces lift one ladder step; interactive cards add a 1px border
  brightening and an optional cyan aura glow. Translation never exceeds 2px.
- **Active nav**: a shared `layoutId` element slides between items so the motion
  carries where you came from.
- **Disabled**: 50% opacity, no pointer events, `aria-disabled`.
- **Loading**: shimmer skeletons matching the final layout's shape — never a
  spinner where a skeleton can describe what is arriving.
- **Empty states**: icon, one-line title, one-sentence explanation, and a single
  primary action. Never a dead end.

## 9. Architecture rules

- Tokens live in `app/globals.css` under `@theme`. Components consume Tailwind
  utilities that resolve to those tokens. No hex values in components.
- Shared primitives live in `components/ui`. A page that needs a new visual
  pattern adds a primitive rather than inlining one.
- Server components by default; `"use client"` only where interaction demands it.
- This redesign changes presentation only. No server action, Prisma query,
  auth check, `firmId` scope, ingestion step, or AI call changes.

## 10. Scope

Redesigned: `/`, `/sign-in`, `/sign-up`, `/onboarding`, `/invite/[token]`,
`/dashboard`, `/matters`, `/matters/new`, `/matters/[matterId]`, `/documents`,
`/settings/members`, plus `not-found`, error boundaries, and every loading state.

Not built: billing, subscriptions, threads, notes, standalone global search,
PDF viewer, document comparison, notification centre. These do not exist in the
application and inventing them would mean new backend, not a redesign.
