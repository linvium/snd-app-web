import Image from 'next/image'
import type { Testimonial } from '@/lib/testimonials'

export default function AuthMarketingPanel({
  testimonial,
  avatarUrl,
}: {
  testimonial: Testimonial
  avatarUrl: string
}) {
  return (
    <aside
      className="relative hidden min-h-screen flex-col justify-center overflow-hidden px-10 py-12 text-white lg:flex xl:px-12 xl:py-14 bg-[radial-gradient(ellipse_80%_60%_at_70%_40%,rgba(240,176,16,0.45)_0%,transparent_55%),radial-gradient(ellipse_70%_70%_at_20%_80%,rgba(32,144,128,0.75)_0%,transparent_50%),radial-gradient(ellipse_60%_50%_at_90%_90%,rgba(32,144,128,0.5)_0%,transparent_45%),linear-gradient(145deg,#001a36_0%,#002040_35%,#0a4a4a_65%,#1a6b5c_100%)]"
      aria-label="Stvar na Dan"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,rgba(255,255,255,0.08)_0%,transparent_55%)]"
      />

      <div className="relative flex max-w-[440px] flex-col gap-7">
        <h2 className="m-0 text-[clamp(22px,2.4vw,32px)] font-extrabold leading-tight tracking-[-0.02em] whitespace-nowrap">
          IZNAJMI. KORISTI. VRATI.
        </h2>

        <blockquote className="m-0 border-none p-0">
          <span
            aria-hidden
            className="mb-3 block font-serif text-[56px] font-bold leading-[0.75] text-[rgba(240,176,16,0.85)]"
          >
            “
          </span>
          <p className="mb-6 text-[17px] leading-[1.55] font-normal text-white/95">
            {testimonial.quote}
          </p>
          <footer className="flex items-center gap-3.5">
            <Image
              src={avatarUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="size-12 shrink-0 rounded-full object-cover bg-white/15"
            />
            <div>
              <div className="text-[15px] font-bold leading-tight text-white">
                {testimonial.authorName}
              </div>
              <div className="mt-0.5 text-[13px] leading-tight text-white/65">
                {testimonial.authorRole}
              </div>
            </div>
          </footer>
        </blockquote>
      </div>
    </aside>
  )
}
