# DESIGN

Pointer to [[FieldCast]]'s UI constraints document: `DESIGN.md`

## Rules at a glance

### Theme
- **Light only** — no dark mode toggle, no near-black surfaces
- Background and text must sit within a light palette

### Typography (locked)
- **Geist** — headings and display text only
- **Inter** — body, labels, captions, form fields
- No third typeface. Ever.

### Component sourcing (strict order)
1. **Untitled UI MCP** — check here first, always
2. **Magic UI MCP** — only for animated/motion/marketing components not in Untitled UI
3. **shadcn/ui MCP** — only for base primitives not in Untitled UI
4. **Custom-built** — only if genuinely unavailable above; must be flagged explicitly

### Signature visual
The live scorecard Canvas overlay above the video player is the primary visual. Everything else (nav, tables, fixtures) should be quieter.

### Responsive
Mobile-first. Visible focus states. Reduced-motion support.

## Related
- [[Frontend — Next.js]] — where these rules are applied
- [[RULES]] — component sourcing is a hard rule, not a suggestion
