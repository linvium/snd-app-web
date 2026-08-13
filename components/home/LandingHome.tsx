import Link from 'next/link'
import { MapPin, ShieldCheck, Wallet } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import WaitlistForm from '@/components/home/WaitlistForm'

const BENEFITS = [
  {
    title: 'Plaćaš korišćenje',
    description: 'Dan bušilice, vikend kamere, proslava sa šatorom. Bez kupovine koju ćeš požaliti.',
    icon: Wallet,
  },
  {
    title: 'Od ljudi iz kraja',
    description: 'Preuzmi u blizini, dogovori se direktno. Brzo, jednostavno, ljudski.',
    icon: MapPin,
  },
  {
    title: 'Pokriveno garancijom',
    description: 'Proveren identitet i zaštita na svaku transakciju. Iznajmljuješ bez stresa.',
    icon: ShieldCheck,
  },
] as const

export default function LandingHome() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="h-16 bg-card md:h-20">
        <div className="mx-auto flex h-full max-w-[1120px] items-center px-4">
          <Link href="/" aria-label="SND početna">
            <Logo variant="horizontal" size="lg" className="h-12 w-auto md:h-16" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="px-5 pt-14 pb-12 text-center md:pt-20 md:pb-16">
          <h1 className="m-0 text-[clamp(32px,8vw,52px)] leading-[1.1] font-normal tracking-[-0.04em] text-card-foreground">
            IZNAJMI. KORISTI. VRATI.
          </h1>
          <p className="mx-auto mt-4 max-w-[440px] text-[17px] leading-relaxed text-muted-foreground">
            Stvari od ljudi iz tvog kraja. Jeftino, sigurno, garantovano.
          </p>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-5 pb-14 md:pb-20">
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3 sm:gap-5">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon
              return (
                <li
                  key={benefit.title}
                  className="rounded-lg border border-border bg-card p-6 text-left"
                >
                  <span className="mb-4 grid size-11 place-items-center rounded-md bg-brand-50 text-brand-600">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="m-0 text-base font-semibold tracking-[-0.02em] text-card-foreground">
                    {benefit.title}
                  </h2>
                  <p className="mt-2 mb-0 text-[15px] leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="border-t border-border bg-card px-5 py-14 md:py-16">
          <div className="mx-auto flex w-full max-w-[520px] flex-col items-center text-center">
            <h2 className="m-0 text-[clamp(24px,5vw,32px)] font-normal tracking-[-0.03em] text-card-foreground">
              Saznaj prvi
            </h2>
            <p className="mt-3 mb-7 text-[15px] leading-relaxed text-muted-foreground">
              Uskoro krećemo. Ostavi email i budi među prvima kad platforma bude spremna.
            </p>
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6 text-center text-[13px] text-muted-foreground">
        Stvar na Dan
      </footer>
    </div>
  )
}
