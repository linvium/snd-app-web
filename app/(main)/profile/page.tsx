import { redirect } from 'next/navigation'

import { DashboardView } from '@/components/dashboard/DashboardView'
import { loadDashboard } from '@/lib/dashboard/dashboard.server'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Pregled',
}

export default async function ManagerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/profile')
  }

  let summary
  try {
    summary = await loadDashboard(supabase, user.id)
  } catch (error) {
    console.error('[dashboard] load failed', error)
    return (
      <p className="text-sm text-destructive">Nismo mogli da učitamo pregled. Pokušaj ponovo.</p>
    )
  }

  if (!summary) {
    return <p className="text-sm text-muted-foreground">Nije moguće učitati profil.</p>
  }

  return <DashboardView data={summary} />
}
