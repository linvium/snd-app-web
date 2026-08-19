import { ApiError } from '@/lib/search/search.service'
import type { ApiErrorBody } from '@/types/search'
import type { ConversationSummary, ConversationThread, Message } from '@/types/message'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nešto je krenulo naopako.' }
    )
  }
  return (await response.json()) as T
}

export const messagesService = {
  listConversations: async (signal?: AbortSignal): Promise<ConversationSummary[]> => {
    const response = await fetch('/api/v1/conversations', {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: ConversationSummary[] }>(response)
    return payload.data
  },

  getConversation: async (id: string, signal?: AbortSignal): Promise<ConversationThread> => {
    const response = await fetch(`/api/v1/conversations/${id}`, {
      signal,
      headers: { Accept: 'application/json' },
    })
    const payload = await parseJson<{ data: ConversationThread }>(response)
    return payload.data
  },

  sendMessage: async (id: string, body: string): Promise<Message> => {
    const response = await fetch(`/api/v1/conversations/${id}/messages`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    const payload = await parseJson<{ data: Message }>(response)
    return payload.data
  },

  markRead: async (id: string): Promise<void> => {
    const response = await fetch(`/api/v1/conversations/${id}/read`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    await parseJson(response)
  },
}
