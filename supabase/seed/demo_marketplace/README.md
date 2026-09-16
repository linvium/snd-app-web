# demo_marketplace

Test data for a marketplace that looks used: eight owners in nine cities, ~50
published listings spread over ~40 categories, each with up to three photos in
the `listing-images` bucket.

Not a migration. Run it by hand against whichever project you want populated.

## Running it

1. **Accounts** - `../demo_marketplace_users.sql` in the Supabase SQL editor,
   psql, or the Supabase MCP. It needs admin rights: it writes `auth.users`
   directly (sign-up is closed on this project because confirmation mail is not
   configured), confirms the e-mail, and fills in the profile.
2. **Listings and photos** - `npx tsx supabase/seed/demo_marketplace/seed.ts`
   from the repo root, with `.env.local` present. This half needs nothing but the
   anon key: it signs in as each owner and writes through the same RLS the app
   uses, so anything it can create the app could have created too.

Both halves are re-runnable. Listings are matched by slug and photos are only
topped up to three, so a second run fills in whatever the photo search missed the
first time.

```bash
npx tsx supabase/seed/demo_marketplace/seed.ts
```

`--photos-only` skips creating anything and just tops up photos on listings that
already exist.

## Editing the data

`owners.json` and `items.json` are the source. After changing an owner, re-run
`node supabase/seed/demo_marketplace/build-sql.mjs` to regenerate the SQL file.
Items need no build step - `seed.ts` reads `items.json` directly.

Each item carries a `photo` field: an English search phrase, not Serbian, because
it is sent to Wikimedia Commons and Openverse. The seeder widens the phrase in
rounds ("cordless screwdriver drill" then "cordless screwdriver" then "drill")
until three images download, decode, and clear the 600x450 minimum.

Photos are openly licensed (Commons, and Openverse filtered to
`license_type=commercial`), resized into the same six objects per image the
upload route writes: thumbnail/medium/large as both webp and jpg.

## Removing it

The undo block at the bottom of `demo_marketplace_users.sql` drops the storage
objects, the listings and the accounts. Profiles and locations carry a
`[demo_marketplace]` tag so anything left over is easy to find:

```sql
select * from public.user_profiles where about like '%[demo_marketplace]%';
```

The demo accounts all share the password in `demo_marketplace_users.sql`, so you
can sign in as any owner to look at the dashboard side of the seeded data.
