import type { Metadata } from 'next'

import CategoryDirectory from '@/components/search/CategoryDirectory'

export const metadata: Metadata = {
  title: 'Sve kategorije | SND',
  description: 'Pregledaj sve kategorije predmeta dostupnih za iznajmljivanje na SND-u.',
}

export default function CategoriesPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-4 py-8 md:px-8">
      <h1 className="mb-2 text-2xl font-semibold text-card-foreground">Sve kategorije</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Prikazane su samo kategorije u kojima trenutno ima objavljenih predmeta.
      </p>

      <CategoryDirectory />
    </main>
  )
}
