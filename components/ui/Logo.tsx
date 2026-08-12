import Image from 'next/image'

import { cn } from '@/lib/utils'

const SIZE_CLASS = {
  sm: 'size-10',
  md: 'size-[72px]',
  lg: 'size-[100px]',
} as const

const SIZE_PX = {
  sm: 40,
  md: 72,
  lg: 100,
} as const

const VARIANT_SRC = {
  symbol: '/images/snd_logo_symbol.png',
  vertical: '/images/snd_logo_vertical.png',
} as const

export default function Logo({
  size = 'md',
  variant = 'symbol',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  variant?: keyof typeof VARIANT_SRC
  className?: string
}) {
  const px = SIZE_PX[size]

  return (
    <Image
      src={VARIANT_SRC[variant]}
      alt="Stvar na Dan"
      width={px}
      height={px}
      priority
      className={cn('block object-contain', SIZE_CLASS[size], className)}
    />
  )
}
