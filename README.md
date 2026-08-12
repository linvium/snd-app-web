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

| Varijabla | Opis |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase projekta |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public ključ |
| `NEXT_PUBLIC_APP_URL` | Javni URL aplikacije (npr. `http://localhost:3000`) |
| `DIDIT_API_KEY` | Didit API ključ (KYC) |
| `DIDIT_WORKFLOW_ID` | Didit workflow ID |
| `DIDIT_WEBHOOK_SECRET` | Secret za Didit webhook |

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

| Folder | Uloga |
|---|---|
| `app/` | Next.js rute (App Router) |
| `components/` | UI komponente |
| `hooks/<domain>/` | React Query hookovi |
| `services/<domain>/` | Supabase pozivi |
| `lib/` | Shared utiliti, query keys, Supabase klijenti |
| `types/` | TypeScript tipovi |
| `context/` | Auth session context (UI) |
| `providers/` | React Query provider |

**Pravila:**

- Komponente **ne** zovu Supabase i **ne** importuju `services/`
- Komponente koriste samo hookove iz `hooks/`
- Hookovi zovu samo servise iz `services/`
- Query keyevi idu isključivo kroz `lib/queryKeys.ts`

Identifikatori u kodu su na **engleskom**. UI tekst je na **srpskom** (latinica, ekavica).

## Rute (trenutno)

### Auth
| Ruta | Opis |
|---|---|
| `/prijava` | Prijava |
| `/registracija` | Registracija |
| `/verifikacija` | OTP verifikacija emaila |
| `/dobrodosli` | Onboarding nakon registracije |
| `/zaboravljena-lozinka` | Reset lozinke |
| `/nova-lozinka` | Nova lozinka |

### Glavne
| Ruta | Opis |
|---|---|
| `/` | Početna |
| `/profil` | Pregled profila |
| `/profil/izmeni` | Izmena ličnih podataka |
| `/profil/lokacije` | Lokacije korisnika |
| `/kyc` | KYC tok (Didit) |

Zaštićene rute (middleware): `/profil`, `/dobrodosli`, `/poruke`, `/rezervacije`, `/objavi`.

## Dizajn tokeni

CSS varijable su u `app/globals.css` (engleski identifikatori):

- `--color-brand-*`, `--color-gray-*`, `--color-error`, …
- `--radius-*` (max 8px)
- `--shadow-*`, `--space-*`
