# ShadCN + Tailwind Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire SND web app from inline `style` props to ShadCN/Radix + Tailwind classes with visual parity.

**Architecture:** Initialize shadcn/ui on the existing Next.js 15 + Tailwind v4 app, map SND brand tokens into CSS variables/`@theme`, replace shared primitives, then convert every page/layout to `className` + `cn()` and remove legacy CSS breakpoint hacks.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, Radix UI, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`

## Global Constraints

- English identifiers only; Serbian UI copy only
- No `style={{}}` or `element.style.*` in `app/**` or `components/**` after completion
- Preserve Component → Hook → Service data architecture
- Visual parity: light theme, 8px radius, black primary, brand green accents
- Path alias `@/*` → `./*`
- Do not commit unless the user asks (except when explicitly instructed in a later turn)

## File structure

| Path | Responsibility |
|---|---|
| `components.json` | ShadCN CLI config |
| `lib/utils.ts` | `cn()` helper |
| `app/globals.css` | Theme tokens + base styles; no layout `!important` hacks |
| `components/ui/button.tsx` | ShadCN button |
| `components/ui/input.tsx` | ShadCN input |
| `components/ui/label.tsx` | ShadCN label |
| `components/ui/checkbox.tsx` | ShadCN checkbox |
| `components/ui/avatar.tsx` | ShadCN avatar |
| `components/ui/dropdown-menu.tsx` | ShadCN dropdown |
| `components/ui/separator.tsx` | ShadCN separator |
| `components/ui/badge.tsx` | ShadCN badge |
| `components/ui/field.tsx` (optional) | Labeled input wrapper preserving `label`/`error`/`helperText` |
| `components/ui/Logo.tsx` | Logo with Tailwind only |
| Domain + page files listed in tasks | Converted to Tailwind |

---

### Task 1: Init ShadCN + theme tokens

**Files:**
- Create: `components.json`, `lib/utils.ts`
- Modify: `app/globals.css`, `package.json`, `package-lock.json`
- Possibly modify: `tsconfig.json` (aliases if CLI requires)

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`; theme utilities `bg-primary`, `text-muted-foreground`, `rounded-md`, `text-brand-600`, etc.

- [ ] **Step 1:** Run `npx shadcn@latest init -y` (or non-interactive flags) with CSS variables, neutral/zinc base, aliases `@/components`, `@/lib/utils`, CSS path `app/globals.css`, Tailwind config blank for v4
- [ ] **Step 2:** Merge SND brand tokens into `:root` and `@theme inline` (primary black, brand greens, semantic colors, radius 8px). Keep Inter font unless ShadCN replaces it — preserve Inter for parity
- [ ] **Step 3:** Verify `lib/utils.ts` exports `cn`
- [ ] **Step 4:** Run `npm run build` — expect success (UI still inline-styled)

---

### Task 2: Add ShadCN primitives + replace Button/Input

**Files:**
- Create: `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `checkbox.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `badge.tsx`, and a labeled field helper if needed
- Delete or replace: `components/ui/Button.tsx`, `components/ui/Input.tsx`
- Modify: all files importing `@/components/ui/Button` or `Input`

**Interfaces:**
- Produces: Named exports `{ Button }`, `{ Input }`, `{ Label }`, etc.
- Compatibility: Prefer updating call sites to ShadCN APIs (`variant`, `size`, `className`). For labeled forms, either use `Field` wrapper with `label`/`error`/`helperText` or compose Label+Input+error text at each call site — choose Field wrapper to reduce churn.

- [ ] **Step 1:** `npx shadcn@latest add button input label checkbox avatar dropdown-menu separator badge`
- [ ] **Step 2:** Customize Button variants to match current primary/secondary/ghost/danger + sizes sm/md/lg + `fullWidth` via `className` or `w-full`
- [ ] **Step 3:** Add thin `Field`/`FormField` wrapper if needed for label/error/helper
- [ ] **Step 4:** Update all imports from default `Button`/`Input` to new exports; remove hover/focus style mutation
- [ ] **Step 5:** Delete old PascalCase files if replaced
- [ ] **Step 6:** `npm run build`

---

### Task 3: Layout shell (main, header, bottom nav, logo)

**Files:**
- Modify: `app/(main)/layout.tsx`, `components/layout/Header.tsx`, `components/layout/BottomNav.tsx`, `components/ui/Logo.tsx`, `app/globals.css`

- [ ] **Step 1:** Convert Logo to Tailwind sizing
- [ ] **Step 2:** Convert Header to Tailwind + ShadCN Avatar/DropdownMenu/Button; use `md:`/`lg:` instead of `.snd-header-*` CSS
- [ ] **Step 3:** Convert BottomNav; show with `md:hidden` grid
- [ ] **Step 4:** Convert main layout background/padding
- [ ] **Step 5:** Remove obsolete `.snd-header*` / `.snd-bottom-nav` / `.snd-main-content` rules from `globals.css`
- [ ] **Step 6:** Manual smoke: header guest/auth states at mobile + desktop

---

### Task 4: Auth layout + marketing panel

**Files:**
- Modify: `app/(auth)/layout.tsx`, `components/auth/AuthMarketingPanel.tsx`, `app/globals.css`

- [ ] **Step 1:** Auth shell as CSS grid with `lg:grid-cols-2`; marketing panel `hidden lg:flex`
- [ ] **Step 2:** Convert AuthMarketingPanel (testimonial carousel) to Tailwind; no inline styles
- [ ] **Step 3:** Remove `.snd-auth-*` CSS overrides
- [ ] **Step 4:** Visual check `/prijava` desktop split + mobile form-only

---

### Task 5: Auth form components + pages

**Files:**
- Modify: `components/auth/PasswordInput.tsx`, `PasswordStrength.tsx`, `OtpInput.tsx`
- Modify: `app/(auth)/prijava/page.tsx`, `registracija/page.tsx`, `zaboravljena-lozinka/page.tsx`, `nova-lozinka/page.tsx`, `verifikacija/page.tsx`, `dobrodosli/page.tsx`

- [ ] **Step 1:** Convert PasswordStrength bars/colors via Tailwind classes (map strength → class names)
- [ ] **Step 2:** Convert PasswordInput + OtpInput
- [ ] **Step 3:** Convert each auth page form layout/links/errors to Tailwind + ShadCN controls
- [ ] **Step 4:** `rg "style=\{" app/\(auth\) components/auth` → empty
- [ ] **Step 5:** `npm run build`

---

### Task 6: Profile + home + not-found

**Files:**
- Modify: `app/(main)/profil/layout.tsx`, `page.tsx`, `izmeni/page.tsx`, `lokacije/page.tsx`
- Modify: `components/profil/AddLocationForm.tsx`, `components/home/HomeViews.tsx`, `app/not-found.tsx`

- [ ] **Step 1:** Profile layout sidebar/back header via `lg:` utilities; remove `.snd-profile-*` CSS
- [ ] **Step 2:** Convert profile pages + AddLocationForm
- [ ] **Step 3:** Convert HomeViews guest/auth views
- [ ] **Step 4:** Convert not-found
- [ ] **Step 5:** `rg "style=\{" app components` → empty
- [ ] **Step 6:** Remove leftover unused CSS from `globals.css` (keep `@keyframes spin` only if still used — prefer `animate-spin`)
- [ ] **Step 7:** `npm run build` + spot-check key routes

---

### Task 7: Final verification

- [ ] **Step 1:** Grep for `style=`, `.style.`, and dead `snd-` CSS classes
- [ ] **Step 2:** `npm run lint` / `npm run build` / `npm test`
- [ ] **Step 3:** Summarize remaining intentional CSS (theme tokens, base resets only)
