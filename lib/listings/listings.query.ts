export const listingKeys = {
  all: ['listings'] as const,
  drafts: () => [...listingKeys.all, 'drafts'] as const,
  detail: (id: string) => [...listingKeys.all, 'detail', id] as const,
  priceSuggestions: (categoryId: string) =>
    [...listingKeys.all, 'price-suggestions', categoryId] as const,
}

export const geoKeys = {
  all: ['geo'] as const,
  geocode: (query: string) => [...geoKeys.all, 'geocode', query.trim().toLowerCase()] as const,
}
