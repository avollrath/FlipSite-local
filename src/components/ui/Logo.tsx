import logoUrl from '@/assets/flipsite_logoV4.svg'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 44, className = '' }: LogoProps) {
  const height = Math.round(size * 1.35)
  const width = Math.round(height * (181 / 89))

  return (
    <span
      role="img"
      aria-label="FlipSite"
      className={`flex-shrink-0 ${className}`}
      style={{
        width,
        height,
        background:
          'linear-gradient(135deg, hsl(var(--accent) / 0.65), hsl(var(--accent)))',
        mask: `url(${logoUrl}) center / contain no-repeat`,
        WebkitMask: `url(${logoUrl}) center / contain no-repeat`,
      }}
    />
  )
}
