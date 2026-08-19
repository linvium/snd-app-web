'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import HeaderSearch from '@/components/search/HeaderSearch'
import { useAuthSession } from '@/context/AuthContext'

export default function HomeScreen() {
  const { user, loading } = useAuthSession()
  const showAuthActions = !loading && !user

  return (
    <section data-testid="home-hero" className="relative h-[36rem] w-full bg-black md:h-[40rem]">
      <Image
        src="/images/homepage_hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-top brightness-50"
      />
      <div aria-hidden className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[900px] flex-col items-center justify-center px-5 pt-24 pb-10 text-center">
        <h1 className="mb-3 text-[clamp(28px,7vw,40px)] leading-[1.15] font-normal tracking-[-0.03em] text-white">
          IZNAJMI. KORISTI. VRATI.
        </h1>
        <p className="mb-8 max-w-[420px] text-[17px] leading-normal text-white/80">
          Stvari od ljudi iz tvog kraja. Jeftino, sigurno, garantovano.
        </p>

        <div className="mb-8 w-full text-left">
          <Suspense fallback={<div className="h-12 md:h-16" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        {showAuthActions ? (
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/login">
              <Button size="lg">Prijavi se</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="secondary" size="lg">
                Napravi nalog
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
