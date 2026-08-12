# English Routes & Identifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all public routes and code/file names to English, with auth under real `/auth/*` URLs; keep Serbian UI copy.

**Architecture:** `git mv` App Router folders and `components/profil`, then update every path string (middleware, links, hooks, types, README). No redirects.

**Tech Stack:** Next.js App Router, TypeScript

## Global Constraints

- English identifiers and file/folder names only; Serbian UI strings only
- Auth lives at `app/auth/<page>/` (real URL segment, not `(auth)` route group)
- No redirects from old Serbian URLs
- Do not create missing pages; only rename hrefs/middleware entries
- Components call hooks only (existing data-layer rule)

---

### Task 1: Move auth route folders

**Files:**
- Move: `app/(auth)/layout.tsx` → `app/auth/layout.tsx`
- Move: `app/(auth)/prijava/page.tsx` → `app/auth/login/page.tsx`
- Move: `app/(auth)/registracija/page.tsx` → `app/auth/register/page.tsx`
- Move: `app/(auth)/verifikacija/page.tsx` → `app/auth/verify/page.tsx`
- Move: `app/(auth)/dobrodosli/page.tsx` → `app/auth/welcome/page.tsx`
- Move: `app/(auth)/zaboravljena-lozinka/page.tsx` → `app/auth/forgot-password/page.tsx`
- Move: `app/(auth)/nova-lozinka/page.tsx` → `app/auth/new-password/page.tsx`

- [ ] **Step 1: Create target dirs and git mv**

```bash
mkdir -p app/auth/{login,register,verify,welcome,forgot-password,new-password}
git mv app/\(auth\)/layout.tsx app/auth/layout.tsx
git mv app/\(auth\)/prijava/page.tsx app/auth/login/page.tsx
git mv app/\(auth\)/registracija/page.tsx app/auth/register/page.tsx
git mv app/\(auth\)/verifikacija/page.tsx app/auth/verify/page.tsx
git mv app/\(auth\)/dobrodosli/page.tsx app/auth/welcome/page.tsx
git mv app/\(auth\)/zaboravljena-lozinka/page.tsx app/auth/forgot-password/page.tsx
git mv app/\(auth\)/nova-lozinka/page.tsx app/auth/new-password/page.tsx
rmdir app/\(auth\)/prijava app/\(auth\)/registracija app/\(auth\)/verifikacija app/\(auth\)/dobrodosli app/\(auth\)/zaboravljena-lozinka app/\(auth\)/nova-lozinka app/\(auth\) 2>/dev/null || true
```

- [ ] **Step 2: Verify tree**

```bash
find app/auth -type f | sort
```

Expected: six `page.tsx` files + `layout.tsx` under English names; no `app/(auth)`.

---

### Task 2: Move profile route folders + component folder

**Files:**
- Move: `app/(main)/profil/` → `app/(main)/profile/` (`page.tsx`, `layout.tsx`, `izmeni` → `edit`, `lokacije` → `locations`)
- Move: `components/profil/AddLocationForm.tsx` → `components/profile/AddLocationForm.tsx`

- [ ] **Step 1: git mv profile routes and component**

```bash
mkdir -p app/\(main\)/profile/{edit,locations} components/profile
git mv app/\(main\)/profil/page.tsx app/\(main\)/profile/page.tsx
git mv app/\(main\)/profil/layout.tsx app/\(main\)/profile/layout.tsx
git mv app/\(main\)/profil/izmeni/page.tsx app/\(main\)/profile/edit/page.tsx
git mv app/\(main\)/profil/lokacije/page.tsx app/\(main\)/profile/locations/page.tsx
git mv components/profil/AddLocationForm.tsx components/profile/AddLocationForm.tsx
rmdir app/\(main\)/profil/izmeni app/\(main\)/profil/lokacije app/\(main\)/profil components/profil 2>/dev/null || true
```

- [ ] **Step 2: Fix import in locations page**

In `app/(main)/profile/locations/page.tsx`, change:

```ts
import AddLocationForm from '@/components/profile/AddLocationForm'
```

---

### Task 3: Update middleware route lists

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Replace route constants**

```ts
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify',
]

const RECOVERY_ROUTES = ['/auth/new-password']
const PROTECTED_ROUTES = [
  '/profile',
  '/messages',
  '/bookings',
  '/listings/new',
  '/auth/welcome',
]
```

Redirect targets:

```ts
return NextResponse.redirect(new URL('/auth/forgot-password', request.url))
// ...
const loginUrl = new URL('/auth/login', request.url)
```

---

### Task 4: Auth types + hooks (query params)

**Files:**
- Modify: `types/auth.ts` — `flowType: 'register' | 'reset'`
- Modify: `hooks/auth/useAuth.ts` — paths + `type=register|reset`
- Modify: `app/auth/verify/page.tsx` — read `type`, compare `register`

- [ ] **Step 1: Update `ResendOtpInput`**

```ts
flowType: 'register' | 'reset'
```

- [ ] **Step 2: Update useAuth navigations**

```ts
`/auth/verify?email=...&type=register`
router.push('/auth/welcome')
router.push('/auth/new-password')
`/auth/verify?email=...&type=reset`
```

Verify OTP success branch: `flowType === 'register'`.

- [ ] **Step 3: Update verify page**

```ts
const flowType = searchParams.get('type') || 'register'
// back links: /auth/forgot-password | /auth/register | /auth/login
flowType: flowType === 'reset' ? 'reset' : 'register'
```

---

### Task 5: Update all remaining path references

**Files:**
- Modify: auth pages under `app/auth/*/page.tsx` (cross-links)
- Modify: `app/(main)/profile/**/*.tsx`
- Modify: `components/layout/Header.tsx`, `BottomNav.tsx`
- Modify: `components/home/HomeViews.tsx`
- Modify: `lib/profileCompleteness.ts`
- Modify: `types/user.ts` (comment if any)
- Modify: `README.md`
- Modify: docs that mention old paths (optional cleanup)

**Path replacements (exact):**

| From | To |
|---|---|
| `/prijava` | `/auth/login` |
| `/registracija` | `/auth/register` |
| `/verifikacija` | `/auth/verify` |
| `/dobrodosli` | `/auth/welcome` |
| `/zaboravljena-lozinka` | `/auth/forgot-password` |
| `/nova-lozinka` | `/auth/new-password` |
| `/profil/izmeni` | `/profile/edit` |
| `/profil/lokacije` | `/profile/locations` |
| `/profil/oglasi` | `/profile/listings` |
| `/profil/omiljeni` | `/profile/favorites` |
| `/profil/podesavanja` | `/profile/settings` |
| `/profil/verifikacija` | `/profile/verification` |
| `/profil` | `/profile` |
| `/poruke` | `/messages` |
| `/rezervacije` | `/bookings` |
| `/objavi` | `/listings/new` |
| `/pretraga` | `/search` |

Apply longer prefixes before shorter ones (`/profil/izmeni` before `/profil`).

- [ ] **Step 1: Grep and replace all occurrences in ts/tsx/md**
- [ ] **Step 2: Confirm zero leftover Serbian path segments**

```bash
rg -n '/(prijava|registracija|verifikacija|dobrodosli|nova-lozinka|zaboravljena-lozinka|profil|poruke|rezervacije|objavi|pretraga)(/|"|'\'')' --glob '*.{ts,tsx,md}'
```

Expected: no matches in app code (docs/plans mentioning old paths OK if updated).

---

### Task 6: Verify build

- [ ] **Step 1: Typecheck / build**

```bash
npx tsc --noEmit
npm run build
```

Expected: success

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: English route paths and auth under /auth

EOF
)"
```
