'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebouncedValue } from '@/hooks/search'
import { countActiveFilters, priceFilterLabel, radiusFilterLabel } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { SndCategoryNode } from '@/types/category'
import {
  DEFAULT_RADIUS_KM,
  RADIUS_OPTIONS,
  SEARCH_SORT_LABELS,
  SEARCH_SORTS,
  type SearchParams,
  type SearchSort,
} from '@/types/search'

interface FilterBarProps {
  params: SearchParams
  categories: SndCategoryNode[]
  /** The distance filter is meaningless without a point to measure from (§6.1). */
  hasLocation: boolean
  onChange: (changes: Partial<SearchParams>) => void
  onClearAll: () => void
}

export default function FilterBar({
  params,
  categories,
  hasLocation,
  onChange,
  onClearAll,
}: FilterBarProps) {
  const activeCount = countActiveFilters(params)

  return (
    <div className="sticky top-14 z-20 border-b border-border bg-card md:top-[72px]" data-testid="search-filters">
      <div
        // Horizontally scrollable on mobile so the chips never wrap into a
        // second sticky row (doc 03 §3.3).
        className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden"
      >
        <CategoryFilter
          categories={categories}
          value={params.category}
          onChange={(category) => onChange({ category })}
        />

        <PriceFilter
          min={params.priceMin}
          max={params.priceMax}
          onChange={(priceMin, priceMax) => onChange({ priceMin, priceMax })}
        />

        {hasLocation ? (
          <DistanceFilter
            value={params.radiusKm}
            onChange={(radiusKm) => onChange({ radiusKm })}
          />
        ) : null}

        <SortFilter value={params.sort} onChange={(sort) => onChange({ sort })} />

        {/* Only shown once there is something to clear (doc 03 §6.2). */}
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border-none bg-transparent px-2 py-1.5 text-[13px] font-semibold text-brand-600 whitespace-nowrap hover:underline"
          >
            <XIcon className="size-3.5" aria-hidden />
            Obriši sve
            <span className="sr-only">filtere ({activeCount})</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Every filter is a button that reports its own open state, so a screen reader
 * announces the panel the same way the chevron shows it (doc 03 §13).
 */
function FilterChip({
  label,
  isActive,
  children,
  panelClassName,
  testId,
}: {
  label: string
  isActive: boolean
  children: (close: () => void) => React.ReactNode
  panelClassName?: string
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          data-testid={testId}
          className={cn(
            'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
            isActive
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-border bg-card text-zinc-700 hover:bg-muted'
          )}
        >
          {label}
          <ChevronDownIcon className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent id={id} className={cn('w-72 p-2', panelClassName)}>
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  )
}

function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: SndCategoryNode[]
  value: string | null
  onChange: (slug: string | null) => void
}) {
  const selected = findNode(categories, value)

  return (
    <FilterChip
      label={selected ? selected.name : 'Kategorija'}
      isActive={Boolean(value)}
      panelClassName="max-h-[60vh] w-80 overflow-y-auto"
      testId="filter-category"
    >
      {(close) => (
        <div className="flex flex-col">
          <CategoryOption
            label="Sve kategorije"
            slug="all"
            isSelected={!value}
            onSelect={() => {
              onChange(null)
              close()
            }}
          />
          {categories.map((root) => (
            <div key={root.id} className="mt-1">
              {/* Picking a parent includes everything under it (§6.1). */}
              <CategoryOption
                label={root.name}
                slug={root.slug}
                count={root.listing_count}
                isSelected={value === root.slug}
                isParent
                onSelect={() => {
                  onChange(root.slug)
                  close()
                }}
              />
              {root.children.map((child) => (
                <CategoryOption
                  key={child.id}
                  label={child.name}
                  slug={child.slug}
                  count={child.listing_count}
                  isSelected={value === child.slug}
                  indented
                  onSelect={() => {
                    onChange(child.slug)
                    close()
                  }}
                />
              ))}
            </div>
          ))}
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-zinc-500">
              Još nema popunjenih kategorija.
            </p>
          ) : null}
        </div>
      )}
    </FilterChip>
  )
}

function CategoryOption({
  label,
  slug,
  count,
  isSelected,
  isParent = false,
  indented = false,
  onSelect,
}: {
  label: string
  slug: string
  count?: number
  isSelected: boolean
  isParent?: boolean
  indented?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`category-option-${slug}`}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
        isParent && 'font-semibold',
        indented && 'pl-6 text-[13px] text-zinc-600',
        isSelected && 'bg-brand-50 text-brand-700'
      )}
    >
      <span className="flex items-center gap-1.5">
        {isSelected ? <CheckIcon className="size-3.5" aria-hidden /> : null}
        {label}
      </span>
      {count !== undefined ? <span className="text-xs text-zinc-400">{count}</span> : null}
    </button>
  )
}

function findNode(nodes: SndCategoryNode[], slug: string | null): SndCategoryNode | null {
  if (!slug) return null
  for (const node of nodes) {
    if (node.slug === slug) return node
    const found = findNode(node.children, slug)
    if (found) return found
  }
  return null
}

/**
 * Typed values settle for 400 ms before they hit the URL, so dragging a price
 * from 500 to 2000 fires one search and not fifteen (doc 03 §6.1, §12).
 */
function PriceFilter({
  min,
  max,
  onChange,
}: {
  min: number | null
  max: number | null
  onChange: (min: number | null, max: number | null) => void
}) {
  const [draft, setDraft] = useState({ min: min?.toString() ?? '', max: max?.toString() ?? '' })
  const debounced = useDebouncedValue(draft, 400)
  const committed = useRef({ min, max })

  // Re-sync when the URL changes from elsewhere (back button, "clear all").
  useEffect(() => {
    committed.current = { min, max }
    setDraft({ min: min?.toString() ?? '', max: max?.toString() ?? '' })
  }, [min, max])

  useEffect(() => {
    const nextMin = debounced.min === '' ? null : Number(debounced.min)
    const nextMax = debounced.max === '' ? null : Number(debounced.max)
    if (nextMin !== null && !Number.isFinite(nextMin)) return
    if (nextMax !== null && !Number.isFinite(nextMax)) return
    if (nextMin === committed.current.min && nextMax === committed.current.max) return

    committed.current = { min: nextMin, max: nextMax }
    onChange(nextMin, nextMax)
  }, [debounced, onChange])

  const isActive = min !== null || max !== null

  return (
    <FilterChip label={priceFilterLabel({ priceMin: min, priceMax: max })} isActive={isActive}>
      {() => (
        <div className="flex flex-col gap-3 p-2">
          <p className="text-[13px] text-zinc-500">Dnevna cena u dinarima</p>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[13px] font-medium text-zinc-700">Od</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.min}
                onChange={(event) => setDraft((prev) => ({ ...prev, min: event.target.value }))}
                placeholder="0"
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
              />
            </label>
            <span className="mt-6 text-zinc-400">-</span>
            <label className="flex-1">
              <span className="mb-1 block text-[13px] font-medium text-zinc-700">Do</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.max}
                onChange={(event) => setDraft((prev) => ({ ...prev, max: event.target.value }))}
                placeholder="∞"
                className="h-11 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
              />
            </label>
          </div>
          {isActive ? (
            <button
              type="button"
              onClick={() => setDraft({ min: '', max: '' })}
              className="cursor-pointer self-start border-none bg-transparent p-0 text-[13px] font-semibold text-brand-600 hover:underline"
            >
              Poništi cenu
            </button>
          ) : null}
        </div>
      )}
    </FilterChip>
  )
}

function DistanceFilter({
  value,
  onChange,
}: {
  value: number
  onChange: (radiusKm: number) => void
}) {
  return (
    <FilterChip
      label={value === DEFAULT_RADIUS_KM ? 'Udaljenost' : radiusFilterLabel(value)}
      isActive={value !== DEFAULT_RADIUS_KM}
      panelClassName="w-56"
    >
      {(close) => (
        <div className="flex flex-col">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                close()
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                value === option && 'bg-brand-50 font-semibold text-brand-700'
              )}
            >
              {value === option ? (
                <CheckIcon className="size-3.5" aria-hidden />
              ) : (
                <span className="size-3.5" />
              )}
              {radiusFilterLabel(option)}
            </button>
          ))}
        </div>
      )}
    </FilterChip>
  )
}

function SortFilter({
  value,
  onChange,
}: {
  value: SearchSort
  onChange: (sort: SearchSort) => void
}) {
  return (
    <FilterChip
      label={SEARCH_SORT_LABELS[value]}
      // Sorting is never "active" in the filter sense — there is always one.
      isActive={false}
      panelClassName="w-56"
    >
      {(close) => (
        <div className="flex flex-col">
          {SEARCH_SORTS.map((sort) => (
            <button
              key={sort}
              type="button"
              onClick={() => {
                onChange(sort)
                close()
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                value === sort && 'bg-brand-50 font-semibold text-brand-700'
              )}
            >
              {value === sort ? (
                <CheckIcon className="size-3.5" aria-hidden />
              ) : (
                <span className="size-3.5" />
              )}
              {SEARCH_SORT_LABELS[sort]}
            </button>
          ))}
        </div>
      )}
    </FilterChip>
  )
}
