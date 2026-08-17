export const kycQueryKeys = {
  all: ['kyc'] as const,
  current: () => [...kycQueryKeys.all, 'current'] as const,
}
