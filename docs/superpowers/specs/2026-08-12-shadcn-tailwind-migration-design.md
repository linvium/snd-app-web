# ShadCN + Tailwind Migration Design

**Date:** 2026-08-12  
**Status:** Approved  
**Approach:** Foundation → replace primitives → convert pages (full ShadCN)

## Problem

The app styles almost everything with React `style={{}}` (and occasional DOM `element.style` mutation). Tailwind v4 is installed but barely used. ShadCN/Radix are not present. This fights the intended stack and makes responsive/hover/focus styling fragile.

## Goals

1. Install and configure shadcn/ui for Next.js 15 + Tailwind v4.
2. Map existing SND brand tokens into ShadCN CSS variables + `@theme inline`.
3. Replace custom `Button` / `Input` with ShadCN-based primitives (plus Label, Checkbox, Avatar, DropdownMenu, Separator, Badge as needed).
4. Convert **all** app/component TSX off inline `style` props to Tailwind `className` (+ `cn()`).
5. Remove `globals.css` media-query `!important` layout hacks once Tailwind breakpoints cover them.
6. Preserve visual parity (light theme, 8px radius, black primary actions, brand green accents) and Serbian UI copy.

## Non-goals

- Visual redesign / new marketing direction
- Dark mode
- React Hook Form / Zod adoption (unless required by a ShadCN add)
- Changing auth/data architecture

## Constraints

- English identifiers only; Serbian UI strings only
- Components still call hooks, not services/Supabase
- No `style=` / `element.style.*` in application TSX after migration
- Path alias `@/*` → project root (already configured)

## Theme mapping

| Current token | ShadCN / Tailwind role |
|---|---|
| `--color-primary` / hover / foreground | `--primary`, `--primary-foreground` |
| Brand green scale | Keep as `--brand-*`; use for links/accents (`text-brand-600`) |
| Gray scale | `--background`, `--foreground`, `--muted`, `--border`, `--input` |
| `--color-error` / success / warning / info | `--destructive` + keep semantic brand helpers |
| `--radius-*` (8px) | `--radius` = 0.5rem |

## Component strategy

| Area | Decision |
|---|---|
| `components/ui/button.tsx` | ShadCN Button; update imports; drop default export wrappers if possible |
| `components/ui/input.tsx` | ShadCN Input + optional labeled field wrapper for `label`/`error`/`helperText` API |
| `PasswordInput`, `OtpInput`, `PasswordStrength` | Keep domain components; restyle with Tailwind |
| `Logo` | Tailwind sizing only |
| Header / BottomNav / layouts | Pure Tailwind responsive utilities |
| Auth / profile / home pages | Convert layouts and typography to classes; use ShadCN controls |

## Success criteria

- `rg 'style=\{' --glob '*.tsx'` returns no matches under `app/` and `components/`
- ShadCN `components.json` + `lib/utils.ts` exist
- Shared controls use Radix-backed ShadCN components where interactive
- App builds (`npm run build`) and critical screens render at mobile + desktop breakpoints
- Visual parity: black primary buttons, brand green links, 8px corners, gray-50 page background

## Implementation order

1. Init ShadCN + theme tokens + `cn()`
2. Add/replace UI primitives; update all Button/Input imports
3. Convert layout shell (main, header, bottom nav, auth layout)
4. Convert auth pages + marketing panel
5. Convert profile + home + not-found
6. Delete obsolete CSS overrides; final grep + build verification
