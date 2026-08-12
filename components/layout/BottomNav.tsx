'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Početna',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: '/pretraga',
    label: 'Pretraga',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: '/objavi',
    label: 'Objavi',
    emphasized: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: '/poruke',
    label: 'Poruke',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16v10H8l-4 4V6z" />
      </svg>
    ),
  },
  {
    href: '/profil',
    label: 'Profil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="snd-bottom-nav"
      aria-label="Donja navigacija"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--color-white)',
        borderTop: '1px solid var(--color-gray-200)',
        display: 'none',
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

        if (item.emphasized) {
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                marginTop: '-18px',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-brand-500)',
                  color: 'var(--color-white)',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isActive ? 'var(--color-brand-600)' : 'var(--color-gray-500)',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: isActive ? 'var(--color-brand-600)' : 'var(--color-gray-500)',
              fontSize: '11px',
              fontWeight: isActive ? 600 : 500,
              textDecoration: 'none',
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
