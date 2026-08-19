'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, GridIcon, ImageIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { DetailImage } from '@/types/listing-detail'

interface ListingGalleryProps {
  images: DetailImage[]
  title: string
}

function altFor(title: string, index: number, total: number): string {
  return `${title} – slika ${index + 1} od ${total}`
}

/**
 * The gallery (doc 04 §3).
 *
 * Desktop lays out a mosaic whose shape follows the image count — one big, or
 * half-and-half, or one large plus a 2×2 grid — because a fixed grid padded
 * with blanks looks like a listing with missing photos rather than one with
 * three good ones.
 *
 * Mobile is a scroll-snap strip with a counter, which beats a carousel widget:
 * it is the gesture the platform already provides, and it keeps working while
 * JavaScript is still loading.
 */
export default function ListingGallery({ images, title }: ListingGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [visibleIndex, setVisibleIndex] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  const total = images.length
  const isOpen = lightboxIndex !== null

  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((current) => {
        if (current === null) return current
        return (current + delta + total) % total
      })
    },
    [total]
  )

  useEffect(() => {
    if (!isOpen) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxIndex(null)
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }

    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while the overlay owns the screen.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, step])

  if (total === 0) {
    // Publishing requires at least one photo, so this is the "should not
    // happen" branch rather than a real state (doc 04 §3).
    return (
      <div className="grid aspect-4/3 w-full place-items-center rounded-xl bg-muted text-zinc-300 md:aspect-[2/1]">
        <ImageIcon className="size-12" strokeWidth={1.5} aria-hidden />
      </div>
    )
  }

  const onStripScroll = () => {
    const strip = stripRef.current
    if (!strip) return
    setVisibleIndex(Math.round(strip.scrollLeft / strip.clientWidth))
  }

  return (
    <>
      {/* Mobile: swipe strip with a counter. */}
      <div className="relative md:hidden">
        <div
          ref={stripRef}
          onScroll={onStripScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="relative aspect-4/3 w-full flex-none snap-center border-none bg-muted p-0"
            >
              <Image
                src={image.large_url}
                alt={altFor(title, index, total)}
                fill
                sizes="100vw"
                priority={index === 0}
                fetchPriority={index === 0 ? 'high' : undefined}
                loading={index === 0 ? undefined : 'lazy'}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {total > 1 ? (
          <span className="absolute right-3 bottom-3 rounded-full bg-zinc-900/75 px-2.5 py-1 text-xs font-semibold text-white">
            {visibleIndex + 1}/{total}
          </span>
        ) : null}
      </div>

      {/* Desktop mosaic. */}
      <div
        className={cn(
          'relative hidden overflow-hidden rounded-xl md:grid md:gap-2',
          total === 1 && 'md:grid-cols-1',
          total === 2 && 'md:grid-cols-2',
          total === 3 && 'md:grid-cols-2 md:grid-rows-2',
          total >= 4 && 'md:grid-cols-4 md:grid-rows-2'
        )}
      >
        {images.slice(0, total >= 5 ? 5 : total).map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            aria-label={`Otvori ${altFor(title, index, total)}`}
            className={cn(
              'group relative cursor-pointer overflow-hidden border-none bg-muted p-0',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
              total === 1 && 'aspect-[2/1]',
              total === 2 && 'aspect-4/3',
              // Three images: one tall on the left, two stacked on the right.
              total === 3 && index === 0 && 'row-span-2 aspect-auto',
              total === 3 && index > 0 && 'aspect-4/3',
              total >= 4 && index === 0 && 'col-span-2 row-span-2 aspect-auto',
              total >= 4 && index > 0 && 'aspect-4/3'
            )}
          >
            <Image
              src={index === 0 ? image.large_url : image.medium_url}
              alt={altFor(title, index, total)}
              fill
              sizes={index === 0 ? '(max-width: 1023px) 100vw, 50vw' : '25vw'}
              priority={index === 0}
              fetchPriority={index === 0 ? 'high' : undefined}
              loading={index === 0 ? undefined : 'lazy'}
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />

            {/* The overflow badge sits on the last visible tile. */}
            {total > 5 && index === 4 ? (
              <span className="absolute inset-0 grid place-items-center bg-zinc-900/55 text-lg font-semibold text-white">
                +{total - 5}
              </span>
            ) : null}
          </button>
        ))}

        {total > 1 ? (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute right-4 bottom-4 flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[13px] font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
          >
            <GridIcon className="size-4" aria-hidden />
            Prikaži sve slike
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galerija: ${title}`}
          className="fixed inset-0 z-50 flex flex-col bg-black"
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium">
              {lightboxIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Zatvori galeriju"
              autoFocus
              className="grid size-10 cursor-pointer place-items-center rounded-full border-none bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <XIcon className="size-5" aria-hidden />
            </button>
          </div>

          <div className="relative flex-1">
            <Image
              key={images[lightboxIndex].id}
              src={images[lightboxIndex].large_url}
              alt={altFor(title, lightboxIndex, total)}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Prethodna slika"
                  className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-white/10 text-white transition-colors hover:bg-white/25"
                >
                  <ChevronLeftIcon className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Sledeća slika"
                  className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-white/10 text-white transition-colors hover:bg-white/25"
                >
                  <ChevronRightIcon className="size-6" aria-hidden />
                </button>
              </>
            ) : null}
          </div>

          {total > 1 ? (
            <div className="flex justify-center gap-2 overflow-x-auto p-4">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Prikaži sliku ${index + 1}`}
                  aria-current={index === lightboxIndex}
                  className={cn(
                    'relative h-14 w-20 flex-none cursor-pointer overflow-hidden rounded-md border-2 bg-zinc-800 p-0',
                    index === lightboxIndex ? 'border-white' : 'border-transparent opacity-60'
                  )}
                >
                  <Image
                    src={image.thumbnail_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
