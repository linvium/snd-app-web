import { PublishListingPage } from '@/components/listings/publish/PublishListingPage'

export const metadata = {
  title: 'Izmeni oglas',
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PublishListingPage listingId={id} />
}
