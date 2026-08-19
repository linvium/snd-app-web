# Date range picker (presets + split/stack layouts)

**Date:** 2026-08-19  
**Status:** Approved  
**Approach:** One shared `DateRangePicker` wrapping the existing calendar

## Problem

The third search field, mobile search dates layer, and listing booking dialog all use a stacked-months `DateRangeCalendar` in a narrow panel. The desired UI is Airbnb-like: shortcut cards (Today / Tomorrow / This weekend) plus a calendar — two columns on desktop, one column on mobile.

## Goals

1. Same picker everywhere dates are chosen: desktop search popover, mobile search dates layer, listing booking dialog.
2. Three shortcuts: **Danas**, **Sutra**, **Ovaj vikend** (Saturday–Sunday).
3. Desktop: shortcut cards on the left, one month with prev/next on the right.
4. Mobile: shortcut row on top, stacked scrolling months below (next month peeks).
5. Monday-first week (`pon` … `ned`). Serbian copy only in the UI.
6. Keep existing range rules, taken-day handling, and ISO `from` / `to` contract.

## Non-goals

- Sunday-first week
- Extra shortcuts (next week, whole month, flexible dates)
- Replacing the calendar with `react-day-picker` or another library
- Changing search URL params or booking quote API
- Closing the picker automatically after a shortcut tap

## Decisions

| Topic | Choice |
|---|---|
| Scope | Search header, mobile search, booking dialog |
| Weekend | Saturday–Sunday. If today is Sunday, **next** Sat–Sun |
| Taken days vs shortcuts | Shortcut still applies the range. Booking **Potvrdi** stays disabled while the range includes a taken day (`isRangeAvailable`) |
| Desktop layout | Two columns: presets left, paged month right |
| Mobile layout | One column: presets on top, stacked months below |
| Week start | Monday (current app) |
| Single day | `from === to` is valid; header label is `19. avg`, not `19–19. avg` |

## Architecture

Three units. Call sites keep passing `from`, `to`, `onChange`, and optional `unavailable`.

### 1. `lib/calendar/calendar.helpers.ts`

Pure date math. Reuse `addDaysIso` / `todayIso` from `lib/availability`.

```ts
export type DatePresetId = 'today' | 'tomorrow' | 'this-weekend'

export interface DatePreset {
  id: DatePresetId
  from: string // YYYY-MM-DD
  to: string
}

export function datePresets(today?: Date): DatePreset[]
```

| `id` | Range |
|---|---|
| `today` | today → today |
| `tomorrow` | tomorrow → tomorrow |
| `this-weekend` | next Saturday → that Sunday. If today is Saturday, this Sat–Sun. If today is Sunday, **next** weekend (Saturday is already past). |

Dates are UTC calendar dates, matching `DateRangeCalendar` (`Date.UTC` from local Y/M/D).

Labels stay in the component (Serbian UI): Danas, Sutra, Ovaj vikend. Subtitles use `formatDateRange`.

### 2. `DateRangeCalendar`

Existing grid, plus:

```ts
layout?: 'paged' | 'stacked'  // default 'stacked' so booking/mobile keep today’s behaviour if miswired
```

- **`stacked`:** current vertical months (`monthsAhead`, default 12).
- **`paged`:** one month. Prev disabled on the current month (cannot page into the past). Next stops at the last month in `monthsAhead`. When `from` moves to another month (shortcut), show that month.

Selection, past days, taken days (`line-through`), and two-tap range logic stay as they are. A second tap on the start day closes as a single-day range (`from === to`).

Visual: start/end are filled **circles** (`bg-foreground text-background`). Days between get a muted bridge. Same-day range is one circle, no bridge. Past days stay light grey.

### 3. `DateRangePicker`

Shell that call sites render instead of the calendar alone.

```ts
layout: 'split' | 'stack'
```

Parents already know the context, so layout is a prop (no hydration flash from `matchMedia`):

| Call site | `layout` | Calendar |
|---|---|---|
| `HeaderSearchBar` (desktop only, `md+`) | `split` | `paged` |
| `MobileSearchModal` dates layer | `stack` | `stacked` |
| `BookingCard` dialog | `split` at `md+`, `stack` below | matching calendar |

**`split`:** CSS grid/flex, two columns. Left: three stacked bordered cards (title + subtitle). Right: paged calendar. Desktop search popover width ~560px. Booking dialog `sm:max-w-md` becomes wide enough for two columns on `md+` (`sm:max-w-2xl` or equivalent).

**`stack`:** Horizontal shortcut row (equal-width cards), divider, sticky weekday header, stacked months with the next month visible.

A shortcut is selected when `from`/`to` match that preset. Tapping it calls `onChange(preset.from, preset.to)` and **does not close** the picker. Search still has **Obriši datume**. Booking still has **Potvrdi**.

## Data flow

Unchanged: ISO strings in, `onChange(from, to)` out. Shortcuts write both ends at once. Search still drafts dates until **Pretraži**. Booking still drafts until **Potvrdi**.

Booking **Potvrdi** is disabled when `!from || !to` **or** `!isRangeAvailable(from, to, listing.unavailable_dates)`. The main **Pošalji zahtev** button already disables on an unavailable quote; no quote API change.

Search does not pass `unavailable`.

## Copy

| Role | String |
|---|---|
| Today | Danas |
| Tomorrow | Sutra |
| This weekend | Ovaj vikend |
| Subtitle | `formatDateRange` (`19. avg`, `22–23. avg`) |
| Weekdays | pon, uto, sre, čet, pet, sub, ned |
| Months | existing `Januar` … `Decembar` |
| Clear | Obriši datume (search only) |

## Tests

Vitest:

- `datePresets` from Wednesday → today, tomorrow, Sat–Sun of that week
- Saturday → weekend is this Sat–Sun
- Sunday → weekend is **next** Sat–Sun
- `formatDateRange('2026-08-19', '2026-08-19')` → `19. avg`
- Existing `isRangeAvailable` already covers taken days in the middle of a range

Playwright (`e2e/search/dates.spec.ts`):

- Desktop `/search`: open **Datumi**, tap **Danas**, header shows today’s compact label

## Constraints

- English identifiers; Serbian UI strings only
- Components call hooks, not services
- No new calendar dependency
- Do not commit unrelated dirty files
