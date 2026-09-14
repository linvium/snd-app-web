import { apiOk } from '@/lib/api/response'
import { loadBillingCatalog } from '@/lib/billing/billing.server'
import { createPublicClient } from '@/lib/supabase/public'

export const revalidate = 300

/** The public price list: active subscription plans and credit packs. */
export async function GET() {
  const catalog = await loadBillingCatalog(createPublicClient())
  return apiOk(catalog)
}
