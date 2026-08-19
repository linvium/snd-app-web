'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDownUpIcon, CheckIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'

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

const ICON_BUTTON =
  'relative inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-zinc-700 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'

export default function FilterBar({
  params,
  categories,
  hasLocation,
  onChange,
  onClearAll,
}: FilterBarProps) {
  const activeCount = countActiveFilters(params)

  return (
    <div className="sticky top-14 z-20 border-b border-border bg-card md:top-[72px]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-4 py-2.5 md:px-6">
        <FiltersPopover
          params={params}
          categories={categories}
          hasLocation={hasLocation}
          activeCount={activeCount}
          onChange={onChange}
        />

        <SortControl value={params.sort} onChange={(sort) => onChange({ sort })} />

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-1 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border-none bg-transparent px-2 py-1.5 text-[13px] font-semibold whitespace-nowrap text-brand-600 hover:underline"
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

function FiltersPopover({
  params,
  categories,
  hasLocation,
  activeCount,
  onChange,
}: {
  params: SearchParams
  categories: SndCategoryNode[]
  hasLocation: boolean
  activeCount: number
  onChange: (changes: Partial<SearchParams>) => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={activeCount > 0 ? `Filteri (${activeCount} aktivna)` : 'Filteri'}
          className={cn(
            ICON_BUTTON,
            activeCount > 0 && 'border-brand-500 bg-brand-50 text-brand-700'
          )}
        >
          <SlidersHorizontalIcon className="size-4" aria-hidden />
          {activeCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-brand-500 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={panelId}
        align="start"
        className="max-h-[70vh] w-80 overflow-y-auto rounded-2xl p-0 shadow-xl"
      >
        <FilterSection
          title={findNode(categories, params.category)?.name ?? 'Kategorija'}
          isActive={Boolean(params.category)}
        >
          <CategoryPanel
            categories={categories}
            value={params.category}
            onChange={(category) => {
              onChange({ category })
              setOpen(false)
            }}
          />
        </FilterSection>

        <FilterSection
          title={priceFilterLabel({ priceMin: params.priceMin, priceMax: params.priceMax })}
          isActive={params.priceMin !== null || params.priceMax !== null}
        >
          <PricePanel
            min={params.priceMin}
            max={params.priceMax}
            onChange={(priceMin, priceMax) => onChange({ priceMin, priceMax })}
          />
        </FilterSection>

        {hasLocation ? (
          <FilterSection
            title={
              params.radiusKm === DEFAULT_RADIUS_KM
                ? 'Udaljenost'
                : radiusFilterLabel(params.radiusKm)
            }
            isActive={params.radiusKm !== DEFAULT_RADIUS_KM}
          >
            <DistancePanel
              value={params.radiusKm}
              onChange={(radiusKm) => {
                onChange({ radiusKm })
                setOpen(false)
              }}
            />
          </FilterSection>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function SortControl({
  value,
  onChange,
}: {
  value: SearchSort
  onChange: (sort: SearchSort) => void
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`Sortiranje: ${SEARCH_SORT_LABELS[value]}`}
            className={ICON_BUTTON}
          >
            <ArrowDownUpIcon className="size-4" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent id={panelId} align="start" className="w-56 rounded-2xl p-2 shadow-xl">
          <div className="flex flex-col">
            {SEARCH_SORTS.map((sort) => (
              <button
                key={sort}
                type="button"
                onClick={() => {
                  onChange(sort)
                  setOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  value === sort && 'bg-brand-50 font-semibold text-brand-700'
                )}
              >
                {value === sort ? (
                  <CheckIcon className="size-3.5" aria-hidden />
                ) : (
                  <span className="size-3.5" aria-hidden />
                )}
                {SEARCH_SORT_LABELS[sort]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <span className="max-w-[72px] truncate text-[10px] leading-none font-medium text-muted-foreground">
        {SEARCH_SORT_LABELS[value]}
      </span>
    </div>
  )
}

function FilterSection({
  title,
  isActive,
  children,
}: {
  title: string
  isActive: boolean
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3
          className={cn(
            'm-0 text-[13px] font-semibold',
            isActive ? 'text-brand-700' : 'text-card-foreground'
          )}
        >
          {title}
        </h3>
      </div>
      <div className="px-2 pb-3">{children}</div>
    </section>
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

function CategoryPanel({
  categories,
  value,
  onChange,
}: {
  categories: SndCategoryNode[]
  value: string | null
  onChange: (slug: string | null) => void
}) {
  return (
    <div className="flex max-h-52 flex-col overflow-y-auto">
      <CategoryOption
        label="Sve kategorije"
        isSelected={!value}
        onSelect={() => onChange(null)}
      />
      {categories.map((root) => (
        <div key={root.id} className="mt-1">
          <CategoryOption
            label={root.name}
            count={root.listing_count}
            isSelected={value === root.slug}
            isParent
            onSelect={() => onChange(root.slug)}
          />
          {root.children.map((child) => (
            <CategoryOption
              key={child.id}
              label={child.name}
              count={child.listing_count}
              isSelected={value === child.slug}
              indented
              onSelect={() => onChange(child.slug)}
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
  )
}

function CategoryOption({
  label,
  count,
  isSelected,
  isParent = false,
  indented = false,
  onSelect,
}: {
  label: string
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

function PricePanel({
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
    <div className="flex flex-col gap-3 px-2">
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
  )
}

function DistancePanel({
  value,
  onChange,
}: {
  value: number
  onChange: (radiusKm: number) => void
}) {
  return (
    <div className="flex flex-col">
      {RADIUS_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
            value === option && 'bg-brand-50 font-semibold text-brand-700'
          )}
        >
          {value === option ? (
            <CheckIcon className="size-3.5" aria-hidden />
          ) : (
            <span className="size-3.5" aria-hidden />
          )}
          {radiusFilterLabel(option)}
        </button>
      ))}
    </div>
  )
}
