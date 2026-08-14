'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDownIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useCategoryTree } from '@/hooks/categories'
import { cn } from '@/lib/utils'
import type { SndCategoryNode } from '@/types/category'

/**
 * The full directory of populated categories (doc 03 §11). Empty branches are
 * filtered out server-side, so anything on this page leads somewhere.
 */
export default function CategoryDirectory() {
  const { tree, isLoading, isError, refetch } = useCategoryTree()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="text-lg font-semibold">Nešto je krenulo naopako</h2>
        <p className="text-sm text-zinc-500">Pokušaj ponovo za koji trenutak.</p>
        <Button onClick={() => refetch()}>Pokušaj ponovo</Button>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="text-lg font-semibold">Još nema objavljenih predmeta</h2>
        <p className="max-w-md text-sm text-zinc-500">
          Kategorije se pojavljuju čim neko objavi prvi predmet u njima.
        </p>
        <Button asChild>
          <Link href="/listings/new">Objavi predmet</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
      {tree.map((root) => (
        <RootCategory key={root.id} category={root} />
      ))}
    </div>
  )
}

function RootCategory({ category }: { category: SndCategoryNode }) {
  // Collapsed on phones so the list of roots stays scannable (doc 03 §11).
  const [open, setOpen] = useState(false)

  return (
    <section className="border-b border-border pb-4 md:border-none md:pb-0">
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-2 border-none bg-transparent p-0 text-left md:pointer-events-none"
        >
          <Link
            href={`/search?category=${category.slug}`}
            className="text-base font-semibold text-card-foreground hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {category.name}
            <span className="ml-2 text-[13px] font-normal text-zinc-400">
              {category.listing_count}
            </span>
          </Link>
          <ChevronDownIcon
            className={cn('size-4 shrink-0 text-zinc-400 transition-transform md:hidden', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h2>

      <ul
        className={cn(
          'm-0 mt-2 list-none flex-col gap-1.5 p-0 md:flex',
          open ? 'flex' : 'hidden'
        )}
      >
        {category.children.map((child) => (
          <li key={child.id}>
            <Link
              href={`/search?category=${child.slug}`}
              className="flex items-baseline justify-between gap-2 text-sm text-zinc-600 hover:text-brand-600 hover:underline"
            >
              {child.name}
              <span className="text-xs text-zinc-400">{child.listing_count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
