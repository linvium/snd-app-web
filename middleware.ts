import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_ROUTES = [
  '/prijava',
  '/registracija',
  '/zaboravljena-lozinka',
  '/verifikacija',
]

// /nova-lozinka requires a recovery session — do not redirect signed-in users away
const RECOVERY_ROUTES = ['/nova-lozinka']
const PROTECTED_ROUTES = ['/profil', '/poruke', '/rezervacije', '/objavi', '/dobrodosli']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Signed-in users should not see login/register screens
  if (user && AUTH_ROUTES.some((r) => path.startsWith(r))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // New password — requires a session (after recovery OTP)
  if (!user && RECOVERY_ROUTES.some((r) => path.startsWith(r))) {
    return NextResponse.redirect(new URL('/zaboravljena-lozinka', request.url))
  }

  if (!user && PROTECTED_ROUTES.some((r) => path.startsWith(r))) {
    const loginUrl = new URL('/prijava', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
