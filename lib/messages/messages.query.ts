export const conversationKeys = {
  all: ['conversations'] as const,
  list: () => [...conversationKeys.all, 'list'] as const,
  thread: (id: string) => [...conversationKeys.all, 'thread', id] as const,
}
