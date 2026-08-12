import Logo from '@/components/ui/Logo'
import AuthMarketingPanel from '@/components/auth/AuthMarketingPanel'
import Link from 'next/link'
import { testimonialsService } from '@/lib/testimonials'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const testimonial = testimonialsService.getRandom()
  const avatarUrl = testimonialsService.getAvatarUrl(testimonial)

  return (
    <div className="grid min-h-screen grid-cols-1 bg-card lg:grid-cols-2">
      <div className="flex min-h-screen flex-col justify-center px-6 py-8 lg:px-14 lg:py-12 xl:px-20 xl:py-14">
        <div className="mx-auto w-full max-w-[400px]">
          <Link href="/" className="mb-9 inline-block">
            <Logo />
          </Link>
          {children}
        </div>
      </div>

      <AuthMarketingPanel testimonial={testimonial} avatarUrl={avatarUrl} />
    </div>
  )
}
