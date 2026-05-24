import logoUrl from '@/assets/flipsite_logoV4.svg'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 44, className = '' }: LogoProps) {
  const width = Math.round(size * (181 / 89))

  return (
    <img
      src={logoUrl}
      alt="FlipSite"
      width={width}
      height={size}
      className={`flex-shrink-0 ${className}`}
    />
  )
}
