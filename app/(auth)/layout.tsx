import Logo from '@/components/ui/Logo'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
      }}
    >
      <Link href="/" style={{ marginBottom: '32px' }}>
        <Logo />
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
        {children}
      </div>
    </div>
  )
}
