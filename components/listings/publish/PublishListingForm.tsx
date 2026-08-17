'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/page-loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCategoryCatalog } from '@/hooks/categories'
import {
  useDeleteListing,
  useListing,
  usePauseListing,
  usePublishListing,
  useResumeListing,
  useSaveListing,
  usePriceSuggestions,
} from '@/hooks/listings'
import { useLocations } from '@/hooks/user'
import { isLeafCategory } from '@/lib/categories'
import {
  isAllCapsTitle,
  minorToRsd,
  rsdToMinor,
  validateListingForm,
  validatePrices,
  type FieldErrors,
  type StepError,
} from '@/lib/listings'
import { ApiError } from '@/lib/search/search.service'
import { cn } from '@/lib/utils'
import type { CancellationPolicy, SaveListingInput, StepKey } from '@/types/listing'

import { AddLocationModal } from './AddLocationModal'
import { LocationsTipCard, PhotoTipCard, PublishSidebar } from './PublishSidebar'
import { StepBadge, type StepBadgeState } from './StepBadge'
import { CancellationStep } from './steps/CancellationStep'
import { CategoryStep } from './steps/CategoryStep'
import { DescribeStep } from './steps/DescribeStep'
import { coverageCopy, ItemValueStep } from './steps/ItemValueStep'
import { LocationsStep } from './steps/LocationsStep'
import { PhotosStep } from './steps/PhotosStep'
import { PriceStep } from './steps/PriceStep'

const STEPS: { key: StepKey; title: string }[] = [
  { key: 'describe', title: 'Opiši svoj predmet' },
  { key: 'photos', title: 'Fotografije' },
  { key: 'category', title: 'Izaberi kategoriju' },
  { key: 'price', title: 'Cena' },
  { key: 'locations', title: 'Gde se predaje' },
  { key: 'cancellation', title: 'Uslovi otkazivanja' },
  { key: 'value', title: 'Vrednost predmeta' },
]

function ErrorSummary({
  steps,
  errors,
  onJump,
  compact,
}: {
  steps: { key: StepKey; title: string }[]
  errors: StepError[]
  onJump: (key: StepKey) => void
  compact?: boolean
}) {
  return (
    <div
      data-testid="error-summary"
      className={cn(
        'rounded-lg border border-destructive/30 bg-red-50 px-4 py-3 text-[13px] text-destructive',
        compact ? 'mb-3' : 'mb-4'
      )}
    >
      <p className="m-0 font-semibold">
        Popravi {errors.length} {errors.length === 1 ? 'stvar' : 'stvari'} pre objave:
      </p>
      <ul className="mt-2 mb-0 list-none p-0">
        {errors.map((item) => (
          <li key={item.step}>
            <button
              type="button"
              className="text-left text-destructive underline-offset-2 hover:underline"
              onClick={() => onJump(item.step)}
            >
              → Korak {steps.findIndex((step) => step.key === item.step) + 1}: {item.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PublishListingForm({ listingId }: { listingId: string }) {
  const router = useRouter()
  const listingQuery = useListing(listingId)
  const listing = listingQuery.data
  const save = useSaveListing(listingId)
  const publish = usePublishListing(listingId)
  const pause = usePauseListing(listingId)
  const resume = useResumeListing(listingId)
  const remove = useDeleteListing(listingId)
  const categoriesQuery = useCategoryCatalog()
  const locationsQuery = useLocations()
  const categories = categoriesQuery.flat
  const locations = locationsQuery.data ?? []

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [price1, setPrice1] = useState('')
  const [price3, setPrice3] = useState('')
  const [price7, setPrice7] = useState('')
  const [locationIds, setLocationIds] = useState<string[]>([])
  const [policy, setPolicy] = useState<CancellationPolicy>('flexible')
  const [itemValue, setItemValue] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [fields, setFields] = useState<FieldErrors>({})
  const [stepErrors, setStepErrors] = useState<StepError[]>([])
  const [activeStep, setActiveStep] = useState<StepKey>('describe')
  const [locationOpen, setLocationOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const sectionRefs = useRef<Record<StepKey, HTMLElement | null>>({
    describe: null,
    photos: null,
    category: null,
    price: null,
    locations: null,
    cancellation: null,
    value: null,
  })

  useEffect(() => {
    if (!listing || hydrated) return
    setTitle(listing.title ?? '')
    setDescription(listing.description ?? '')
    setCategoryId(listing.category_id)
    setPrice1(listing.price_1_day_minor == null ? '' : String(Math.round(minorToRsd(listing.price_1_day_minor))))
    setPrice3(listing.price_3_days_minor == null ? '' : String(Math.round(minorToRsd(listing.price_3_days_minor))))
    setPrice7(listing.price_7_days_minor == null ? '' : String(Math.round(minorToRsd(listing.price_7_days_minor))))
    setLocationIds(listing.location_ids)
    setPolicy(listing.cancellation_policy)
    setItemValue(listing.item_value_minor == null ? '' : String(Math.round(minorToRsd(listing.item_value_minor))))
    setHydrated(true)
  }, [listing, hydrated])

  const selectedCategory = categories.find((row) => row.id === categoryId) ?? null
  const suggestions = usePriceSuggestions(categoryId)
  const isDraft = listing?.status === 'draft'
  const isPublished = listing?.status === 'published' || listing?.status === 'paused'
  const locked = Boolean(listing?.has_active_booking)

  const parseRsd = (value: string): number | null => {
    if (!value.trim()) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const formValues = useMemo(
    () => ({
      title,
      description,
      categoryId,
      categoryIsLeaf: isLeafCategory(categories, categoryId),
      categoryEnabled: selectedCategory?.is_enabled ?? true,
      imageCount: listing?.images.length ?? 0,
      price1DayRsd: parseRsd(price1),
      price3DaysRsd: parseRsd(price3),
      price7DaysRsd: parseRsd(price7),
      locationIds,
      cancellationPolicy: policy,
      itemValueRsd: parseRsd(itemValue),
    }),
    [title, description, categoryId, categories, selectedCategory, listing?.images.length, price1, price3, price7, locationIds, policy, itemValue]
  )

  const livePriceErrors = validatePrices(formValues)

  const payload = (): SaveListingInput => ({
    title: title.trim() || null,
    description: description.trim() || null,
    category_id: categoryId,
    price_1_day_minor: formValues.price1DayRsd == null ? null : rsdToMinor(formValues.price1DayRsd),
    price_3_days_minor: formValues.price3DaysRsd == null ? null : rsdToMinor(formValues.price3DaysRsd),
    price_7_days_minor: formValues.price7DaysRsd == null ? null : rsdToMinor(formValues.price7DaysRsd),
    item_value_minor: formValues.itemValueRsd == null ? null : rsdToMinor(formValues.itemValueRsd),
    cancellation_policy: policy,
    location_ids: locationIds,
  })

  useEffect(() => {
    if (!hydrated || !isDraft || !dirty) return
    setSaveStatus('saving')
    const timer = window.setTimeout(() => {
      save.mutate(payload(), {
        onSuccess: () => setSaveStatus('saved'),
        onError: () => {
          setSaveStatus('error')
          toast.error('Nismo mogli da sačuvamo izmene. Pokušaj ponovo.')
        },
      })
    }, 2000)
    return () => window.clearTimeout(timer)
    // payload is derived from the same fields that flip `dirty`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, categoryId, price1, price3, price7, locationIds, policy, itemValue, hydrated, isDraft, dirty])

  const markDirty = () => setDirty(true)

  const stepState = (key: StepKey): StepBadgeState => {
    const hasError = stepErrors.some((item) => item.step === key)
    if (hasError) return 'error'
    const complete = {
      describe: title.trim().length >= 3 && description.trim().length >= 20,
      photos: (listing?.images.length ?? 0) >= 1,
      category: Boolean(categoryId) && isLeafCategory(categories, categoryId),
      price: formValues.price1DayRsd != null && !livePriceErrors.price1 && !livePriceErrors.price3 && !livePriceErrors.price7,
      locations: locationIds.length >= 1,
      cancellation: true,
      value: formValues.itemValueRsd != null && formValues.itemValueRsd >= 1000,
    }[key]
    if (complete) return 'valid'
    if (activeStep === key) return 'active'
    return 'empty'
  }

  const scrollToStep = (key: StepKey) => {
    setActiveStep(key)
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const runValidation = () => {
    const result = validateListingForm(formValues)
    const nextFields = { ...result.fields, ...livePriceErrors }
    const nextSteps = result.steps
    setFields(nextFields)
    setStepErrors(nextSteps)
    return { fields: nextFields, steps: nextSteps }
  }

  const handlePublish = async () => {
    setSubmitted(true)
    const { steps } = runValidation()
    if (steps.length > 0) {
      scrollToStep(steps[0].step)
      const firstField = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      firstField?.focus()
      return
    }

    setSubmitting(true)
    try {
      if (isDraft) {
        await save.mutateAsync(payload())
        const published = await publish.mutateAsync()
        router.push(`/profile/listings?published=1&highlight=${published.id}`)
      } else {
        await save.mutateAsync(payload())
        router.push(`/profile/listings?saved=1&highlight=${listingId}`)
      }
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        const mapped: FieldErrors = {}
        if (error.fields.title) mapped.title = error.fields.title
        if (error.fields.description) mapped.description = error.fields.description
        if (error.fields.images) mapped.images = error.fields.images
        if (error.fields.category_id) mapped.category = error.fields.category_id
        if (error.fields.price_1_day_minor) mapped.price1 = error.fields.price_1_day_minor
        if (error.fields.locations) mapped.locations = error.fields.locations
        if (error.fields.item_value_minor) mapped.itemValue = error.fields.item_value_minor
        setFields(mapped)
        toast.error(error.message)
      } else {
        toast.error('Nismo mogli da sačuvamo izmene. Pokušaj ponovo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const itemValueRsd = parseRsd(itemValue)
  const dailyRsd = parseRsd(price1)
  const valueWarning =
    itemValueRsd != null && dailyRsd != null && itemValueRsd < dailyRsd * 10
      ? 'Vrednost izgleda niska u odnosu na dnevnu cenu. Proveri da nisi pogrešio.'
      : itemValueRsd != null &&
          selectedCategory?.suggested_price_1_day_minor &&
          itemValueRsd > 20 * minorToRsd(selectedCategory.suggested_price_1_day_minor)
        ? 'Vrednost je znatno viša od sličnih predmeta. Proveri iznos.'
        : undefined

  if (listingQuery.isLoading || !hydrated) {
    return <PageLoading>Učitavanje oglasa…</PageLoading>
  }

  if (listingQuery.isError || !listing) {
    return <p className="p-6 text-sm text-destructive">Oglas nije pronađen.</p>
  }

  const ctaLabel = submitting
    ? isDraft
      ? 'Objavljujem…'
      : 'Čuvam…'
    : isDraft
      ? 'Objavi oglas'
      : 'Sačuvaj izmene'

  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,68%)_minmax(0,32%)] lg:py-10">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="m-0 text-2xl font-semibold text-card-foreground">
            {isDraft ? 'Objavi predmet' : 'Izmeni oglas'}
          </h1>
          {isDraft ? (
            <p className="m-0 text-[13px] text-muted-foreground" data-testid="autosave-indicator">
              {saveStatus === 'saving'
                ? 'Snimam…'
                : saveStatus === 'saved'
                  ? 'Sačuvano ✓'
                  : saveStatus === 'error'
                    ? 'Nije sačuvano ✗'
                    : null}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6" data-testid="publish-form">
          {STEPS.map((step, index) => (
            <section
              key={step.key}
              id={`step-${step.key}`}
              data-testid={`step-${index + 1}-section`}
              ref={(el) => {
                sectionRefs.current[step.key] = el
              }}
              className={cn('relative pb-8 last:pb-0', index > 0 && 'pt-2')}
              onFocusCapture={() => setActiveStep(step.key)}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="absolute top-0 -left-12 hidden lg:block">
                  <StepBadge index={index + 1} state={stepState(step.key)} />
                </div>
                <div className="lg:hidden">
                  <StepBadge index={index + 1} state={stepState(step.key)} />
                </div>
                <h2 className="m-0 text-lg font-semibold">{step.title}</h2>
              </div>

              {step.key === 'photos' ? (
                <div className="mb-4 lg:hidden">
                  <PhotoTipCard />
                </div>
              ) : null}
              {step.key === 'locations' ? (
                <div className="mb-4 lg:hidden">
                  <LocationsTipCard />
                </div>
              ) : null}

              {step.key === 'describe' ? (
                <DescribeStep
                  title={title}
                  description={description}
                  titleError={submitted ? fields.title : undefined}
                  descriptionError={submitted ? fields.description : undefined}
                  titleWarning={isAllCapsTitle(title) ? 'Naslov ispisan velikim slovima izgleda kao vika.' : undefined}
                  autoFocus={isDraft}
                  onTitleChange={(value) => {
                    setTitle(value)
                    markDirty()
                  }}
                  onDescriptionChange={(value) => {
                    setDescription(value)
                    markDirty()
                  }}
                />
              ) : null}

              {step.key === 'photos' ? (
                <PhotosStep listingId={listingId} images={listing.images} error={submitted ? fields.images : undefined} />
              ) : null}

              {step.key === 'category' ? (
                <div>
                  <CategoryStep
                    title={title}
                    categories={categories}
                    categoryId={categoryId}
                    error={submitted ? fields.category : undefined}
                    locked={locked}
                    onSelect={(id) => {
                      if (locked) return
                      setCategoryId(id)
                      markDirty()
                    }}
                  />
                </div>
              ) : null}

              {step.key === 'price' ? (
                <PriceStep
                  price1={price1}
                  price3={price3}
                  price7={price7}
                  errors={{
                    price1: livePriceErrors.price1 ?? (submitted ? fields.price1 : undefined),
                    price3: livePriceErrors.price3,
                    price7: livePriceErrors.price7,
                  }}
                  suggestion={suggestions.data}
                  categoryName={selectedCategory?.name}
                  onChange={(field, value) => {
                    if (field === 'price1') setPrice1(value)
                    if (field === 'price3') setPrice3(value)
                    if (field === 'price7') setPrice7(value)
                    markDirty()
                  }}
                  onApplySuggestion={() => {
                    if (!suggestions.data) return
                    setPrice1(String(Math.round(minorToRsd(suggestions.data.price_1_day_minor))))
                    setPrice3(String(Math.round(minorToRsd(suggestions.data.price_3_days_minor))))
                    setPrice7(String(Math.round(minorToRsd(suggestions.data.price_7_days_minor))))
                    markDirty()
                  }}
                />
              ) : null}

              {step.key === 'locations' ? (
                <LocationsStep
                  locations={locations}
                  selectedIds={locationIds}
                  error={submitted ? fields.locations : undefined}
                  onToggle={(id, checked) => {
                    setLocationIds((current) =>
                      checked ? [...current, id] : current.filter((item) => item !== id)
                    )
                    markDirty()
                  }}
                  onAdd={() => setLocationOpen(true)}
                />
              ) : null}

              {step.key === 'cancellation' ? (
                <CancellationStep
                  value={policy}
                  locked={locked}
                  onChange={(value) => {
                    setPolicy(value)
                    markDirty()
                  }}
                />
              ) : null}

              {step.key === 'value' ? (
                <ItemValueStep
                  value={itemValue}
                  error={submitted ? fields.itemValue : undefined}
                  warning={valueWarning}
                  coverage={coverageCopy(
                    formValues.itemValueRsd == null ? null : rsdToMinor(formValues.itemValueRsd),
                    selectedCategory?.guarantee_cap_minor ?? null
                  )}
                  locked={locked}
                  onChange={(value) => {
                    setItemValue(value)
                    markDirty()
                  }}
                />
              ) : null}
            </section>
          ))}

          {submitted && stepErrors.length > 0 ? (
            <div className="hidden lg:block">
              <ErrorSummary steps={STEPS} errors={stepErrors} onJump={scrollToStep} />
            </div>
          ) : null}

          <div className="hidden pt-2 lg:block">
            <Button
              type="button"
              data-testid="publish-button"
              onClick={() => void handlePublish()}
              disabled={submitting}
              className="min-w-[220px] bg-brand-500 hover:bg-brand-600"
            >
              {submitting ? <Loader2Icon className="size-5 animate-spin" aria-hidden /> : null}
              {ctaLabel}
            </Button>
          </div>

          {isPublished ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {listing.status === 'paused' ? (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="resume-button"
                  onClick={() =>
                    resume.mutate(undefined, {
                      onSuccess: () => toast.success('Oglas je ponovo aktivan.'),
                      onError: (error) =>
                        toast.error(error instanceof Error ? error.message : 'Nismo mogli da vratimo oglas.'),
                    })
                  }
                  loading={resume.isPending}
                >
                  Vrati oglas
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="pause-button"
                  onClick={() =>
                    pause.mutate(undefined, {
                      onSuccess: () => toast.success('Oglas je pauziran.'),
                      onError: (error) =>
                        toast.error(error instanceof Error ? error.message : 'Nismo mogli da pauziramo oglas.'),
                    })
                  }
                  loading={pause.isPending}
                >
                  Pauziraj oglas
                </Button>
              )}
              <Button type="button" variant="danger" data-testid="delete-button" onClick={() => setDeleteOpen(true)}>
                Obriši oglas
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <PublishSidebar />

      <div className={cn('lg:hidden', submitted && stepErrors.length > 0 ? 'h-40' : 'h-24')} />
      <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-border bg-card p-3 lg:hidden">
        {submitted && stepErrors.length > 0 ? (
          <ErrorSummary steps={STEPS} errors={stepErrors} onJump={scrollToStep} compact />
        ) : null}
        <Button
          type="button"
          fullWidth
          data-testid="publish-button"
          onClick={() => void handlePublish()}
          disabled={submitting}
          className="bg-brand-500 hover:bg-brand-600"
        >
          {submitting ? <Loader2Icon className="size-5 animate-spin" aria-hidden /> : null}
          {ctaLabel}
        </Button>
      </div>

      <AddLocationModal
        open={locationOpen}
        onOpenChange={setLocationOpen}
        onCreated={(location) => {
          setLocationIds((current) => (current.includes(location.id) ? current : [...current, location.id]))
          markDirty()
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obrisati oglas?</DialogTitle>
            <DialogDescription>
              Ovo se ne može poništiti. Recenzije i istorija rezervacija ostaju sačuvani.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Otkaži
            </Button>
            <Button
              type="button"
              variant="danger"
              data-testid="delete-confirm-button"
              loading={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync()
                  toast.success('Oglas je obrisan.')
                  router.push('/')
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Oglas se ne može obrisati.')
                }
              }}
            >
              Obriši oglas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
