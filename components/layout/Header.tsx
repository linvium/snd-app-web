'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import { useAuthSession } from '@/context/AuthContext'
import { useSignOut } from '@/hooks/auth/useAuth'

function getInitials(email?: string | null) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

export default function Header() {
  const { user, loading } = useAuthSession()
  const signOut = useSignOut()
  const [hasShadow, setHasShadow] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setHasShadow(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleSignOut = () => {
    setMenuOpen(false)
    signOut.mutate()
  }

  return (
    <header
      className="snd-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        height: '56px',
        background: 'var(--color-white)',
        boxShadow: hasShadow ? 'var(--shadow-header)' : 'none',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <div
        className="snd-header-inner"
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          height: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <Link href="/" aria-label="SND početna">
          <Logo size="sm" />
        </Link>

        <nav
          className="snd-header-nav"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px',
            flex: 1,
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--color-gray-700)',
          }}
        >
          <Link href="/kako-funkcionise">Kako funkcioniše</Link>
          <Link href="/garancija">Garancija</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <Link href="/objavi" className="snd-header-publish" style={{ display: 'none' }}>
              <Button size="sm">Objavi predmet</Button>
            </Link>
          ) : null}

          {loading ? null : user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="Meni naloga"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  background: 'var(--color-brand-500)',
                  color: 'var(--color-white)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {getInitials(user.email)}
              </button>

              {menuOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: '220px',
                    background: 'var(--color-white)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--color-gray-200)',
                    padding: '8px',
                    zIndex: 40,
                  }}
                >
                  {[
                    { href: '/profil', label: 'Moj profil' },
                    { href: '/moji-oglasi', label: 'Moji oglasi' },
                    { href: '/rezervacije', label: 'Moje rezervacije' },
                    { href: '/poruke', label: 'Poruke' },
                    { href: '/omiljeni', label: 'Omiljeni' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-gray-700)',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div
                    style={{
                      height: '1px',
                      background: 'var(--color-gray-200)',
                      margin: '6px 4px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signOut.isPending}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                    }}
                  >
                    Odjavi se
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link href="/prijava" className="snd-header-login" style={{ display: 'none' }}>
                <Button variant="secondary" size="sm">
                  Prijavi se
                </Button>
              </Link>
              <Link href="/registracija" className="snd-header-register" style={{ display: 'none' }}>
                <Button size="sm">Registruj se</Button>
              </Link>
              <Link
                href="/prijava"
                className="snd-header-guest-avatar"
                aria-label="Prijavi se"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-gray-300)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--color-gray-500)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
