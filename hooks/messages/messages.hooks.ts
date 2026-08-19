'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { conversationKeys, conversationsForListing, messagesService, unreadMessageTotal } from '@/lib/messages'
import type { ConversationThread } from '@/types/message'

export function useConversations(enabled = true) {
  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: ({ signal }) => messagesService.listConversations(signal),
    enabled,
    staleTime: 10 * 1000,
  })
}

export function useConversation(id: string | null, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  return useQuery({
    queryKey: conversationKeys.thread(id ?? ''),
    queryFn: ({ signal }) => messagesService.getConversation(id!, signal),
    enabled: Boolean(id) && enabled,
    refetchInterval: 5 * 1000,
  })
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => messagesService.sendMessage(conversationId, body),
    onSuccess: (message) => {
      queryClient.setQueryData<ConversationThread>(conversationKeys.thread(conversationId), (previous) => {
        if (!previous) return previous
        return { ...previous, messages: [...previous.messages, message] }
      })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => messagesService.markRead(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.thread(id) })
    },
  })
}

export function useUnreadMessageCount(enabled = true) {
  const conversations = useConversations(enabled)
  return unreadMessageTotal((conversations.data ?? []).map((row) => row.unread_count))
}

export function useListingConversations(listingId: string, enabled = true) {
  const conversations = useConversations(enabled)
  return {
    ...conversations,
    data: conversationsForListing(conversations.data ?? [], listingId),
  }
}
