'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser } from '@/hooks/user'
import { getProfileInitials } from '@/lib/profiles'

export function AccountMenuAvatar() {
  const { data: user } = useCurrentUser()
  const profile = user?.user_profiles
  const initials = getProfileInitials(profile?.first_name, profile?.last_name, user?.email ?? '')

  return (
    <Avatar className="size-9 after:border-transparent" data-testid="header-account-avatar">
      {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
      <AvatarFallback className="bg-brand-500 text-sm font-semibold text-white">
        {initials || '?'}
      </AvatarFallback>
    </Avatar>
  )
}
