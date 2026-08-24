import Link from 'next/link'

import Logo from '@/components/ui/Logo'
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_SOCIAL_LINKS,
} from '@/lib/layout/footer.helpers'

/**
 * Drawn here rather than imported: lucide dropped its brand glyphs, and these
 * two are the only ones the site needs. Same 24-box and stroke weight as every
 * other icon, so they sit in a row with them without looking pasted in.
 */
function InstagramGlyph(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  )
}

function FacebookGlyph(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

const SOCIAL_ICONS = {
  instagram: InstagramGlyph,
  facebook: FacebookGlyph,
} satisfies Record<(typeof FOOTER_SOCIAL_LINKS)[number]['key'], React.ComponentType<React.ComponentProps<'svg'>>>

/**
 * The public site's footer.
 *
 * It is the second place every help and legal page is reachable from, which is
 * the part that matters beyond decoration: the header's utility row is hidden
 * below lg, so on a phone this is the only standing link to the guarantee or
 * the terms. The links themselves are ordinary hrefs, so they open in the
 * support sheet on click and stay crawlable addresses for everything else.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6 md:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] lg:gap-12">
          <div>
            <Link href="/" aria-label="SND početna" className="inline-block">
              <Logo variant="horizontal" size="md" />
            </Link>
            <p className="mt-4 mb-0 max-w-[320px] text-sm leading-6 text-muted-foreground">
              Iznajmi alat, opremu i stvari od ljudi iz svog kraja. Svaka rezervacija je pokrivena
              garancijom.
            </p>

            <ul className="mt-5 flex list-none gap-2">
              {FOOTER_SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.key]
                return (
                  <li key={social.key}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      data-testid={`footer-social-${social.key}`}
                      className="grid size-10 place-items-center rounded-full border border-border text-zinc-500 no-underline hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Icon className="size-[18px]" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          <nav aria-label="SND">
            <h2 className="mt-0 mb-3 text-[13px] font-semibold tracking-wide text-foreground uppercase">
              SND
            </h2>
            <ul className="m-0 grid list-none gap-2.5">
              {FOOTER_COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground no-underline hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Pravno">
            <h2 className="mt-0 mb-3 text-[13px] font-semibold tracking-wide text-foreground uppercase">
              Pravno
            </h2>
            <ul className="m-0 grid list-none gap-2.5">
              {FOOTER_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground no-underline hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 mb-0 border-t border-border pt-6 text-[13px] text-zinc-500">
          © {year} Stvar na Dan
        </p>
      </div>
    </footer>
  )
}
