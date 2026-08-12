import Image from 'next/image'

const SIZE_MAP = {
  sm: { width: 40, height: 40 },
  md: { width: 72, height: 72 },
  lg: { width: 100, height: 100 },
} as const

export default function Logo({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg'
}) {
  const { width, height } = SIZE_MAP[size]

  return (
    <Image
      src="/images/snd_logo_symbol.png"
      alt="Stvar na Dan"
      width={width}
      height={height}
      priority
      style={{
        width: `${width}px`,
        height: `${height}px`,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  )
}
