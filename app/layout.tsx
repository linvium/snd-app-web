import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { QueryProvider } from '@/providers/QueryProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const siteTitle = 'SND – Iznajmi umesto da kupuješ'
const siteDescription =
  'Iznajmi alat, opremu i stvari od ljudi iz svog kraja. Sve pokriveno garancijom.'
const logoUrl = '/images/snd_logo_symbol.png'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: '/',
    siteName: 'SND',
    locale: 'sr_Latn_RS',
    type: 'website',
    images: [
      {
        url: logoUrl,
        width: 1128,
        height: 1128,
        alt: 'SND – Stvar na Dan',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
    images: [logoUrl],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn-RS">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
