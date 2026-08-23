'use client'

import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import HomeListings from '@/components/home/HomeListings'
import HeaderSearch from '@/components/search/HeaderSearch'
import { useAuthSession } from '@/context/AuthContext'

export default function HomeScreen() {
  const { user, loading } = useAuthSession()
  const showAuthActions = !loading && !user

  return (
    <>
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
          <h1 className="mb-3 flex flex-col items-center gap-3 text-[clamp(26px,6.4vw,38px)] leading-[1.1] font-normal tracking-[-0.03em] text-white">
            <span>IZNAJMI. KORISTI. VRATI.</span>
            <span
              aria-hidden
              className="flex w-full max-w-[240px] items-center gap-3 text-[11px] leading-none font-medium tracking-[0.3em] uppercase text-white/45"
            >
              <span className="h-px flex-1 bg-white/20" />
              ili
              <span className="h-px flex-1 bg-white/20" />
            </span>
            <span className="text-white/55">OBJAVI. IZDAJ. ZARADI.</span>
          </h1>
          <p className="mb-8 max-w-[440px] text-[17px] leading-normal text-white/80">
            Stvari od ljudi iz tvog kraja. Uzmi šta ti treba, zaradi od onoga što ti stoji.
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
      <HomeListings />
    </>
  )
}
