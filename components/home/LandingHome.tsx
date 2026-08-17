import Link from 'next/link'
import { DoorOpenIcon, MapPinIcon, ShieldCheckIcon, WalletIcon } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import WaitlistForm from '@/components/home/WaitlistForm'
import { LAUNCH_DAY, LAUNCH_MONTH_LABEL, LAUNCH_YEAR } from '@/lib/home/launch.helpers'
import { cn } from '@/lib/utils'

const BENEFITS = [
  {
    title: 'Zaradi od svojih stvari',
    description:
      'Bušilica, kamera, šator. Ono što si do sada pozajmljivao besplatno sada može da ti donese novac. Cela ekonomija, tu gde živiš.',
    icon: WalletIcon,
    iconClass: 'bg-[#fef3c7] text-[#c4850a]',
    indexClass: 'text-[#f0b010]/20',
    index: '01',
  },
  {
    title: 'Uzmi na dan, ne zauvek',
    description:
      'Treba ti za vikend, ne za orman. Iznajmi od ljudi iz kraja i vrati kad završiš. Bez kupovine koju ćeš požaliti.',
    icon: MapPinIcon,
    iconClass: 'bg-[#d8f0ea] text-[#1a6b5c]',
    indexClass: 'text-[#209080]/20',
    index: '02',
  },
  {
    title: 'Pokriveno garancijom',
    description:
      'Proveren identitet i zaštita na svaku transakciju. Iznajmljuješ i izdaješ bez stresa.',
    icon: ShieldCheckIcon,
    iconClass: 'bg-[#fde6dc] text-[#c85a28]',
    indexClass: 'text-[#e8703a]/20',
    index: '03',
  },
] as const

function AbstractShapes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-28 right-[-80px] size-[520px] rounded-full bg-[#f0b010]/40 blur-3xl" />
      <div className="absolute top-[10%] -left-36 size-[460px] rounded-full bg-[#209080]/32 blur-3xl" />
      <div className="absolute top-[38%] right-[-70px] size-[400px] rounded-full bg-[#001a36]/14 blur-3xl" />
      <div className="absolute bottom-[-120px] left-[8%] size-[460px] rounded-full bg-[#e8703a]/24 blur-3xl" />
      <div className="absolute top-28 right-[16%] size-3 rounded-full bg-[#f0b010]" />
      <div className="absolute top-44 right-[12%] size-2 rounded-full bg-[#209080]" />
      <div className="absolute top-[22%] left-[9%] size-2.5 rounded-full bg-[#e8703a]" />
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
        <section className="px-5 pt-10 pb-8 text-center md:pt-14 md:pb-10">
          <h1 className="m-0 mt-4 text-[clamp(36px,9vw,64px)] leading-[0.95] font-normal tracking-[-0.045em] text-[#001a36]">
            IZNAJMI<span className="text-[#f0b010]">.</span> KORISTI<span className="text-[#209080]">.</span>{' '}
            VRATI<span className="text-[#e8703a]">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[440px] text-[17px] leading-relaxed text-[#001a36]/65">
            Stvari od ljudi iz tvog kraja. Jeftino, sigurno, garantovano.
          </p>
        </section>

        <section className="mx-auto w-full max-w-[1120px] px-5 pb-10 md:pb-12">
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3 sm:gap-5">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon
              return (
                <li
                  key={benefit.title}
                  className="relative overflow-hidden rounded-[20px] border border-white/80 bg-white/85 p-6 pt-7 text-left shadow-[0_12px_40px_rgba(0,26,54,0.08)] backdrop-blur-[2px]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -top-3 -right-1 text-[72px] leading-none font-semibold tracking-[-0.06em]',
                      benefit.indexClass
                    )}
                  >
                    {benefit.index}
                  </span>
                  <span
                    className={cn(
                      'relative mb-4 grid size-11 place-items-center rounded-md',
                      benefit.iconClass
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h2 className="relative m-0 text-base font-semibold tracking-[-0.02em] text-[#001a36]">
                    {benefit.title}
                  </h2>
                  <p className="relative mt-2 mb-0 text-[15px] leading-relaxed text-[#001a36]/60">
                    {benefit.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="px-5 pb-16 md:pb-20">
          <div className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[#f0b010]/35 bg-[#001a36] px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,26,54,0.28)] md:px-10 md:py-12">
            <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[#f0b010]" />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[#f0b010]/20 blur-3xl"
            />

            <p className="relative m-0 flex items-center justify-center gap-2 text-[12px] font-medium tracking-[0.22em] uppercase text-[#f0b010]">
              <DoorOpenIcon className="size-4" aria-hidden />
              Vrata se otvaraju
            </p>

            <p
              className="relative mt-6 mb-0 flex flex-col items-center md:flex-row md:items-end md:justify-center md:gap-5"
              aria-label={`${LAUNCH_DAY}. ${LAUNCH_MONTH_LABEL} ${LAUNCH_YEAR}`}
            >
              <span className="text-[clamp(92px,22vw,148px)] leading-[0.8] font-semibold tracking-[-0.07em] text-[#f0b010] drop-shadow-[0_0_48px_rgba(240,176,16,0.35)]">
                {LAUNCH_DAY}
              </span>
              <span className="mt-3 flex flex-col items-center md:mt-0 md:mb-2 md:items-start">
                <span className="text-[clamp(22px,4.4vw,34px)] font-medium tracking-[0.2em] uppercase text-white">
                  {LAUNCH_MONTH_LABEL}
                </span>
                <span className="mt-1.5 text-sm tracking-[0.32em] text-[#f0b010]/75">{LAUNCH_YEAR}</span>
              </span>
            </p>

            <div className="relative my-8" aria-hidden>
              <div className="border-t border-dashed border-[#f0b010]/35" />
            </div>

            <h2 className="relative m-0 text-[clamp(26px,5vw,36px)] font-normal tracking-[-0.03em] text-white">
              Saznaj prvi
            </h2>
            <p className="relative mx-auto mt-3 mb-7 max-w-[380px] text-[15px] leading-relaxed text-white/65">
              Uđi među prve. Ostavi email i javljamo ti se pre nego što krenemo.
            </p>
            <div className="relative">
              <WaitlistForm tone="dark" />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative px-5 py-7 text-center text-[13px] tracking-[0.04em] text-[#001a36]/40">
        Stvar na Dan
        <span className="mx-2 text-[#f0b010]" aria-hidden>
          ·
        </span>
        {LAUNCH_YEAR}
      </footer>
    </div>
  )
}
