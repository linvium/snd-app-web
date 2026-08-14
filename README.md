# SND App (Web)

Web aplikacija za **SND** — platformu za iznajmljivanje stvari u Srbiji.

## Stack

- [Next.js](https://nextjs.org/) 15 (App Router)
- React 19
- TypeScript
- [Supabase](https://supabase.com/) (auth + database)
- [TanStack Query](https://tanstack.com/query) (data fetching / cache)
- Tailwind CSS 4
- Didit (KYC)

## Pokretanje

```bash
npm install
cp .env.example .env.local
# popuni vrednosti u .env.local
npm run dev
```

Aplikacija radi na [http://localhost:3000](http://localhost:3000).

### Env varijable

| Varijabla                       | Opis                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL Supabase projekta                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public ključ                                          |
| `NEXT_PUBLIC_APP_URL`           | Javni URL aplikacije (npr. `http://localhost:3000`)        |
| `NEXT_PUBLIC_HOMEPAGE_MODE`     | `landing` (privremena početna) ili `app` (prava platforma) |

Didit KYC (`DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_ENVIRONMENT`, `APP_URL`) ide u **Supabase Edge secrets**, ne na Vercel.

Waitlist emailovi sa landing početne idu u tabelu `waitlist_emails`. SQL je u `supabase/migrations/20260813120000_waitlist_emails.sql`.

## Skripte

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # pokreni production build
npm run lint     # ESLint
npm test         # Vitest
```

## Arhitektura

```
Component → Hook (React Query) → Service (Supabase) → Database
```

| Folder            | Uloga                                                         |
| ----------------- | ------------------------------------------------------------- |
| `app/`            | Next.js rute (App Router)                                     |
| `components/`     | UI komponente                                                 |
| `hooks/<domain>/` | React Query hookovi (`*.hooks.ts`)                            |
| `lib/<domain>/`   | Domen moduli: `*.service.ts`, `*.query.ts`, `*.helpers.ts`, … |
| `lib/supabase/`   | Supabase klijenti                                             |
| `types/`          | TypeScript tipovi                                             |
| `context/`        | Auth session context (UI)                                     |
| `providers/`      | React Query provider                                          |

**Imenovanje fajlova:** `<name>.<kind>.ts` — npr. `auth.service.ts`, `user.query.ts`, `auth.hooks.ts`, `profile.helpers.ts`.

**Pravila:**

- Komponente **ne** zovu Supabase i **ne** importuju `.service.ts` iz `lib/`
- Komponente koriste samo hookove iz `hooks/`
- Hookovi zovu samo servise iz `lib/<domain>/`
- Query keyevi idu isključivo kroz `lib/<domain>/*.query.ts`

Identifikatori u kodu su na **engleskom**. UI tekst je na **srpskom** (latinica, ekavica).

## Rute (trenutno)

### Auth

| Ruta                    | Opis                          |
| ----------------------- | ----------------------------- |
| `/auth/login`           | Prijava                       |
| `/auth/register`        | Registracija                  |
| `/auth/verify`          | OTP verifikacija emaila       |
| `/auth/welcome`         | Onboarding nakon registracije |
| `/auth/forgot-password` | Reset lozinke                 |
| `/auth/new-password`    | Nova lozinka                  |

### Glavne

| Ruta                 | Opis                                 |
| -------------------- | ------------------------------------ |
| `/`                  | Početna                              |
| `/search`            | Pretraga, lista rezultata i mapa     |
| `/categories`        | Sve popunjene kategorije             |
| `/category/<slug>`   | Prečica na `/search?category=<slug>` |
| `/profile`           | Pregled profila                      |
| `/profile/edit`      | Izmena ličnih podataka               |
| `/profile/locations` | Lokacije korisnika                   |
| `/kyc`               | KYC tok (Didit)                      |

Zaštićene rute (middleware): `/profile`, `/auth/welcome`, `/messages`, `/bookings`, `/listings/new`.

### API

| Ruta                               | Opis                                           |
| ---------------------------------- | ---------------------------------------------- |
| `GET /api/v1/listings/search`      | Pretraga oglasa                                |
| `GET /api/v1/listings/search/pins` | Pinovi za mapu (lakši upit, maks. 500)         |
| `GET /api/v1/listings/recent`      | Nedavno objavljeni (sekcija „Možda te zanima") |
| `GET /api/v1/categories`           | Stablo popunjenih kategorija                   |

## Pretraga

Specifikacija: `03_Pretraga_Lista_i_Mapa.md`.

Filtriranje se radi u bazi, jer su filteri međuzavisni — radijus određuje koji
redovi postoje, dostupnost koji od njih preživljavaju, i tek onda se može
prebrojati ukupan broj.

| Funkcija                | Uloga                                                |
| ----------------------- | ---------------------------------------------------- |
| `snd_filter_listings`   | Koraci 1–6 iz §7.1. Interna, nije dostupna klijentu. |
| `snd_search_listings`   | Jedna strana rezultata                               |
| `snd_search_pins`       | Pinovi za mapu                                       |
| `snd_search_suggestion` | „Da li si mislio…"                                   |
| `snd_category_tree`     | Popunjene kategorije sa zbirnim brojevima            |

**Bezbednosno pravilo:** funkcije su `SECURITY DEFINER` da bi mogle da čitaju
`locations` (koji je pod RLS-om vidljiv samo vlasniku), ali čitaju **isključivo**
`approx_latitude` i `approx_longitude`. Tačne koordinate, ulica i poštanski broj
nikada ne izlaze iz funkcije.

**Sav status pretrage živi u URL-u.** Promena filtera koristi `replaceState`,
promena strane `pushState` — da dugme „nazad" ne prolazi kroz svaki pomeren
klizač.

**Odstupanje od specifikacije:** dokument 03 piše rute i parametre na srpskom
(`/pretraga?grad=…&od=…`). Ovde su na engleskom, po pravilu projekta o engleskim
identifikatorima i putanjama
(`docs/superpowers/specs/2026-08-12-english-routes-identifiers-design.md`).
Značenje parametara je nepromenjeno, samo naziv:

| Dokument 03             | Ovde                      |
| ----------------------- | ------------------------- |
| `grad`                  | `city`                    |
| `od` / `do`             | `from` / `to`             |
| `kategorija`            | `category`                |
| `cena_min` / `cena_max` | `price_min` / `price_max` |
| `radijus`               | `radius`                  |
| `mapa`                  | `map`                     |

Demo podaci za rad na stranici: `supabase/seed/demo_listings.sql` (pokreće se
ručno, nije migracija).

## Dizajn tokeni

CSS varijable su u `app/globals.css` (engleski identifikatori):

- `--color-brand-*`, `--color-gray-*`, `--color-error`, …
- `--radius-*` (max 8px)
- `--shadow-*`, `--space-*`
