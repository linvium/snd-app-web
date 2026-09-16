/**
 * Creates the demo marketplace listings and their photos.
 *
 * Run demo_marketplace_users.sql first (it needs admin rights); everything here
 * goes through the public API as the owners themselves, with the anon key, so
 * the rows land under exactly the same RLS the app uses.
 *
 *   npx tsx supabase/seed/demo_marketplace/seed.ts
 *   npx tsx supabase/seed/demo_marketplace/seed.ts --photos-only
 *   npx tsx supabase/seed/demo_marketplace/seed.ts --refresh-photos
 *
 * Photos come from Openverse (openly licensed, no API key). Each listing gets up
 * to three, resized into the same six storage objects the upload route writes.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { processListingImage } from '@/lib/listings/listings.images'

const here = dirname(fileURLToPath(import.meta.url))
const BUCKET = 'listing-images'
const DEMO_PASSWORD = 'SeedDemo2026!'
const PHOTOS_PER_LISTING = 3
const PHOTOS_ONLY = process.argv.includes('--photos-only')
const REFRESH_PHOTOS = process.argv.includes('--refresh-photos')

interface OwnerLocation {
  label: string
  street: string
  city: string
  municipality: string
  postal_code: string
  lat: number
  lng: number
}

interface Owner {
  key: string
  email: string
  locations: OwnerLocation[]
}

interface Item {
  owner: string
  loc: number
  cat: string
  title: string
  desc: string
  price: number
  value: number
  photo: string
}

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const line of text.split('\n')) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (!match || process.env[match[1]]) continue
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
      }
    } catch {
      // optional file
    }
  }
}

const DIACRITICS: Record<string, string> = { š: 's', đ: 'dj', č: 'c', ć: 'c', ž: 'z' }

/** Same rule as lib/listings/listings.slug.ts, so seeded URLs look app-made. */
function slugifyTitle(title: string): string {
  const dashed = title
    .trim()
    .toLowerCase()
    .replace(/[šđčćž]/g, (char) => DIACRITICS[char] ?? char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!dashed) return 'oglas'
  if (dashed.length <= 80) return dashed
  const cut = dashed.slice(0, 80)
  const lastDash = cut.lastIndexOf('-')
  return (lastDash >= 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '')
}

interface Candidate {
  url: string
  title: string
  creator: string | null
  license: string
  source: string
}

async function openverseCandidates(query: string, strict = true): Promise<Candidate[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: '20',
    license_type: 'commercial',
    mature: 'false',
    ...(strict ? { size: 'large', extension: 'jpg,png' } : {}),
  })
  const response = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { 'User-Agent': 'snd-demo-seed/1.0 (local test data)' },
  })
  if (!response.ok) return []
  const body = (await response.json()) as { results?: Record<string, string>[] }
  return (body.results ?? [])
    .filter((result) => result.url)
    .map((result) => ({
      url: result.url,
      title: result.title ?? query,
      creator: result.creator ?? null,
      license: `${result.license ?? ''} ${result.license_version ?? ''}`.trim(),
      source: result.foreign_landing_url ?? result.url,
    }))
}

/** Wikimedia Commons picks up whatever Openverse has no match for. */
async function commonsCandidates(query: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
    format: 'json',
    origin: '*',
  })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'snd-demo-seed/1.0 (local test data)' },
  })
  if (!response.ok) return []
  const body = (await response.json()) as {
    query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; descriptionurl?: string }[] }> }
  }
  const pages = Object.values(body.query?.pages ?? {})
  return pages
    .map((page): Candidate | null => {
      const info = page.imageinfo?.[0]
      if (!info?.thumburl) return null
      return {
        url: info.thumburl,
        title: page.title,
        creator: null,
        license: 'Wikimedia Commons',
        source: info.descriptionurl ?? info.thumburl,
      }
    })
    .filter((candidate): candidate is Candidate => candidate !== null)
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'snd-demo-seed/1.0 (local test data)' },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) return null
    const buffer = Buffer.from(await response.arrayBuffer())
    // The processor rejects anything over 10 MB, and tiny files are never photos.
    if (buffer.length < 8_000 || buffer.length > 10 * 1024 * 1024) return null
    return buffer
  } catch {
    return null
  }
}

async function uploadPhoto(
  supabase: SupabaseClient,
  listingId: string,
  buffer: Buffer,
  sortOrder: number
): Promise<boolean> {
  const processed = await processListingImage(buffer)
  const imageId = crypto.randomUUID()
  const folder = `${listingId}/${imageId}`
  const uploads = [
    { path: `${folder}/thumbnail.webp`, body: processed.variants.thumbnail.webp, type: 'image/webp' },
    { path: `${folder}/thumbnail.jpg`, body: processed.variants.thumbnail.jpeg, type: 'image/jpeg' },
    { path: `${folder}/medium.webp`, body: processed.variants.medium.webp, type: 'image/webp' },
    { path: `${folder}/medium.jpg`, body: processed.variants.medium.jpeg, type: 'image/jpeg' },
    { path: `${folder}/large.webp`, body: processed.variants.large.webp, type: 'image/webp' },
    { path: `${folder}/large.jpg`, body: processed.variants.large.jpeg, type: 'image/jpeg' },
  ]

  for (const upload of uploads) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(upload.path, upload.body, { contentType: upload.type, upsert: true })
    if (error) {
      console.error(`    upload failed (${upload.path}): ${error.message}`)
      return false
    }
  }

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${path}`).data.publicUrl

  const { error } = await supabase.from('listing_images').insert({
    id: imageId,
    listing_id: listingId,
    url: publicUrl('large.webp'),
    thumbnail_url: publicUrl('thumbnail.webp'),
    medium_url: publicUrl('medium.webp'),
    large_url: publicUrl('large.webp'),
    sort_order: sortOrder,
  })
  if (error) {
    console.error(`    listing_images insert failed: ${error.message}`)
    await supabase.storage.from(BUCKET).remove(uploads.map((upload) => upload.path))
    return false
  }
  return true
}

/** "cordless screwdriver drill" -> that, then "cordless screwdriver", then "cordless". */
function queryVariants(query: string): string[] {
  const words = query.split(/\s+/).filter(Boolean)
  const variants = [query, words.slice(0, 2).join(' '), words[0]]
  return [...new Set(variants.filter((variant) => variant.length >= 4))]
}

/**
 * A search for "angle grinder tool" happily returns a portrait of somebody who
 * once held one. Keep only results that name part of the query - Commons puts
 * the subject in the file name, Openverse in the title - and fall back to the
 * rest only if a listing would otherwise end up with no photo at all.
 */
function namesTheSubject(candidate: Candidate, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter((word) => word.length >= 4)
  if (!words.length) return true
  const haystack = candidate.title.toLowerCase()
  return words.some((word) => haystack.includes(word))
}

/**
 * Half of what any single search returns is a dead link or too small to pass the
 * processor, so widen in rounds - exact query first, looser filters last - and
 * stop as soon as three photos are actually on the listing.
 */
async function attachPhotos(supabase: SupabaseClient, listingId: string, item: Item, have: number) {
  let sortOrder = have
  const tried = new Set<string>()
  const setAside: Candidate[] = []
  const variants = queryVariants(item.photo)
  // Commons first: it searches file names and descriptions, so an "angle grinder"
  // query really does return angle grinders, and its thumbnails rarely 404.
  const rounds: (() => Promise<Candidate[]>)[] = [
    ...variants.map((variant) => () => commonsCandidates(variant)),
    ...variants.map((variant) => () => openverseCandidates(variant)),
    ...variants.map((variant) => () => openverseCandidates(variant, false)),
  ]

  const tryCandidates = async (candidates: Candidate[]) => {
    for (const candidate of candidates) {
      if (sortOrder >= PHOTOS_PER_LISTING) return
      if (tried.has(candidate.url)) continue
      tried.add(candidate.url)

      const buffer = await download(candidate.url)
      if (!buffer) continue
      try {
        if (await uploadPhoto(supabase, listingId, buffer, sortOrder)) sortOrder += 1
      } catch (error) {
        // Too small, undecodable, HEIC - just move to the next candidate.
        void error
      }
    }
  }

  for (const round of rounds) {
    if (sortOrder >= PHOTOS_PER_LISTING) break

    let candidates: Candidate[] = []
    try {
      candidates = await round()
    } catch {
      continue
    }

    setAside.push(...candidates.filter((candidate) => !namesTheSubject(candidate, item.photo)))
    await tryCandidates(candidates.filter((candidate) => namesTheSubject(candidate, item.photo)))
  }

  if (sortOrder < PHOTOS_PER_LISTING) await tryCandidates(setAside)
  return sortOrder - have
}

/** Drops every photo on a listing, storage objects included, so it can refill. */
async function clearPhotos(supabase: SupabaseClient, listingId: string) {
  const { data: existing } = await supabase
    .from('listing_images')
    .select('id')
    .eq('listing_id', listingId)
  if (!existing?.length) return

  const paths = existing.flatMap((image) =>
    ['thumbnail', 'medium', 'large'].flatMap((size) => [
      `${listingId}/${image.id}/${size}.webp`,
      `${listingId}/${image.id}/${size}.jpg`,
    ])
  )
  await supabase.storage.from(BUCKET).remove(paths)
  await supabase.from('listing_images').delete().eq('listing_id', listingId)
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing')

  const owners: Owner[] = JSON.parse(readFileSync(resolve(here, 'owners.json'), 'utf8'))
  const items: Item[] = JSON.parse(readFileSync(resolve(here, 'items.json'), 'utf8'))

  const anon = createClient(url, anonKey)
  const { data: categories, error: categoryError } = await anon
    .from('categories')
    .select('id, slug')
  if (categoryError) throw categoryError
  const categoryId = new Map(categories.map((row) => [row.slug as string, row.id as string]))

  const slugs = new Map<string, number>()
  let created = 0
  let photos = 0
  let skipped = 0

  for (const [ownerIndex, owner] of owners.entries()) {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email: owner.email,
      password: DEMO_PASSWORD,
    })
    if (signInError || !session.user) throw signInError ?? new Error(`no session for ${owner.email}`)
    const ownerId = session.user.id
    console.log(`\n${owner.email}`)

    const locationIds: string[] = []
    for (const [index, location] of owner.locations.entries()) {
      const { data: existing } = await supabase
        .from('locations')
        .select('id')
        .eq('user_id', ownerId)
        .eq('street', location.street)
        .is('deleted_at', null)
        .maybeSingle()

      if (existing?.id) {
        locationIds.push(existing.id as string)
        continue
      }

      const { data: inserted, error } = await supabase
        .from('locations')
        .insert({
          user_id: ownerId,
          label: `${location.label} [demo_marketplace]`,
          street: location.street,
          city: location.city,
          municipality: location.municipality,
          postal_code: location.postal_code,
          country_code: 'RS',
          latitude: location.lat,
          longitude: location.lng,
          // Seeded coordinates are already street-level approximations.
          approx_latitude: location.lat,
          approx_longitude: location.lng,
          is_default: index === 0,
        })
        .select('id')
        .single()
      if (error) throw error
      locationIds.push(inserted.id as string)
    }

    const ownerItems = items.filter((item) => item.owner === owner.key)
    for (const [itemIndex, item] of ownerItems.entries()) {
      const base = slugifyTitle(item.title)
      const taken = slugs.get(base) ?? 0
      slugs.set(base, taken + 1)
      const slug = taken === 0 ? base : `${base}-${taken + 1}`

      const { data: existing } = await supabase
        .from('listings')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      let listingId = existing?.id as string | undefined

      if (!listingId) {
        if (PHOTOS_ONLY) continue
        // Staggered so the "newest first" ordering on search shows a mix of owners.
        const ageHours = 6 + (ownerIndex + itemIndex * owners.length) * 5
        const publishedAt = new Date(Date.now() - ageHours * 3600 * 1000).toISOString()

        const { data: inserted, error } = await supabase
          .from('listings')
          .insert({
            owner_id: ownerId,
            category_id: categoryId.get(item.cat) ?? null,
            title: item.title,
            slug,
            description: item.desc,
            price_1_day_minor: item.price,
            // Packages must undercut the daily rate (listings_price_3/7 checks).
            price_3_days_minor: Math.round((item.price * 27) / 10),
            price_7_days_minor: Math.round((item.price * 60) / 10),
            item_value_minor: item.value,
            cancellation_policy: (['flexible', 'medium', 'strict'] as const)[itemIndex % 3],
            status: 'published',
            published_at: publishedAt,
            created_at: publishedAt,
            view_count: 12 + ((ownerIndex * 37 + itemIndex * 53) % 240),
          })
          .select('id')
          .single()
        if (error) throw error
        listingId = inserted.id as string
        created += 1

        const { error: locationError } = await supabase
          .from('listing_locations')
          .insert({ listing_id: listingId, location_id: locationIds[item.loc] })
        if (locationError) throw locationError
      }

      if (REFRESH_PHOTOS) await clearPhotos(supabase, listingId)

      const { count } = await supabase
        .from('listing_images')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', listingId)
      const have = count ?? 0
      if (have >= PHOTOS_PER_LISTING) {
        skipped += 1
        console.log(`  = ${item.title} (${have} photos)`)
        continue
      }

      const added = await attachPhotos(supabase, listingId, item, have)
      photos += added
      console.log(`  ${added + have >= 1 ? '+' : '!'} ${item.title} (${have + added} photos)`)
    }

    await supabase.auth.signOut()
  }

  console.log(`\nlistings created: ${created}, photos uploaded: ${photos}, already complete: ${skipped}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
