'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  conversationKeys,
  conversationsForListing,
  messagesService,
  unreadMessageTotal,
  withDeletedMessage,
  withEditedBody,
} from '@/lib/messages'
import type { ConversationThread, Message } from '@/types/message'

function replaceThreadMessage(previous: ConversationThread | undefined, message: Message) {
  if (!previous) return previous
  return {
    ...previous,
    messages: previous.messages.map((row) => (row.id === message.id ? message : row)),
  }
}

export function useConversations(enabled = true) {
  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: ({ signal }) => messagesService.listConversations(signal),
    enabled,
    staleTime: 5 * 1000,
    refetchInterval: 5 * 1000,
    refetchOnWindowFocus: true,
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

export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const threadKey = conversationKeys.thread(conversationId)
  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      messagesService.editMessage(conversationId, messageId, body),
    onMutate: async ({ messageId, body }) => {
      const previous = queryClient.getQueryData<ConversationThread>(threadKey)
      const current = previous?.messages.find((row) => row.id === messageId)
      const optimistic = current ? withEditedBody(current, body) : null
      if (previous && optimistic) {
        queryClient.setQueryData<ConversationThread>(threadKey, replaceThreadMessage(previous, optimistic))
      }
      await queryClient.cancelQueries({ queryKey: threadKey })
      if (optimistic) {
        queryClient.setQueryData<ConversationThread>(threadKey, (latest) =>
          replaceThreadMessage(latest, optimistic)
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(threadKey, context.previous)
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ConversationThread>(threadKey, (previous) =>
        replaceThreadMessage(previous, message)
      )
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
  })
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const threadKey = conversationKeys.thread(conversationId)
  return useMutation({
    mutationFn: (messageId: string) => messagesService.deleteMessage(conversationId, messageId),
    onMutate: async (messageId) => {
      const previous = queryClient.getQueryData<ConversationThread>(threadKey)
      const current = previous?.messages.find((row) => row.id === messageId)
      const optimistic = current ? withDeletedMessage(current) : null
      if (previous && optimistic) {
        queryClient.setQueryData<ConversationThread>(threadKey, replaceThreadMessage(previous, optimistic))
      }
      await queryClient.cancelQueries({ queryKey: threadKey })
      if (optimistic) {
        queryClient.setQueryData<ConversationThread>(threadKey, (latest) =>
          replaceThreadMessage(latest, optimistic)
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(threadKey, context.previous)
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ConversationThread>(threadKey, (previous) =>
        replaceThreadMessage(previous, message)
      )
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
