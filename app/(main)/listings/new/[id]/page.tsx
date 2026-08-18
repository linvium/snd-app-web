import { redirect } from 'next/navigation'

export default async function LegacyEditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/profile/listings/${id}/edit`)
}
