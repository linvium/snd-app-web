import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-gray-50)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <Link href="/" style={{ marginBottom: '32px' }} aria-label="SND početna">
        <Logo size="md" />
      </Link>

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-md)',
          padding: '40px 32px',
        }}
      >
        <p
          style={{
            margin: '0 0 8px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-brand-500)',
          }}
        >
          Greška 404
        </p>

        <h1
          style={{
            margin: '0 0 12px',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--color-gray-900)',
            lineHeight: 1.2,
          }}
        >
          Ova stranica trenutno ne postoji
        </h1>

        <p
          style={{
            margin: '0 0 28px',
            fontSize: '15px',
            lineHeight: 1.55,
            color: 'var(--color-gray-500)',
          }}
        >
          Link je možda pogrešan ili je stranica uklonjena. Vrati se na početnu i nastavi dalje.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
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
