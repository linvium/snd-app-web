import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-6 text-center">
      <Link href="/" className="mb-8" aria-label="SND početna">
        <Logo size="md" />
      </Link>

      <div className="w-full max-w-[440px] rounded-xl bg-card px-8 py-10 shadow-md">
        <p className="mb-2 text-sm font-semibold tracking-[0.06em] text-brand-500 uppercase">
          Greška 404
        </p>

        <h1 className="mb-3 text-[28px] leading-tight font-bold tracking-[-0.02em] text-foreground">
          Ova stranica trenutno ne postoji
        </h1>

        <p className="mb-7 text-[15px] leading-[1.55] text-muted-foreground">
          Link je možda pogrešan ili je stranica uklonjena. Vrati se na početnu i nastavi dalje.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/">
            <Button fullWidth size="lg">
              Idi na početnu
            </Button>
          </Link>
          <Link href="/pretraga">
            <Button fullWidth variant="secondary">
              Pretraži stvari
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
