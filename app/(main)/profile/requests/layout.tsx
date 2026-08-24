import type { ReactNode } from 'react'

import { RequestsWorkspace } from '@/components/messages/RequestsWorkspace'

export default function RequestsLayout({ children }: { children: ReactNode }) {
  return <RequestsWorkspace>{children}</RequestsWorkspace>
}
