-- Editorial pages live in the database, not in the repository.
--
-- Every help, guarantee or legal page used to be a React file with a paragraph
-- of placeholder copy in it, which meant a lawyer's wording change was a deploy.
-- A page is now a row: `category` decides which route serves it (/support/...,
-- /legal/...), `slug` is the last segment of that route, and `content` is the
-- HTML body between the title and the end of the article.
--
-- The HTML is trusted content written by the team, and it is rendered with
-- dangerouslySetInnerHTML. Nothing user-submitted may ever be written here -
-- that is what the insert/update policies (there are none) are for.

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  -- Globally unique, not unique per category: the in-page support sheet fetches
  -- a page by slug alone, and two pages sharing a slug across categories would
  -- make that lookup ambiguous for the reader as much as for the code.
  slug varchar(120) not null unique,
  category varchar(32) not null,
  title varchar(180) not null,
  -- The one-line standfirst under the title, and the meta description Google
  -- shows. Same sentence in both places on purpose.
  summary text,
  content text not null,
  sort_order smallint not null default 0,
  -- A page can exist before it is ready. Unpublished rows are invisible to
  -- anon and authenticated alike, so a draft cannot be reached by guessing.
  is_published boolean not null default true,
  -- What the page says it was last reviewed on. Editorial, not a row timestamp:
  -- fixing a typo should not tell readers the terms changed.
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint pages_category_format check (category ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.pages is
  'Editorial content pages (support, legal). Served at /{category}/{slug} and inside the support sheet.';
comment on column public.pages.category is
  'Route namespace: support or legal. A new value needs a matching route folder in the app.';
comment on column public.pages.content is
  'Trusted HTML body, rendered as-is. Team-authored only - never user input.';
comment on column public.pages.published_at is
  'Editorial "last updated" date shown on the page, not a row mtime.';

-- The index the category listing reads: /support renders every published page
-- in the category in editor-chosen order.
create index idx_pages_category on public.pages (category, sort_order, title)
  where is_published;

create trigger trg_pages_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

alter table public.pages enable row level security;

-- Read-only to the world. Editing happens through the service role (admin
-- tooling, SQL), which bypasses RLS - there is deliberately no insert, update
-- or delete policy for anon or authenticated.
create policy "pages: read published" on public.pages
  for select
  to anon, authenticated
  using (is_published);

grant select on public.pages to anon, authenticated;
