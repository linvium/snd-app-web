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

/** A category with its children attached, as the filter dropdown and /categories render it. */
export interface SndCategoryNode extends SndCategory {
  children: SndCategoryNode[]
}
