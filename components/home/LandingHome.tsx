import Link from 'next/link'
import { MapPin, ShieldCheck, Wallet } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import WaitlistForm from '@/components/home/WaitlistForm'
import { cn } from '@/lib/utils'

const BENEFITS = [
  {
    title: 'Plaćaš korišćenje',
    description: 'Dan bušilice, vikend kamere, proslava sa šatorom. Bez kupovine koju ćeš požaliti.',
    icon: Wallet,
    iconClass: 'bg-[#fef3c7] text-[#c4850a]',
  },
  {
    title: 'Od ljudi iz kraja',
    description: 'Preuzmi u blizini, dogovori se direktno. Brzo, jednostavno, ljudski.',
    icon: MapPin,
    iconClass: 'bg-[#d8f0ea] text-[#1a6b5c]',
  },
  {
    title: 'Pokriveno garancijom',
    description: 'Proveren identitet i zaštita na svaku transakciju. Iznajmljuješ bez stresa.',
    icon: ShieldCheck,
    iconClass: 'bg-[#fde6dc] text-[#c85a28]',
  },
] as const

function AbstractShapes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-28 right-[-80px] size-[480px] rounded-full bg-[#f0b010]/30 blur-3xl" />
      <div className="absolute top-[18%] -left-32 size-[420px] rounded-full bg-[#209080]/28 blur-3xl" />
      <div className="absolute top-[48%] right-[-40px] size-[360px] rounded-full bg-[#001a36]/10 blur-3xl" />
      <div className="absolute bottom-[-80px] left-[20%] size-[400px] rounded-full bg-[#e8703a]/20 blur-3xl" />
    </div>
  )
}

export default function LandingHome() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f7f5ef]">
      <AbstractShapes />

      <header className="relative h-16 md:h-20">
        <div className="mx-auto flex h-full max-w-[1120px] items-center px-4">
          <Link href="/" aria-label="SND početna">
            <Logo variant="horizontal" size="lg" className="h-12 w-auto md:h-16" />
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col">
        <section className="px-5 pt-14 pb-12 text-center md:pt-20 md:pb-16">
          <h1 className="m-0 text-[clamp(32px,8vw,52px)] leading-[1.1] font-normal tracking-[-0.04em] text-[#001a36]">
            IZNAJMI<span className="text-[#f0b010]">.</span> KORISTI<span className="text-[#209080]">.</span>{' '}
            VRATI<span className="text-[#e8703a]">.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[440px] text-[17px] leading-relaxed text-[#001a36]/65">
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
                  className="rounded-lg border border-white/80 bg-white/80 p-6 text-left shadow-[0_8px_30px_rgba(0,26,54,0.06)] backdrop-blur-[2px]"
                >
                  <span
                    className={cn(
                      'mb-4 grid size-11 place-items-center rounded-md',
                      benefit.iconClass
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="m-0 text-base font-semibold tracking-[-0.02em] text-[#001a36]">
                    {benefit.title}
                  </h2>
                  <p className="mt-2 mb-0 text-[15px] leading-relaxed text-[#001a36]/60">
                    {benefit.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="px-5 py-14 md:py-16">
          <div className="mx-auto flex w-full max-w-[520px] flex-col items-center text-center">
            <h2 className="m-0 text-[clamp(24px,5vw,32px)] font-normal tracking-[-0.03em] text-[#001a36]">
              Saznaj prvi
            </h2>
            <p className="mt-3 mb-7 text-[15px] leading-relaxed text-[#001a36]/60">
              Uskoro krećemo. Ostavi email i budi među prvima kad platforma bude spremna.
            </p>
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="relative px-5 py-6 text-center text-[13px] text-[#001a36]/40">
        Stvar na Dan
      </footer>
    </div>
  )
}
