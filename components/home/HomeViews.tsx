'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import HeaderSearch from '@/components/search/HeaderSearch'
import { useAuthSession } from '@/context/AuthContext'

export default function HomeScreen() {
  const { user, loading } = useAuthSession()
  const showAuthActions = !loading && !user

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col items-center px-5 pt-12 pb-8 text-center">
      <h1 className="mb-3 text-[clamp(28px,7vw,40px)] leading-[1.15] font-normal tracking-[-0.03em] text-foreground">
        Iznajmi umesto da kupuješ
      </h1>
      <p className="mb-8 max-w-[420px] text-[17px] leading-normal text-muted-foreground">
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
    </main>
  )
}
