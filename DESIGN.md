# DESIGN.md

Strict UI rules for FieldCast. These are constraints, not suggestions — any agent or contributor generating UI must follow this file exactly. If a requirement here conflicts with a general instinct toward "what looks good," this file wins.

---

## Theme

- **Light theme only.** No dark mode toggle, no dark mode variant, unless explicitly requested in a future revision of this file.
- Background, surface, and text colors must all sit within a light palette (light backgrounds, dark text). Do not introduce a near-black surface or a dark-mode accent as a "signature element" — restraint here is the point, not a missed opportunity.

## Typography — locked

Only two typefaces are permitted anywhere in the product:

- **Geist** — used for headings/display text.
- **Inter** — used for body copy, UI labels, form fields, captions, and data.

Rules:
- No third typeface may be introduced for any reason (no display serif, no monospace flourish, no decorative face) without this file being updated first.
- Do not substitute similar-looking system fonts as a fallback of convenience — if Geist or Inter fails to load, fix the loading, don't swap the font.

## Component Sourcing — strict priority order

All UI components must be sourced through MCP tools in this exact priority order. Do not hand-roll a component from scratch if it is available through any of these first.

1. **Untitled UI MCP (free tier)** — first choice for every component. Check here first, always.
2. **If the component is not available in Untitled UI's free version:**
   - Use **Magic UI MCP** for animated, motion-driven, or marketing-style components (hero sections, animated backgrounds, interactive marketing elements).
   - Use **shadcn/ui MCP** for base primitives and structural components (forms, dialogs, tables, dropdowns, tabs, etc.) not covered by Untitled UI's free tier.
3. **Only if a component genuinely exists in none of the above** may a custom component be built from scratch — and this should be rare. If it happens, flag it explicitly rather than silently building custom UI.

Do not skip straight to Magic UI or shadcn "because it's easier" or "because it looks better" — Untitled UI free tier is checked first for every single component, without exception.

## Design Execution Notes

- Keep the palette restrained and intentional — light theme does not mean generic. Pick 4–6 named accent/neutral values and use them consistently across Cricket/Football/Basketball views rather than inventing new ones per page.
- The live score graphic beside the video player is the signature visual element of this product—it carries the live state, team scores, goal scorers, and connection status. Give it deliberate, considered styling; everything else (navigation, tables, fixtures) should stay quieter by comparison.
- Sport-specific views (cricket scorecard, football event ticker, basketball quarter breakdown) should share one consistent type scale and spacing system — don't let each sport's view drift into its own visual language.
- Responsive down to mobile is non-negotiable — most viewers are on phones. Visible keyboard focus states and reduced-motion support apply as usual.

## Source of Truth

This file governs *how* UI is built (fonts, theme, component sourcing). For *what* the product does and the underlying system architecture, README.md is the source of truth. If the two ever appear to conflict, README.md governs product/architecture decisions and this file governs visual/component decisions — they shouldn't actually overlap.
