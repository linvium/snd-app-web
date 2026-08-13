export const userQueryKeys = {
  all: ['user'] as const,
  current: () => [...userQueryKeys.all, 'current'] as const,
  profile: (userId: string) => [...userQueryKeys.all, 'profile', userId] as const,
  public: (userId: string) => [...userQueryKeys.all, 'public', userId] as const,
  locations: () => [...userQueryKeys.all, 'locations'] as const,
}
