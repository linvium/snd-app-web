import { MessagesInbox } from '@/components/messages/MessagesInbox'

export default function ProfileRequestsPage() {
  return (
    <div>
      <h1 className="mt-0 mb-6 hidden text-[22px] font-normal text-foreground lg:block">Zahtevi</h1>
      <MessagesInbox />
    </div>
  )
}
