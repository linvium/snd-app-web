import Image from 'next/image'

const SIZE_MAP = {
  sm: { width: 96, height: 72 },
  md: { width: 160, height: 120 },
  lg: { width: 220, height: 165 },
} as const

export default function Logo({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg'
}) {
  const { width, height } = SIZE_MAP[size]

  return (
    <Image
      src="/logo-snd.png"
      alt="Stvar na Dan"
      width={width}
      height={height}
      priority
      style={{
        width: 'auto',
        height: size === 'sm' ? '40px' : size === 'md' ? '72px' : '100px',
        objectFit: 'contain',
        display: 'block',
      }}
    />
  )
}
