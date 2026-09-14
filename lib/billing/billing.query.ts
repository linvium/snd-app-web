export const billingKeys = {
  all: ['billing'] as const,
  catalog: () => [...billingKeys.all, 'catalog'] as const,
  summary: () => [...billingKeys.all, 'summary'] as const,
  order: (token: string) => [...billingKeys.all, 'order', token] as const,
}
