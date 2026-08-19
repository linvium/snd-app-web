import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import ListingDetailView from '@/components/listings/detail/ListingDetailView'
import { ListingPublishedToast } from '@/components/listings/ListingPublishedToast'
import { loadListingDetail } from '@/lib/listings/listings.detail.server'
import {
  listingCanonicalUrl,
  listingJsonLd,
  listingMetaDescription,
  listingPageTitle,
} from '@/lib/listings'
import { loadReviews, loadReviewSummary } from '@/lib/reviews/reviews.server'
import { createClient } from '@/lib/supabase/server'
import { REVIEW_PAGE_SIZE } from '@/types/listing-detail'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await loadListingDetail(supabase, slug, { id: user?.id ?? null })
  if (result.kind !== 'found') {
    return { title: 'Oglas nije pronađen | SND', robots: { index: false, follow: false } }
  }

  const { listing } = result
  const city = listing.pickup_locations[0]?.city ?? null
  const description = listingMetaDescription(listing.description)
  const canonical = listingCanonicalUrl(listing.slug)
  const cover = listing.images[0]

  return {
    title: listingPageTitle(listing.title, city),
    description,
    alternates: { canonical },
    // A paused listing is still a real page for the people holding its link,
    // but it should not be pulled into search while it cannot be booked.
    robots: listing.status === 'published' ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      title: listing.title,
      description,
      url: canonical,
      siteName: 'SND',
      locale: 'sr_RS',
      ...(cover ? { images: [{ url: cover.large_url, width: 1200, height: 630 }] } : {}),
    },
  }
}

/**
 * The item page (doc 04).
 *
 * A server component: the listing, its reviews and the first render of the
 * booking card all come back with the HTML, which is what a page that has to be
 * indexed and has to load on a phone needs. Everything interactive below is a
 * client island.
 */
export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await loadListingDetail(supabase, slug, { id: user?.id ?? null })

  if (result.kind === 'gone') {
    // Doc 04 §15 asks for HTTP 410 on a listing that was indexed and is now
    // deleted. A server component cannot set a response status in Next 15, so
    // the crawler signal is carried by `robots: noindex` from generateMetadata
    // above, and the reader gets a page that explains itself and offers a way
    // onward. The status code remains 200 — the one part of §15 not met, and
    // it needs a middleware or a rewrite to fix properly.
    return (
      <GonePage
        title="Ovaj oglas više ne postoji"
        body="Vlasnik ga je uklonio. Probaj pretragu — možda nađeš nešto slično."
      />
    )
  }

  if (result.kind === 'not_found') notFound()

  const { listing } = result

  const [summary, listingReviews, otherReviews] = await Promise.all([
    loadReviewSummary(supabase, listing.id),
    loadReviews(supabase, {
      listingId: listing.id,
      ownerId: listing.owner.id,
      scope: 'listing',
      limit: REVIEW_PAGE_SIZE,
      offset: 0,
    }),
    // Only the count is needed up front; the rows load when the reader asks.
    loadReviews(supabase, {
      listingId: listing.id,
      ownerId: listing.owner.id,
      scope: 'owner_other',
      limit: 1,
      offset: 0,
    }),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for the Product/Offer block (doc 04 §15). The content
        // is built from our own columns, not from anything a user can inject
        // as markup.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd(listing)) }}
      />

      <Suspense>
        <ListingPublishedToast />
      </Suspense>

      <Suspense>
        <ListingDetailView
          listing={listing}
          summary={summary}
          reviews={listingReviews.reviews}
          ownerOtherCount={otherReviews.total}
        />
      </Suspense>
    </>
  )
}

function GonePage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="mt-0 mb-2 text-2xl font-semibold text-card-foreground">{title}</h1>
      <p className="mt-0 mb-6 text-muted-foreground">{body}</p>
      <a
        href="/search"
        className="inline-block rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white no-underline"
      >
        Otvori pretragu
      </a>
    </div>
  )
}
