import { MessageSquareIcon } from 'lucide-react'

export const metadata = {
  title: 'Zahtevi',
}

/**
 * The list itself lives in the layout, so this route only fills the thread
 * pane — which on a phone is not on screen at all.
 */
export default function ProfileRequestsPage() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center lg:flex">
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"
      >
        <MessageSquareIcon className="size-5" strokeWidth={1.8} />
      </span>
      <p className="m-0 text-[15px] font-semibold text-foreground">Izaberi razgovor</p>
      <p className="m-0 max-w-[320px] text-sm text-muted-foreground">
        Zahtevi i poruke su ista stvar — otvori razgovor sa leve strane da vidiš detalje
        rezervacije.
      </p>
    </div>
  )
}
