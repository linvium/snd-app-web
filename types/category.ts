export interface SndCategory {
  id: string
  parent_id: string | null
  name: string
  slug: string
  full_path: string
  level: number
  icon_name: string | null
  sort_order: number
  listing_count: number
}

export interface SndCategoryCatalog extends SndCategory {
  is_enabled: boolean
  guarantee_cap_minor: number | null
  suggested_price_1_day_minor: number | null
  suggested_price_3_days_minor: number | null
  suggested_price_7_days_minor: number | null
}

/** A category with its children attached, as the filter dropdown and /categories render it. */
export interface SndCategoryNode extends SndCategory {
  children: SndCategoryNode[]
}

export interface SndCategoryCatalogNode extends SndCategoryCatalog {
  children: SndCategoryCatalogNode[]
}
