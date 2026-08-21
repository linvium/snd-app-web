'use client'

import { useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronDownIcon, Loader2Icon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { categoryPathLabel, isLeafCategory } from '@/lib/categories'
import { cn } from '@/lib/utils'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import type { SndCategoryCatalog } from '@/types/category'
import { useCategorySuggest } from '@/hooks/categories'
import { Button } from '@/components/ui/button'

export function CategoryStep({
  title,
  categories,
  categoryId,
  error,
  locked,
  loading,
  onSelect,
}: {
  title: string
  categories: SndCategoryCatalog[]
  categoryId: string | null
  error?: string
  locked?: boolean
  loading?: boolean
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const suggest = useCategorySuggest(title)

  const selected = categories.find((row) => row.id === categoryId) ?? null
  const parentMap = useMemo(() => {
    const map = new Map<string | null, SndCategoryCatalog[]>()
    for (const row of categories) {
      const key = row.parent_id
      const list = map.get(key) ?? []
      list.push(row)
      map.set(key, list)
    }
    return map
  }, [categories])

  const currentParent = parentId ? categories.find((row) => row.id === parentId) : null
  const visible = (parentMap.get(parentId) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const filtered = query.trim().length >= 2
    ? categories.filter((row) => {
        const hay = `${row.full_path} ${row.name}`.toLowerCase()
        return hay.includes(query.trim().toLowerCase()) && isLeafCategory(categories, row.id)
      })
    : visible

  const path = selected ? categoryPathLabel(selected) : null
  const suggestions = (suggest.data ?? []).slice(0, 2)

  return (
    <div className="flex flex-col gap-3">
      <Popover
        open={locked || loading ? false : open}
        onOpenChange={(next) => {
          if (locked || loading) return
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={locked || loading}
            data-testid="category-picker"
            className={cn(
              'flex w-full items-center justify-between rounded-md border bg-card px-3.5 py-2.5 text-left',
              error ? 'border-destructive' : 'border-input',
              'focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100',
              (locked || loading) && 'cursor-not-allowed opacity-70'
            )}
            aria-invalid={error ? true : undefined}
            aria-busy={loading || undefined}
          >
            <span className="min-w-0">
              {loading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" data-testid="category-loading" />
                  Učitavam kategorije…
                </span>
              ) : selected ? (
                <>
                  {path?.parentPath ? (
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {path.parentPath}
                    </span>
                  ) : null}
                  <span className="block truncate text-base font-medium text-card-foreground">
                    {path?.leafName ?? selected.name}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Izaberi kategoriju</span>
              )}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pretraži kategorije"
            className="mb-2"
          />
          {currentParent && query.trim().length < 2 ? (
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
              onClick={() => setParentId(currentParent.parent_id)}
            >
              <ChevronLeftIcon className="size-4" />
              {currentParent.name}
            </button>
          ) : null}
          <ul className="m-0 max-h-64 list-none overflow-y-auto p-0">
            {filtered.map((row) => {
              const leaf = isLeafCategory(categories, row.id)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    data-testid="category-option"
                    data-leaf={leaf ? 'true' : 'false'}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      if (leaf) {
                        onSelect(row.id)
                        setOpen(false)
                        setQuery('')
                        setParentId(null)
                      } else {
                        setParentId(row.id)
                        setQuery('')
                      }
                    }}
                  >
                    <span className="truncate">
                      {query.trim().length >= 2 ? row.full_path.replace(/ › /g, ' › ') : row.name}
                    </span>
                    {!leaf ? <ChevronDownIcon className="size-4 -rotate-90 text-muted-foreground" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {error ? <p className="m-0 text-[13px] text-destructive">{error}</p> : null}

      {!locked && suggestions.length > 0 ? (
        <div data-testid="category-suggestion">
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Predlažemo</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((row) => (
              <button
                key={row.id}
                type="button"
                data-testid="category-suggestion-chip"
                onClick={() => onSelect(row.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[13px] font-medium',
                  row.id === categoryId
                    ? 'border-brand-500 bg-brand-100 text-brand-700'
                    : 'border-brand-200 bg-brand-50 text-brand-700'
                )}
              >
                {row.full_path}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="rounded-lg bg-muted px-3 py-2.5 text-[13px] leading-5 text-muted-foreground">
          <p className="m-0 font-medium text-card-foreground">Garancija za {selected.name}:</p>
          <p className="mt-1 mb-1">
            {selected.guarantee_cap_minor
              ? `Šteta je pokrivena do ${formatPriceMinor(selected.guarantee_cap_minor)}, bez učešća.`
              : 'Pokriće zavisi od kategorije.'}
          </p>
          <Button variant="link" className="h-auto p-0 text-[13px]" asChild>
            {/* No target="_blank" any more: the support sheet opens over the
                form, which is what the new tab was working around. */}
            <a href="/support/guarantee" data-testid="guarantee-link">
              Više o garanciji →
            </a>
          </Button>
        </div>
      ) : null}

      {locked ? (
        <p className="m-0 text-[13px] text-muted-foreground" data-testid="locked-field-notice">
          Ne može se menjati dok traje aktivna rezervacija.
        </p>
      ) : null}
    </div>
  )
}
