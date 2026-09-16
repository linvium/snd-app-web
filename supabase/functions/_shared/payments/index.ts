import type { PaymentProvider } from './types.ts'
import { stripeProvider } from './stripe.ts'

export type {
  CheckoutMode,
  CheckoutRequest,
  CheckoutSession,
  PaymentEvent,
  PaymentProvider,
} from './types.ts'
export { stripeProvider } from './stripe.ts'

const PROVIDERS: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
}

/** Set PAYMENT_PROVIDER to move the platform to another adapter. */
export function defaultProviderName(): string {
  return Deno.env.get('PAYMENT_PROVIDER') ?? 'stripe'
}

/**
 * The adapter for a name, or an error naming the one that was asked for.
 *
 * An order and a subscription store the provider they were created with, so a
 * plan bought under one PSP keeps renewing and cancelling through that PSP even
 * after the default moves on.
 */
export function resolveProvider(name?: string | null): PaymentProvider {
  const key = (name && name.trim()) || defaultProviderName()
  const provider = PROVIDERS[key]
  if (!provider) throw new Error(`Unknown payment provider: ${key}`)
  return provider
}
