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

const HORIZONTAL_SIZE_CLASS = {
  sm: 'h-10 w-auto',
  md: 'h-12 w-auto',
  lg: 'h-16 w-auto',
} as const

const HORIZONTAL_SIZE_PX = {
  sm: { width: 83, height: 40 },
  md: { width: 99, height: 48 },
  lg: { width: 166, height: 80 },
} as const

const VARIANT_SRC = {
  symbol: '/images/snd_logo_symbol.png',
  vertical: '/images/snd_logo_vertical.png',
  horizontal: '/images/snd_logo_horizontal.png',
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
  const isHorizontal = variant === 'horizontal'
  const width = isHorizontal ? HORIZONTAL_SIZE_PX[size].width : SIZE_PX[size]
  const height = isHorizontal ? HORIZONTAL_SIZE_PX[size].height : SIZE_PX[size]

  return (
    <Image
      src={VARIANT_SRC[variant]}
      alt="Stvar na Dan"
      width={width}
      height={height}
      priority
      className={cn(
        'block object-contain',
        isHorizontal ? HORIZONTAL_SIZE_CLASS[size] : SIZE_CLASS[size],
        className
      )}
    />
  )
}
