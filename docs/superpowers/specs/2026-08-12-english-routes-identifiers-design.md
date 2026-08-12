# English routes & identifiers

**Date:** 2026-08-12  
**Status:** Approved  
**Approach:** Rename App Router folders + update path strings (no redirects)

## Problem

UI copy is correctly Serbian, but many **file/folder names and public URLs** are still Serbian (`/prijava`, `app/(auth)/…`, `components/profil`, etc.). Project rules require English identifiers and file names; only user-facing strings may stay Serbian.

## Goals

1. Public URLs and App Router folders in English.
2. Auth under a **real** `/auth` segment (not a route group): `app/auth/<page>/`.
3. Rename non-route Serbian folders (`components/profil` → `components/profile`).
4. Englishize auth query params used as code values (`tip`/`registracija` → `type`/`register`).
5. Update middleware, links, hooks, README; leave Serbian UI strings untouched.
6. No redirects from old paths (pre-launch).

## Non-goals

- Permanent/temporary redirects from Serbian URLs
- Translating or rewriting UI copy
- Creating pages that do not exist yet (`/search`, `/messages`, `/bookings`, `/listings/new`, profile subpages that are links only)
- Introducing a centralized `lib/routes.ts` (optional later)

## Route map

### Auth (`app/(auth)/` → `app/auth/`)

| Current | New |
|---|---|
| `/prijava` | `/auth/login` |
| `/registracija` | `/auth/register` |
| `/verifikacija` | `/auth/verify` |
| `/dobrodosli` | `/auth/welcome` |
| `/zaboravljena-lozinka` | `/auth/forgot-password` |
| `/nova-lozinka` | `/auth/new-password` |

Auth layout (split marketing panel) lives at `app/auth/layout.tsx`.

### Profile (`app/(main)/profil/` → `app/(main)/profile/`)

| Current | New |
|---|---|
| `/profil` | `/profile` |
| `/profil/izmeni` | `/profile/edit` |
| `/profil/lokacije` | `/profile/locations` |
| `/profil/oglasi` (link only) | `/profile/listings` |
| `/profil/omiljeni` (link only) | `/profile/favorites` |
| `/profil/podesavanja` (link only) | `/profile/settings` |
| `/profil/verifikacija` (link only) | `/profile/verification` |

### Nav / middleware placeholders (no page folders yet)

| Current | New |
|---|---|
| `/poruke` | `/messages` |
| `/rezervacije` | `/bookings` |
| `/objavi` | `/listings/new` |
| `/pretraga` | `/search` |

## Code / identifier changes

- `components/profil/` → `components/profile/`
- Query: `?tip=registracija|reset` → `?type=register|reset`
- `ResendOtpInput.flowType`: `'registracija' | 'reset'` → `'register' | 'reset'`
- Middleware route arrays updated to English paths
- All `href` / `router.push` / completeness `link` fields updated

## Constraints

- English identifiers only; Serbian UI strings only (existing project rule)
- Components still call hooks, not services/Supabase
- Prefer `git mv` to preserve history
- Grep for leftover Serbian path segments before done

## Verification

- `tsc` / build succeeds
- Manual smoke: login, register, verify, forgot/new password, profile, locations
- No Serbian folder names under `app/` or `components/` for routes/modules
