'use client'

import { Button } from '@/components/ui/button'
import type { ListingDraftSummary } from '@/types/listing'

function relativeUpdatedAt(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.round(delta / 60000))
  if (minutes < 1) return 'malopre'
  if (minutes < 60) return `pre ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `pre ${hours} ${hours === 1 ? 'sat' : hours < 5 ? 'sata' : 'sati'}`
  const days = Math.round(hours / 24)
  if (days === 1) return 'juče'
  return `pre ${days} dana`
}

export function DraftResumeBanner({
  draft,
  onContinue,
  onStartNew,
  starting,
}: {
  draft: ListingDraftSummary
  onContinue: () => void
  onStartNew: () => void
  starting: boolean
}) {
  const title = draft.title?.trim() || 'Bez naslova'

  return (
    <section className="rounded-xl border border-border bg-card p-5" data-testid="draft-resume-banner">
      <p className="m-0 text-base font-semibold text-card-foreground">
        Imaš započet oglas: {title} ({relativeUpdatedAt(draft.updated_at)})
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={onContinue}>
          Nastavi
        </Button>
        <Button type="button" variant="outline" onClick={onStartNew} loading={starting}>
          Počni novi
        </Button>
      </div>
    </section>
  )
}
