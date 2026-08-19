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
| `/listings/<slug>`   | Stranica predmeta (dokument 04)      |
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
| `POST /api/v1/listings/<id>/quote` | Obračun cene za period (dokument 04 §13.2)     |
| `GET /api/v1/listings/<id>/reviews`| Recenzije, `scope=listing\|owner_other`        |
| `GET /api/v1/listings/<id>/similar`| Slični predmeti                                |
| `POST /api/v1/listings/<id>/view`  | Beleženje pregleda, prigušeno kolačićem        |
| `POST /api/v1/reviews/<id>/report` | Prijava recenzije                              |

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

## Stranica predmeta

Specifikacija: `04_Detalji_Predmeta.md`.

Za razliku od pretrage, ovde **nema RPC funkcija** — stranica se čita običnim
Supabase upitima. Problem je bio što su `users`, `user_profiles`,
`kyc_verifications` i `locations` pod RLS-om vidljivi samo vlasniku, a stranica
je javna. Rešenje su tanki pogledi koji izlažu **samo bezbedne kolone**:

| Pogled                         | Šta izlaže                                              |
| ------------------------------ | ------------------------------------------------------- |
| `public_owner_profiles`        | Ime, avatar, ocena, brzina odgovora, „član od", KYC      |
| `public_listing_locations`     | Opština, grad, **samo** `approx_latitude/longitude`      |
| `public_deleted_listing_slugs` | Slugovi obrisanih oglasa, za `noindex`                   |

**Zašto pogled, a ne funkcija ili servisni ključ:** RLS radi nad redovima i ne
može da ograniči kolone, ali pogled *jeste* lista kolona. `street`,
`postal_code` i tačne koordinate nisu izostavljene zato što se neki upit setio
da ih ne traži — one u pogledu ne postoje. Pravilo iz dokumenta 04 §9 je time
svojstvo šeme, a ne koda koji je čita.

Tačna adresa se otključava **RLS politikom**, ne granom u interfejsu:

```sql
-- locations: select for paid renter
exists (select 1 from bookings b
        where b.pickup_location_id = locations.id
          and b.renter_id = auth.uid()
          and b.status in ('paid', 'in_progress'))
```

„Tačnu adresu dobijaš kada rezervacija bude plaćena" je tvrdnja o redu, pa
pripada RLS-u. Iznajmljivač običnim `select`-om dobija ulicu i tačne
koordinate, svi ostali ne dobijaju ništa.

**Dostupnost** se čita iz jedne tabele — `blocked_dates`. Okidač na
`bookings` upisuje dane za statuse `accepted`, `paid` i `in_progress`
(dokument 00 §6.4), pa javni kalendar ne mora da čita `bookings`, koji je
vidljiv samo dvema stranama rezervacije.

**Obračun cene je na serveru** (`lib/pricing`), jer cena koja se prikazuje mora
biti ona koja se naplaćuje. Provizije se čitaju iz okruženja
(`NEXT_PUBLIC_RENTER_FEE_PERCENT`, `NEXT_PUBLIC_OWNER_FEE_PERCENT`), pošto
dokument 00 §6.2 traži da budu podesive.

Noćni posao za metrike vlasnika (dokument 04 §5) treba zakazati kroz pg_cron:

```sql
select public.snd_refresh_owner_response_metrics();
```

## Dizajn tokeni

CSS varijable su u `app/globals.css` (engleski identifikatori):

- `--color-brand-*`, `--color-gray-*`, `--color-error`, …
- `--radius-*` (max 8px)
- `--shadow-*`, `--space-*`
