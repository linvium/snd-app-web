import { redirect } from 'next/navigation'

import { requestThreadPath } from '@/lib/messages'

export default async function MessageThreadRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(requestThreadPath(id))
}
