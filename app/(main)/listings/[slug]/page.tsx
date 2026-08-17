import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ListingDetail } from '@/components/listings/ListingDetail'
import { ListingPublishedToast } from '@/components/listings/ListingPublishedToast'
import { createClient } from '@/lib/supabase/server'
import type { CancellationPolicy } from '@/types/listing'

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(
      'id, owner_id, category_id, title, description, slug, price_1_day_minor, price_3_days_minor, price_7_days_minor, item_value_minor, cancellation_policy, status'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle()

  if (!listing || !listing.title || listing.price_1_day_minor == null) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = user?.id === listing.owner_id

  const [{ data: images }, { data: category }, { data: listingLocations }] = await Promise.all([
    supabase
      .from('listing_images')
      .select('id, thumbnail_url, large_url, sort_order')
      .eq('listing_id', listing.id)
      .order('sort_order', { ascending: true }),
    listing.category_id
      ? supabase.from('categories').select('full_path, name').eq('id', listing.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('listing_locations').select('location_id').eq('listing_id', listing.id),
  ])

  const locationIds = (listingLocations ?? []).map((row) => row.location_id as string)
  const { data: locations } =
    locationIds.length > 0
      ? await supabase.from('locations').select('id, label, city, street').in('id', locationIds)
      : { data: [] }

  return (
    <>
      <Suspense>
        <ListingPublishedToast />
      </Suspense>
      <ListingDetail
        listing={{
          id: listing.id,
          title: listing.title,
          description: listing.description ?? '',
          categoryPath: category?.full_path ?? category?.name ?? null,
          price1DayMinor: listing.price_1_day_minor,
          price3DaysMinor: listing.price_3_days_minor,
          price7DaysMinor: listing.price_7_days_minor,
          itemValueMinor: listing.item_value_minor,
          cancellationPolicy: listing.cancellation_policy as CancellationPolicy,
          locations: (locations ?? []).map((row) => ({
            label: row.label as string,
            city: row.city as string,
            street: row.street as string,
          })),
          images: (images ?? []).map((image) => ({
            id: image.id as string,
            thumbnail_url: image.thumbnail_url as string,
            large_url: image.large_url as string,
          })),
          isOwner,
        }}
      />
    </>
  )
}
