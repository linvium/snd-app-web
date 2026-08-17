'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ListingGallery({
  images,
}: {
  images: { id: string; thumbnail_url: string; large_url: string }[]
}) {
  const [active, setActive] = useState(0)
  const current = images[active]

  if (!current) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-xl bg-zinc-100 text-zinc-300">
        <ImageIcon className="size-10" strokeWidth={1.5} aria-hidden />
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.large_url} alt="" className="aspect-[4/3] w-full object-cover" />
      </div>
      {images.length > 1 ? (
        <ul className="mt-2 mb-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-6">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Slika ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  'w-full cursor-pointer overflow-hidden rounded-lg border bg-zinc-100',
                  index === active ? 'border-brand-500 ring-2 ring-brand-500' : 'border-transparent'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.thumbnail_url} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
