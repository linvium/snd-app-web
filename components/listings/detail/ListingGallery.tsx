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
 * Thumbnails past this point collapse into a "+N" tile. Five is where a strip
 * of previews stops being scannable and starts being a filmstrip that hides
 * part of the photo it is sitting on.
 */
const MAX_THUMBS = 5

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
  const [heroIndex, setHeroIndex] = useState(0)
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

  // Arrowing through the overlay moves the hero behind it, so closing lands on
  // the photo you were actually looking at rather than snapping back.
  useEffect(() => {
    if (lightboxIndex !== null) setHeroIndex(lightboxIndex)
  }, [lightboxIndex])

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

      {/* Desktop: one photo at full size with the others as previews laid over
          its foot. The mosaic gave five photos equal billing and cropped four
          of them to do it - here the item is shown once, properly, and the
          strip is a way in rather than a second subject competing with it. */}
      <div className="relative hidden overflow-hidden rounded-xl bg-muted md:block">
        <button
          type="button"
          onClick={() => setLightboxIndex(heroIndex)}
          aria-label={`Otvori ${altFor(title, heroIndex, total)} preko celog ekrana`}
          className="group relative block aspect-[2/1] w-full cursor-pointer border-none bg-muted p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400"
        >
          <Image
            key={images[heroIndex].id}
            src={images[heroIndex].large_url}
            alt={altFor(title, heroIndex, total)}
            fill
            // From lg up the gallery lives in the left column (~728px), not the
            // full page width, so a viewport-relative hint over-fetches.
            sizes="(max-width: 1023px) 100vw, 728px"
            priority={heroIndex === 0}
            fetchPriority={heroIndex === 0 ? 'high' : undefined}
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />

          <span className="pointer-events-none absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-zinc-900/65 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <GridIcon className="size-3.5" aria-hidden />
            {total > 1 ? 'Prikaži sve slike' : 'Uvećaj'}
          </span>
        </button>

        {total > 1 ? (
          // The scrim is inert so the whole photo stays clickable; only the
          // tiles themselves take the pointer back.
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-zinc-950/65 to-transparent pt-12 pb-3">
            <div className="pointer-events-auto flex items-center gap-2">
              {images.slice(0, MAX_THUMBS).map((image, index) => {
                // The last visible tile carries whatever is left behind it.
                const hidden = total - MAX_THUMBS
                const isOverflow = hidden > 0 && index === MAX_THUMBS - 1
                const isCurrent = index === heroIndex && !isOverflow

                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => (isOverflow ? setLightboxIndex(index) : setHeroIndex(index))}
                    aria-label={
                      isOverflow
                        ? `Prikaži još ${hidden + 1} slika`
                        : `Prikaži ${altFor(title, index, total)}`
                    }
                    aria-current={isCurrent}
                    className={cn(
                      'relative h-12 w-16 flex-none cursor-pointer overflow-hidden rounded-md border-2 bg-zinc-800 p-0 transition',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                      isCurrent ? 'border-white' : 'border-white/40 opacity-80 hover:opacity-100'
                    )}
                  >
                    <Image
                      src={image.thumbnail_url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />

                    {isOverflow ? (
                      <span className="absolute inset-0 grid place-items-center bg-zinc-950/65 text-sm font-semibold text-white">
                        +{hidden + 1}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
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
