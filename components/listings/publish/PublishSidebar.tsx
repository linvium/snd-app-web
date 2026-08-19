import { CameraIcon, MapPinIcon } from 'lucide-react'

export function PhotoTipCard() {
  return (
    <aside className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <CameraIcon className="size-5" aria-hidden />
      </div>
      <h2 className="m-0 text-base font-semibold text-card-foreground">Bolje fotografije, više rezervacija</h2>
      <ul className="mt-3 mb-0 list-disc space-y-1.5 pl-5 text-[13px] leading-5 text-muted-foreground">
        <li>Snimaj uz dnevno svetlo, bez bljeska.</li>
        <li>Pokaži predmet iz više uglova, uključujući sitne nedostatke.</li>
        <li>Prva slika je naslovna - nju ljudi vide u pretrazi.</li>
      </ul>
    </aside>
  )
}

export function LocationsTipCard() {
  return (
    <aside className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <MapPinIcon className="size-5" aria-hidden />
      </div>
      <h2 className="m-0 text-base font-semibold text-card-foreground">
        Može li se predmet predati na više mesta?
      </h2>
      <p className="mt-2 mb-0 text-[13px] leading-5 text-muted-foreground">
        Dodaj kuću, posao ili treću lokaciju. Više mesta predaje znači više ljudi koji mogu da iznajme.
      </p>
    </aside>
  )
}

export function PublishSidebar() {
  return (
    <div className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4">
      <PhotoTipCard />
      <LocationsTipCard />
    </div>
  )
}
