'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
  useCreateDraft,
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
  itemValueWarning,
  minorToRsd,
  PROFILE_LISTINGS_PATH,
  rsdToMinor,
  shareInflightPromise,
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

function mapApiFields(fields: Record<string, string>): FieldErrors {
  const mapped: FieldErrors = {}
  if (fields.title) mapped.title = fields.title
  if (fields.description) mapped.description = fields.description
  if (fields.images) mapped.images = fields.images
  if (fields.category_id) mapped.category = fields.category_id
  if (fields.price_1_day_minor) mapped.price1 = fields.price_1_day_minor
  if (fields.locations) mapped.locations = fields.locations
  if (fields.item_value_minor) mapped.itemValue = fields.item_value_minor
  return mapped
}

export function PublishListingForm({ listingId: initialListingId }: { listingId?: string }) {
  const router = useRouter()
  const isCreate = !initialListingId
  const [draftId, setDraftId] = useState<string | null>(initialListingId ?? null)
  const listingIdRef = useRef<string | null>(initialListingId ?? null)
  const createDraftOnceRef = useRef<(() => Promise<string>) | null>(null)

  const listingQuery = useListing(draftId)
  const listing = listingQuery.data
  const createDraft = useCreateDraft()
  const save = useSaveListing()
  const publish = usePublishListing()
  const pause = usePauseListing()
  const resume = useResumeListing()
  const remove = useDeleteListing()
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
  const [hydrated, setHydrated] = useState(isCreate)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [submitted, setSubmitted] = useState(false)
  const [fields, setFields] = useState<FieldErrors>({})
  const [stepErrors, setStepErrors] = useState<StepError[]>([])
  const [activeStep, setActiveStep] = useState<StepKey>('describe')
  const [locationOpen, setLocationOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitKind, setSubmitKind] = useState<'draft' | 'publish' | 'save' | null>(null)
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
    listingIdRef.current = initialListingId ?? null
    createDraftOnceRef.current = null
    setDraftId(initialListingId ?? null)
    setHydrated(!initialListingId)
  }, [initialListingId])

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
  const status = listing?.status
  const isDraft = isCreate || status === 'draft'
  const isPublished = status === 'published' || status === 'paused'
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
    [
      title,
      description,
      categoryId,
      categories,
      selectedCategory,
      listing?.images.length,
      price1,
      price3,
      price7,
      locationIds,
      policy,
      itemValue,
    ]
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

  const ensureDraft = useCallback(async () => {
    if (listingIdRef.current) return listingIdRef.current
    createDraftOnceRef.current ??= shareInflightPromise(async () => {
      const created = await createDraft.mutateAsync()
      listingIdRef.current = created.id
      setDraftId(created.id)
      return created.id
    })
    return createDraftOnceRef.current()
  }, [createDraft])

  useEffect(() => {
    if (!hydrated || !dirty || !isDraft || submitting) return
    setSaveStatus('saving')
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const id = await ensureDraft()
          await save.mutateAsync({ id, input: payload() })
          setSaveStatus('saved')
        } catch {
          setSaveStatus('error')
          toast.error('Nismo mogli da sačuvamo izmene. Pokušaj ponovo.')
        }
      })()
    }, 2000)
    return () => window.clearTimeout(timer)
    // payload is derived from the same fields that flip `dirty`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, categoryId, price1, price3, price7, locationIds, policy, itemValue, hydrated, isDraft, dirty, submitting])

  const markDirty = () => setDirty(true)

  const stepState = (key: StepKey): StepBadgeState => {
    const hasError = stepErrors.some((item) => item.step === key)
    if (hasError) return 'error'
    const complete = {
      describe: title.trim().length >= 3 && description.trim().length >= 20,
      photos: (listing?.images.length ?? 0) >= 1,
      category: Boolean(categoryId) && isLeafCategory(categories, categoryId),
      price:
        formValues.price1DayRsd != null &&
        !livePriceErrors.price1 &&
        !livePriceErrors.price3 &&
        !livePriceErrors.price7,
      locations: locationIds.length >= 1,
      cancellation: true,
      value:
        formValues.itemValueRsd == null ||
        (formValues.itemValueRsd >= 1000 && !fields.itemValue),
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

  const blockIfInvalid = () => {
    setSubmitted(true)
    const { steps } = runValidation()
    if (steps.length === 0) return false
    scrollToStep(steps[0].step)
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return true
  }

  const handleApiError = (error: unknown) => {
    if (error instanceof ApiError && error.fields) {
      setFields(mapApiFields(error.fields))
      toast.error(error.message)
      return
    }
    toast.error('Nismo mogli da sačuvamo izmene. Pokušaj ponovo.')
  }

  const handleSaveDraft = async () => {
    if (blockIfInvalid()) return

    setSubmitKind('draft')
    setSubmitting(true)
    try {
      const id = await ensureDraft()
      await save.mutateAsync({ id, input: payload() })
      router.push(`${PROFILE_LISTINGS_PATH}?draft=1&highlight=${id}`)
    } catch (error) {
      handleApiError(error)
      setSubmitting(false)
      setSubmitKind(null)
    }
  }

  const handleSavePublished = async () => {
    if (!draftId) return
    if (blockIfInvalid()) return

    setSubmitKind('save')
    setSubmitting(true)
    try {
      await save.mutateAsync({ id: draftId, input: payload() })
      router.push(`${PROFILE_LISTINGS_PATH}?saved=1&highlight=${draftId}`)
    } catch (error) {
      handleApiError(error)
      setSubmitting(false)
      setSubmitKind(null)
    }
  }

  const handlePublishConfirm = async () => {
    if (blockIfInvalid()) {
      setPublishOpen(false)
      return
    }

    setSubmitKind('publish')
    setSubmitting(true)
    setPublishOpen(false)
    try {
      const id = await ensureDraft()
      await save.mutateAsync({ id, input: payload() })
      const published = await publish.mutateAsync(id)
      router.push(`${PROFILE_LISTINGS_PATH}?published=1&highlight=${published.id}`)
    } catch (error) {
      handleApiError(error)
      setSubmitting(false)
      setSubmitKind(null)
    }
  }

  const itemValueRsd = parseRsd(itemValue)
  const dailyRsd = parseRsd(price1)
  const valueWarning = itemValueWarning(
    itemValueRsd,
    dailyRsd,
    selectedCategory?.suggested_price_1_day_minor
  )

  if (initialListingId && listingQuery.isError) {
    return <p className="p-6 text-sm text-destructive">Oglas nije pronađen.</p>
  }

  const draftCtaLabel = submitting && submitKind === 'draft' ? 'Čuvam…' : isCreate ? 'Kreiraj kao nacrt' : 'Sačuvaj nacrt'
  const publishCtaLabel =
    submitting && submitKind === 'publish'
      ? 'Objavljujem…'
      : isCreate
        ? 'Kreiraj i objavi'
        : 'Objavi oglas'
  const saveCtaLabel = submitting && submitKind === 'save' ? 'Čuvam…' : 'Sačuvaj izmene'

  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,68%)_minmax(0,32%)] lg:py-10">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="m-0 text-2xl font-semibold text-card-foreground">
            {isPublished ? 'Izmeni oglas' : 'Objavi predmet'}
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
                <PhotosStep
                  listingId={draftId}
                  images={listing?.images ?? []}
                  error={submitted ? fields.images : undefined}
                  ensureListingId={ensureDraft}
                />
              ) : null}

              {step.key === 'category' ? (
                <CategoryStep
                  title={title}
                  categories={categories}
                  categoryId={categoryId}
                  error={submitted ? fields.category : undefined}
                  locked={locked}
                  loading={categoriesQuery.isLoading}
                  onSelect={(id) => {
                    if (locked) return
                    setCategoryId(id)
                    markDirty()
                  }}
                />
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
                  loading={locationsQuery.isLoading}
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

          <div className="hidden flex-wrap gap-3 pt-2 lg:flex">
            {isDraft ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  data-testid="save-draft-button"
                  onClick={() => void handleSaveDraft()}
                  disabled={submitting}
                >
                  {submitting && submitKind === 'draft' ? (
                    <Loader2Icon className="size-5 animate-spin" aria-hidden />
                  ) : null}
                  {draftCtaLabel}
                </Button>
                <Button
                  type="button"
                  data-testid="publish-button"
                  onClick={() => setPublishOpen(true)}
                  disabled={submitting}
                  className="min-w-[220px] bg-brand-500 hover:bg-brand-600"
                >
                  {submitting && submitKind === 'publish' ? (
                    <Loader2Icon className="size-5 animate-spin" aria-hidden />
                  ) : null}
                  {publishCtaLabel}
                </Button>
              </>
            ) : isPublished ? (
              <Button
                type="button"
                data-testid="publish-button"
                onClick={() => void handleSavePublished()}
                disabled={submitting}
                className="min-w-[220px] bg-brand-500 hover:bg-brand-600"
              >
                {submitting && submitKind === 'save' ? (
                  <Loader2Icon className="size-5 animate-spin" aria-hidden />
                ) : null}
                {saveCtaLabel}
              </Button>
            ) : null}
          </div>

          {isPublished && !submitting ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {listing?.status === 'paused' ? (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="resume-button"
                  onClick={() => {
                    if (!draftId) return
                    resume.mutate(draftId, {
                      onSuccess: () => toast.success('Oglas je ponovo aktivan.'),
                      onError: (error) =>
                        toast.error(error instanceof Error ? error.message : 'Nismo mogli da vratimo oglas.'),
                    })
                  }}
                  loading={resume.isPending}
                >
                  Vrati oglas
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="pause-button"
                  onClick={() => {
                    if (!draftId) return
                    pause.mutate(draftId, {
                      onSuccess: () => toast.success('Oglas je arhiviran.'),
                      onError: (error) =>
                        toast.error(error instanceof Error ? error.message : 'Nismo mogli da arhiviramo oglas.'),
                    })
                  }}
                  loading={pause.isPending}
                >
                  Arhiviraj oglas
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
        {isDraft ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              fullWidth
              data-testid="publish-button"
              onClick={() => setPublishOpen(true)}
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {submitting && submitKind === 'publish' ? (
                <Loader2Icon className="size-5 animate-spin" aria-hidden />
              ) : null}
              {publishCtaLabel}
            </Button>
            <Button
              type="button"
              fullWidth
              variant="outline"
              data-testid="save-draft-button"
              onClick={() => void handleSaveDraft()}
              disabled={submitting}
            >
              {draftCtaLabel}
            </Button>
          </div>
        ) : isPublished ? (
          <Button
            type="button"
            fullWidth
            data-testid="publish-button"
            onClick={() => void handleSavePublished()}
            disabled={submitting}
            className="bg-brand-500 hover:bg-brand-600"
          >
            {submitting && submitKind === 'save' ? (
              <Loader2Icon className="size-5 animate-spin" aria-hidden />
            ) : null}
            {saveCtaLabel}
          </Button>
        ) : null}
      </div>

      <AddLocationModal
        open={locationOpen}
        onOpenChange={setLocationOpen}
        onCreated={(location) => {
          setLocationIds((current) => (current.includes(location.id) ? current : [...current, location.id]))
          markDirty()
        }}
      />

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Objaviti oglas?</DialogTitle>
            <DialogDescription>
              Oglas će biti vidljiv u pretrazi. Možeš ga kasnije arhivirati ili izmeniti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPublishOpen(false)}>
              Otkaži
            </Button>
            <Button
              type="button"
              data-testid="publish-confirm-button"
              onClick={() => void handlePublishConfirm()}
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600"
            >
              Objavi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                if (!draftId) return
                try {
                  await remove.mutateAsync(draftId)
                  toast.success('Oglas je obrisan.')
                  router.push(PROFILE_LISTINGS_PATH)
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
