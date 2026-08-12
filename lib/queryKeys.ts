export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
  },

  user: {
    all: ['user'] as const,
    current: () => [...queryKeys.user.all, 'current'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    public: (userId: string) => [...queryKeys.user.all, 'public', userId] as const,
    locations: () => [...queryKeys.user.all, 'locations'] as const,
  },
}
