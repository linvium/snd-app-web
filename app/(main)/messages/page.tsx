import { redirect } from 'next/navigation'

import { REQUESTS_PATH } from '@/lib/messages'

export default function MessagesRedirectPage() {
  redirect(REQUESTS_PATH)
}
