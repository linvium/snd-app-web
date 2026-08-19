import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  ITEM_VALUE_MAX_RSD,
  ITEM_VALUE_MIN_RSD,
  MIN_LISTING_IMAGES,
  PRICE_1_DAY_MAX_RSD,
  PRICE_1_DAY_MIN_RSD,
  RSD_TO_PARA,
  TITLE_MAX,
  TITLE_MIN,
  type CancellationPolicy,
  type StepKey,
} from '@/types/listing'

export interface ListingFormValues {
  title: string
  description: string
  categoryId: string | null
  categoryIsLeaf: boolean
  categoryEnabled: boolean
  imageCount: number
  price1DayRsd: number | null
  price3DaysRsd: number | null
  price7DaysRsd: number | null
  locationIds: string[]
  cancellationPolicy: CancellationPolicy
  itemValueRsd: number | null
}

export interface FieldErrors {
  title?: string
  description?: string
  category?: string
  images?: string
  price1?: string
  price3?: string
  price7?: string
  locations?: string
  itemValue?: string
}

export interface StepError {
  step: StepKey
  message: string
}

const STEP_MESSAGES: Record<StepKey, string> = {
  describe: 'Unesi naziv i opis predmeta',
  photos: 'Dodaj bar jednu sliku',
  category: 'Izaberi kategoriju',
  price: 'Unesi cenu za 1 dan',
  locations: 'Izaberi mesto predaje',
  cancellation: 'Izaberi uslove otkazivanja',
  value: 'Proveri vrednost predmeta',
}

export function rsdToMinor(rsd: number): number {
  return Math.round(rsd) * RSD_TO_PARA
}

export function minorToRsd(minor: number): number {
  return minor / RSD_TO_PARA
}

export function formatRsdAmount(rsd: number): string {
  return `${Math.round(rsd).toLocaleString('sr-RS')} RSD`
}

export function isAllCapsTitle(title: string): boolean {
  const letters = title.replace(/[^A-Za-zŠĐČĆŽšđčćž]/g, '')
  if (letters.length < 8) return false
  const upper = letters.replace(/[^A-ZŠĐČĆŽ]/g, '')
  return upper.length / letters.length >= 0.8
}

export function packageMaxRsd(dailyRsd: number, days: 3 | 7): number {
  return dailyRsd * days
}

export function validateTitle(title: string): string | undefined {
  const trimmed = title.trim()
  if (!trimmed) return 'Unesi naziv predmeta.'
  if (trimmed.length < TITLE_MIN || trimmed.length > TITLE_MAX) {
    return `Naslov mora imati između ${TITLE_MIN} i ${TITLE_MAX} karaktera.`
  }
  return undefined
}

export function validateDescription(description: string): string | undefined {
  const trimmed = description.trim()
  if (!trimmed) return 'Opiši predmet u nekoliko rečenica.'
  if (trimmed.length < DESCRIPTION_MIN) {
    return `Opis mora imati najmanje ${DESCRIPTION_MIN} karaktera.`
  }
  if (trimmed.length > DESCRIPTION_MAX) {
    return `Opis može imati najviše ${DESCRIPTION_MAX} karaktera.`
  }
  return undefined
}

export function validatePrices(values: {
  price1DayRsd: number | null
  price3DaysRsd: number | null
  price7DaysRsd: number | null
}): Pick<FieldErrors, 'price1' | 'price3' | 'price7'> {
  const errors: Pick<FieldErrors, 'price1' | 'price3' | 'price7'> = {}
  const { price1DayRsd, price3DaysRsd, price7DaysRsd } = values

  if (price1DayRsd == null || !Number.isFinite(price1DayRsd)) {
    errors.price1 = 'Unesi cenu za 1 dan.'
    return errors
  }

  if (price1DayRsd < PRICE_1_DAY_MIN_RSD || price1DayRsd > PRICE_1_DAY_MAX_RSD) {
    errors.price1 = `Cena za 1 dan mora biti između ${PRICE_1_DAY_MIN_RSD} i ${PRICE_1_DAY_MAX_RSD.toLocaleString('sr-RS')} RSD.`
  }

  if (price3DaysRsd != null) {
    const max3 = packageMaxRsd(price1DayRsd, 3)
    if (price3DaysRsd >= max3) {
      errors.price3 = `Cena za 3 dana mora biti povoljnija od tri pojedinačna dana (manje od ${formatRsdAmount(max3)}).`
    }
  }

  if (price7DaysRsd != null) {
    const max7 = packageMaxRsd(price1DayRsd, 7)
    if (price7DaysRsd >= max7) {
      errors.price7 = 'Cena za 7 dana mora biti povoljnija od sedam pojedinačnih dana.'
    } else if (price3DaysRsd != null && price7DaysRsd >= price3DaysRsd * 3) {
      errors.price7 = 'Cena za 7 dana mora biti povoljnija od tri paketa po 3 dana.'
    }
  }

  return errors
}

export function validateItemValue(itemValueRsd: number | null): string | undefined {
  if (itemValueRsd == null || !Number.isFinite(itemValueRsd)) {
    return undefined
  }
  if (itemValueRsd < ITEM_VALUE_MIN_RSD || itemValueRsd > ITEM_VALUE_MAX_RSD) {
    return `Vrednost mora biti između ${ITEM_VALUE_MIN_RSD.toLocaleString('sr-RS')} i ${ITEM_VALUE_MAX_RSD.toLocaleString('sr-RS')} RSD.`
  }
  return undefined
}

export function itemValueWarning(
  itemValueRsd: number | null,
  dailyRsd: number | null,
  suggestedPrice1DayMinor: number | null | undefined
): string | undefined {
  if (itemValueRsd != null && dailyRsd != null && itemValueRsd < dailyRsd * 10) {
    return 'Vrednost izgleda niska u odnosu na dnevnu cenu. Proveri da nisi pogrešio.'
  }

  // Hidden until we have real comparable-item data.
  // if (
  //   itemValueRsd != null &&
  //   suggestedPrice1DayMinor &&
  //   itemValueRsd > 20 * minorToRsd(suggestedPrice1DayMinor)
  // ) {
  //   return 'Vrednost je znatno viša od sličnih predmeta. Proveri iznos.'
  // }
  void suggestedPrice1DayMinor

  return undefined
}

export function savingsForPackage(dailyRsd: number, packageRsd: number, days: 3 | 7): {
  perDayRsd: number
  percent: number
} | null {
  if (packageRsd <= 0 || dailyRsd <= 0) return null
  const full = dailyRsd * days
  if (packageRsd >= full) return null
  return {
    perDayRsd: Math.round(packageRsd / days),
    percent: Math.floor(((full - packageRsd) / full) * 100),
  }
}

export function validateListingForm(values: ListingFormValues): {
  fields: FieldErrors
  steps: StepError[]
} {
  const fields: FieldErrors = {}

  const titleError = validateTitle(values.title)
  const descriptionError = validateDescription(values.description)
  if (titleError) fields.title = titleError
  if (descriptionError) fields.description = descriptionError

  if (values.imageCount < MIN_LISTING_IMAGES) {
    fields.images = 'Dodaj bar jednu sliku.'
  }

  if (!values.categoryId) {
    fields.category = 'Izaberi kategoriju.'
  } else if (!values.categoryIsLeaf) {
    fields.category = 'Izaberi tačniju kategoriju.'
  } else if (!values.categoryEnabled) {
    fields.category = 'Ova kategorija trenutno nije dostupna.'
  }

  Object.assign(fields, validatePrices(values))

  if (values.locationIds.length < 1) {
    fields.locations = 'Izaberi mesto predaje.'
  }

  const valueError = validateItemValue(values.itemValueRsd)
  if (valueError) fields.itemValue = valueError

  const steps: StepError[] = []
  if (fields.title || fields.description) steps.push({ step: 'describe', message: STEP_MESSAGES.describe })
  if (fields.images) steps.push({ step: 'photos', message: fields.images })
  if (fields.category) steps.push({ step: 'category', message: fields.category })
  if (fields.price1 || fields.price3 || fields.price7) {
    steps.push({ step: 'price', message: fields.price1 ?? fields.price3 ?? fields.price7 ?? STEP_MESSAGES.price })
  }
  if (fields.locations) steps.push({ step: 'locations', message: fields.locations })
  if (fields.itemValue) steps.push({ step: 'value', message: fields.itemValue })

  return { fields, steps }
}

export function publishFieldErrors(values: ListingFormValues): Record<string, string> {
  const { fields } = validateListingForm(values)
  const mapped: Record<string, string> = {}
  if (fields.title) mapped.title = fields.title
  if (fields.description) mapped.description = fields.description
  if (fields.images) mapped.images = fields.images
  if (fields.category) mapped.category_id = fields.category
  if (fields.price1) mapped.price_1_day_minor = fields.price1
  if (fields.price3) mapped.price_3_days_minor = fields.price3
  if (fields.price7) mapped.price_7_days_minor = fields.price7
  if (fields.locations) mapped.locations = fields.locations
  if (fields.itemValue) mapped.item_value_minor = fields.itemValue
  return mapped
}
