# Tutor More Academy — Design system

All tokens live in `src/app.css` (`@theme`). Use the tokens and classes below; avoid raw Tailwind
palette colours (`red-500`, `emerald-600`…) and hex values in components.

## Colour

| Token | Use |
|-------|-----|
| `brand-600` (#e11d2a) | **The** main action (`btn-primary`), active nav item, key accents. One red CTA per screen area. |
| `brand-50/100` | Soft tint behind brand icons, subject code tiles |
| `brand-700` | Brand-coloured text on light backgrounds, destructive text |
| `sun-400` (#ffc400) | Accent on dark/red surfaces only (`btn-sun`, QR timer ring) |
| `sun-50…300` | Highlights: pinned items, notices, headline marker |
| `success-*` | Done / present / approved / completed (semantic, not decorative) |
| `ink` | Headings, primary text, `btn-dark` |
| `neutral-800` | Long-form reading text (lesson notes, Q&A, chat, bio) |
| `muted` | Secondary text: meta lines, labels, captions |
| `subtle` | Placeholder-like text and empty values ("ยังไม่ได้ระบุ") |
| `line` | Borders and dividers |
| `canvas` | App background, soft panels, cover areas |

Large surfaces stay **white or canvas**. Full-bleed red is reserved for the subject hero and the
projector QR screen (where high contrast matters).

## Typography

- **Kanit** (`font-sans`, default, weight 300) for all UI.
- **Sarabun** (`font-read`) for anything people *read or write* at length: lesson text
  (`.prose-read` / `<Markdown>`), Q&A, chat bubbles, bios, announcement bodies and those textareas.
- Scale:
  - `.page-title` — one per page (`h1`)
  - `.section-title` — page sections (`h2`)
  - `.card-title` — titles inside cards and sidebars
  - Marketing heroes (landing, subject cover, QR screen) may use larger custom sizes.
- Weights: `font-medium` for headings, `font-normal` for emphasis in body; `font-semibold` only in heroes.

## Buttons

| Class | When |
|-------|------|
| `btn-primary` (red) | Main action: submit, create, approve, join, send |
| `btn-dark` (black) | Navigation / utility: open class, search, edit profile, close session |
| `btn-soft` | Secondary actions next to a primary |
| `btn-ghost` | Tertiary / icon buttons |
| `btn-outline` | Neutral actions on busy areas (CSV export, prev lesson) |
| `btn-danger` | Destructive (decline, delete) |
| `btn-sun` | Only on dark or red backgrounds |

## Shape & spacing

- Pills for buttons, chips and search (`rounded-full`).
- Cards `rounded-2xl` (`.card`), large panels/heroes `rounded-3xl`/`rounded-[28px]`.
- Status uses `<StatusBadge>`; empty lists use `<EmptyState>`.
