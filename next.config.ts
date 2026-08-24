import type { NextConfig } from "next";

function supabaseImageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

const supabaseHost = supabaseImageHost()

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  // Help and legal copy moved out of the repository and into `public.pages`,
  // which put every one of these pages under /support or /legal. The old
  // addresses are in the wild - in mails, in indexes - so they keep working.
  async redirects() {
    return [
      { source: "/faq", destination: "/support/faq", permanent: true },
      { source: "/garancija", destination: "/support/guarantee", permanent: true },
      { source: "/guarantee", destination: "/support/guarantee", permanent: true },
      {
        source: "/kako-funkcionise",
        destination: "/support/how-it-works",
        permanent: true,
      },
      { source: "/contact", destination: "/support/contact", permanent: true },
      { source: "/pomoc/predaja", destination: "/support/pickup-and-return", permanent: true },
      { source: "/pomoc", destination: "/support", permanent: true },
      {
        source: "/cancellation-policy",
        destination: "/support/cancellation-policy",
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
