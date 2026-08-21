export const pageKeys = {
  all: ['pages'] as const,
  detail: (slug: string) => [...pageKeys.all, 'detail', slug] as const,
  category: (category: string) => [...pageKeys.all, 'category', category] as const,
}
