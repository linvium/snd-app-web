import { MessageThread } from '@/components/messages/MessageThread'

export default async function ProfileRequestThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <MessageThread conversationId={id} />
}
