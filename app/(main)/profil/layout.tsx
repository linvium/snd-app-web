'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const MENU_ITEMS = [
  { name: 'Pregled profila', href: '/profil' },
  { name: 'Izmeni profil', href: '/profil/izmeni' },
  { name: 'Moje lokacije', href: '/profil/lokacije' },
  { name: 'Moji oglasi', href: '/profil/oglasi' },
  { name: 'Omiljeni', href: '/profil/omiljeni' },
  { name: 'Podešavanja', href: '/profil/podesavanja' },
]

function BackHeader({ title }: { title: string }) {
  return (
    <header
      className="snd-profile-back-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        margin: '0 -16px 8px',
        borderBottom: '1px solid var(--color-gray-200)',
        background: 'var(--color-white)',
      }}
    >
      <Link
        href="/profil"
        aria-label="Nazad na profil"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-gray-700)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <h1
        style={{
          margin: 0,
          fontSize: '17px',
          fontWeight: 600,
          color: 'var(--color-gray-900)',
        }}
      >
        {title}
      </h1>
    </header>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="snd-profile-sidebar"
      style={{
        width: '240px',
        flexShrink: 0,
        padding: '8px 0',
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-gray-200)',
        alignSelf: 'flex-start',
        position: 'sticky',
        top: '88px',
      }}
    >
      <nav aria-label="Profil meni">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {MENU_ITEMS.map((item) => {
            const isActive =
              item.href === '/profil' ? pathname === '/profil' : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '12px 16px 12px 13px',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-brand-500)' : 'var(--color-gray-700)',
                    borderLeft: isActive
                      ? '3px solid var(--color-brand-500)'
                      : '3px solid transparent',
                    background: isActive ? 'var(--color-brand-50)' : 'transparent',
                  }}
                >
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

function subpageTitle(pathname: string): string | null {
  if (pathname.startsWith('/profil/izmeni')) return 'Izmeni profil'
  if (pathname.startsWith('/profil/lokacije')) return 'Moje lokacije'
  if (pathname.startsWith('/profil/oglasi')) return 'Moji oglasi'
  if (pathname.startsWith('/profil/omiljeni')) return 'Omiljeni'
  if (pathname.startsWith('/profil/podesavanja')) return 'Podešavanja'
  if (pathname.startsWith('/profil/verifikacija')) return 'Verifikacija'
  return null
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const title = subpageTitle(pathname)

  return (
    <div
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '16px 16px 40px',
      }}
    >
      {title ? <BackHeader title={title} /> : null}

      <div className="snd-profile-shell" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <DesktopSidebar />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  )
}
