import {
  BarChart3,
  Images,
  LayoutList,
  Loader2,
  Package,
  Palette,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/hooks/useAuth'
import { demoAccountEmail } from '@/lib/demoMode'
import { gsap, ScrollTrigger } from '@/lib/animations'
import { cn } from '@/lib/utils'

const dashboardHero    = '/screenshots/dashboard-hero.png'
const dashboardPreview = '/screenshots/dashboard-overview.png'
const itemsListPreview = '/screenshots/inventory-table.png'
const appPreview       = '/screenshots/add-item-form.png'
const profitChartPreview = '/screenshots/profit-chart.png'
const inventoryGalleryPreview = '/screenshots/inventory-gallery.png'
const categoryBreakdownPreview = '/screenshots/category-breakdown.png'
const itemDetailPreview  = '/screenshots/item-detail.png'
const mobileDashboardPreview = '/screenshots/mobile-dashboard.png'

const features: Array<{
  description: string
  eyebrow: string
  icon: LucideIcon
  preview?: string
  previewAlt?: string
  title: string
}> = [
  {
    description:
      "Add anything you own or plan to sell. Where you got it, what you paid, what condition it's in. Photos, receipts, everything — right there when you need it.",
    eyebrow: 'Inventory',
    icon: Package,
    preview: itemsListPreview,
    previewAlt: 'Items list showing each flip with buy price, sell price, and profit',
    title: 'Every item, all in one place',
  },
  {
    description:
      'Selling price minus what you paid — plus fees, shipping, and splits if one buy becomes multiple sales. The number you see is the number you actually made.',
    eyebrow: 'Profit tracking',
    icon: TrendingUp,
    preview: itemDetailPreview,
    previewAlt: 'Item detail showing buy price, sell price, profit and ROI for one flip',
    title: 'Know your real profit',
  },
  {
    description:
      "Switch to gallery view and browse your items like a visual shelf. Upload photos straight from your phone — FlipSite handles the rest.",
    eyebrow: 'Gallery view',
    icon: Images,
    preview: inventoryGalleryPreview,
    previewAlt: 'Gallery view showing item photos in a visual grid',
    title: "See your inventory, don't just list it",
  },
  {
    description:
      "Filter by what's sold, what's listed, what's still sitting at home. Search by category, platform, or price range. No more scrolling through a spreadsheet to find one item.",
    eyebrow: 'Search & filter',
    icon: LayoutList,
    preview: itemsListPreview,
    previewAlt: 'Filtered items list showing sorted and searched results',
    title: 'Find anything in seconds',
  },
  {
    description:
      "Which categories make you the most? What's your best month? Where are you leaving money on the table? Your dashboard shows you at a glance.",
    eyebrow: 'Analytics',
    icon: BarChart3,
    preview: categoryBreakdownPreview,
    previewAlt: 'Analytics page showing profit breakdown by category',
    title: "See where your money's actually going",
  },
  {
    description:
      "Pick the look that feels right and use it every day. It shouldn't feel like work — it should feel like yours.",
    eyebrow: 'Themes',
    icon: Palette,
    preview: dashboardPreview,
    previewAlt: 'Dashboard in light mode showing the clean, customisable interface',
    title: '8 themes. Light, dark, and everything between.',
  },
]

const stats = [
  { label: 'items tracked by real users', numericEnd: 100, suffix: '+' },
  { label: 'in sales logged so far', numericEnd: 16, prefix: '€', suffix: 'k+' },
  { label: 'themes to make it yours', numericEnd: 8 },
  { label: 'spreadsheets needed', numericEnd: 0 },
]

const steps = [
  {
    description:
      "Takes 30 seconds. Add a photo, what you paid, where you got it, and what condition it's in. Done.",
    image: appPreview,
    imageAlt: 'Add item form showing name, buy price, condition, and category fields',
    number: '01',
    title: 'Log what you buy',
  },
  {
    description:
      "Sold something? Tap sold, enter the price, and FlipSite instantly calculates your profit and ROI. That's it.",
    image: itemsListPreview,
    imageAlt: 'Items list showing name, buy price, sell price, profit and ROI for each flip',
    number: '02',
    title: 'Mark it when it sells',
  },
  {
    description:
      "Your dashboard shows what you've made, what you've got in stock, and which flips are actually worth your time.",
    image: profitChartPreview,
    imageAlt: 'Profit over time chart showing cumulative earnings across all flips',
    number: '03',
    title: 'See the full picture',
  },
]

export function Landing() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [navScrolled, setNavScrolled] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function handleScroll() {
      setNavScrolled(window.scrollY > 12)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Navbar slide down ──────────────────────────────────────────
      gsap.fromTo(
        '.lp-navbar',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      )

      // ── Hero timeline ──────────────────────────────────────────────
      const heroTl = gsap.timeline({ delay: 0.1 })
      heroTl
        .fromTo('.hero__eyebrow',   { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
        .fromTo('.hero__h1 span',   { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1 }, '-=0.3')
        .fromTo('.hero__sub',       { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' }, '-=0.3')
        .fromTo('.hero__ctas',      { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
        .fromTo('.hero__screenshot',{ opacity: 0, scale: 0.96, x: 30 }, { opacity: 1, scale: 1, x: 0, duration: 0.9, ease: 'power2.out' }, '-=0.5')

      // ── Stats count-up ─────────────────────────────────────────────
      document.querySelectorAll<HTMLElement>('[data-target]').forEach((el, i) => {
        const end    = Number(el.dataset.target ?? 0)
        const prefix = el.dataset.prefix ?? ''
        const suffix = el.dataset.suffix ?? ''
        const obj = { val: 0 }
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            gsap.to(obj, {
              val: end,
              duration: 1.5,
              delay: i * 0.12,
              ease: 'power2.out',
              snap: { val: 1 },
              onUpdate: () => {
                el.textContent = `${prefix}${Math.round(obj.val)}${suffix}`
              },
            })
          },
        })
      })

      // ── Features intro heading ─────────────────────────────────────
      gsap.fromTo(
        '.lp-features-intro',
        { opacity: 0, y: 32 },
        {
          opacity: 1, y: 0, duration: 0.75, ease: 'power2.out',
          scrollTrigger: { trigger: '.lp-features-intro', start: 'top 88%', toggleActions: 'play none none none' },
        },
      )

      // ── Feature rows: image slides in from opposite side, text fades up ──
      document.querySelectorAll('.lp-feature-row').forEach((row) => {
        const isReverse = row.classList.contains('lp-feature-row--reverse')
        const imgXFrom  = isReverse ? 60 : -60
        const img = row.querySelector('.lp-feature-row__image')
        const icon = row.querySelector('.lp-feature-icon')
        const heading = row.querySelector('.lp-feature-heading')
        const body = row.querySelector('.lp-feature-body')
        const link = row.querySelector('.lp-feature-link')

        if (img) {
          gsap.fromTo(img,
            { opacity: 0, x: imgXFrom },
            { opacity: 1, x: 0, duration: 0.85, ease: 'power2.out',
              scrollTrigger: { trigger: row, start: 'top 82%', toggleActions: 'play none none none' } },
          )
        }
        if (icon) {
          gsap.fromTo(icon,
            { opacity: 0, scale: 0.7 },
            { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', delay: 0.1,
              scrollTrigger: { trigger: row, start: 'top 82%', toggleActions: 'play none none none' } },
          )
        }
        if (heading) {
          gsap.fromTo(heading,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', delay: 0.15,
              scrollTrigger: { trigger: row, start: 'top 82%', toggleActions: 'play none none none' } },
          )
        }
        if (body) {
          gsap.fromTo(body,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', delay: 0.25,
              scrollTrigger: { trigger: row, start: 'top 82%', toggleActions: 'play none none none' } },
          )
        }
        if (link) {
          gsap.fromTo(link,
            { opacity: 0 },
            { opacity: 1, duration: 0.5, delay: 0.35,
              scrollTrigger: { trigger: row, start: 'top 82%', toggleActions: 'play none none none' } },
          )
        }
      })

      // ── Steps: number sweeps in from left, content fades up ────────
      document.querySelectorAll('.lp-step').forEach((step) => {
        const num     = step.querySelector('.lp-step__number')
        const content = step.querySelector('.lp-step__content')
        const image   = step.querySelector('.lp-step__image')

        if (num) {
          gsap.fromTo(num,
            { opacity: 0, x: -60 },
            { opacity: 1, x: 0, duration: 0.9, ease: 'power2.out',
              scrollTrigger: { trigger: step, start: 'top 85%', toggleActions: 'play none none none' } },
          )
        }
        if (content) {
          gsap.fromTo(content,
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out', delay: 0.15,
              scrollTrigger: { trigger: step, start: 'top 85%', toggleActions: 'play none none none' } },
          )
        }
        if (image) {
          gsap.fromTo(image,
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out', delay: 0.25,
              scrollTrigger: { trigger: step, start: 'top 85%', toggleActions: 'play none none none' } },
          )
        }
      })

      // ── Phone mockup floating loop ─────────────────────────────────
      const phone = document.querySelector('.lp-phone-frame')
      if (phone) {
        gsap.fromTo(phone,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
            scrollTrigger: { trigger: phone, start: 'top 88%', toggleActions: 'play none none none' } },
        )
        gsap.to(phone, {
          y: -12,
          duration: 2.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 1,
        })
      }

      // ── Pricing section ───────────────────────────────────────────
      gsap.from('.pricing__header > *', {
        opacity: 0,
        y: 24,
        stagger: 0.1,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.pricing', start: 'top 80%', once: true },
      })
      gsap.from('.pricing-card', {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.pricing__grid', start: 'top 80%', once: true },
      })

      // ── CTA card scale-up ──────────────────────────────────────────
      const cta = document.querySelector('.lp-cta-section')
      if (cta) {
        gsap.fromTo(cta,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 0.75, ease: 'power2.out',
            scrollTrigger: { trigger: cta, start: 'top 85%', toggleActions: 'play none none none' } },
        )
        const heading = cta.querySelector('.lp-cta-heading')
        const sub     = cta.querySelector('.lp-cta-sub')
        const btns    = cta.querySelector('.lp-cta-btns')
        if (heading) gsap.fromTo(heading, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', delay: 0.15, scrollTrigger: { trigger: cta, start: 'top 85%', toggleActions: 'play none none none' } })
        if (sub)     gsap.fromTo(sub,     { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out', delay: 0.25, scrollTrigger: { trigger: cta, start: 'top 85%', toggleActions: 'play none none none' } })
        if (btns)    gsap.fromTo(btns,    { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6,  ease: 'power2.out', delay: 0.35, scrollTrigger: { trigger: cta, start: 'top 85%', toggleActions: 'play none none none' } })
      }
    }, mainRef)

    return () => ctx.revert()
  }, [])

  async function handleDemoLogin() {
    setDemoLoading(true)
    try {
      await signIn(demoAccountEmail, 'demo1234')
      toast.success('Demo mode ready')
      navigate('/items', { replace: true })
    } catch (error) {
      if (import.meta.env.DEV) console.error(error)
      toast.error('Unable to start demo mode. Please try again.')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <main ref={mainRef} className="lp-body min-h-screen" style={{ background: 'var(--lp-bg)', color: 'var(--lp-text)', overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav className={cn('lp-navbar', navScrolled && 'lp-navbar--scrolled')}>
        <a href="/flipsite/" className="lp-navbar__logo" aria-label="FlipSite home">FlipSite</a>
        <div className="lp-navbar__links hidden md:flex">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#demo">Demo</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/flipsite/login" className="lp-navbar__login hidden md:inline">Log in</a>
          <a href="/flipsite/login?tab=signup" className="lp-navbar__cta">Try it free</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero__text">
          <span className="lp-eyebrow hero__eyebrow">Built for flippers, by a flipper.</span>
          <h1 className="lp-hero__h1 hero__h1">
            <span>You buy.</span>
            <span>You sell.</span>
            <span className="lp-hero__h1-gap">Finally know if</span>
            <span className="lp-gradient-text">you're making money.</span>
          </h1>
          <p className="lp-hero__sub hero__sub">
            FlipSite tracks every item you flip — what you paid, what you sold it for, and what you actually walked away with. No spreadsheets. No guessing. Just the truth.
          </p>
          <div className="lp-hero__ctas hero__ctas">
            <a href="/flipsite/login?tab=signup" className="lp-btn-primary lp-gradient-bg text-white">
              Start for free
            </a>
            <a href="#demo" className="lp-btn-outline">
              See how it works →
            </a>
          </div>
        </div>
        <div className="lp-hero__visual">
          <img
            className="lp-hero__screenshot hero__screenshot"
            src={dashboardHero}
            alt="FlipSite dashboard showing total profit, inventory stats, and charts at a glance"
          />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="lp-stats">
        <div className="lp-stats__inner">
          {stats.map((stat) => (
            <div key={stat.label} className="lp-stats__item">
              <span className="lp-stats__number">
                <span
                  data-target={stat.numericEnd}
                  data-prefix={stat.prefix ?? ''}
                  data-suffix={stat.suffix ?? ''}
                >
                  {(stat.prefix ?? '') + stat.numericEnd + (stat.suffix ?? '')}
                </span>
              </span>
              <p className="lp-stats__label">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ background: 'var(--lp-bg)' }}>
        <div className="lp-features-intro">
          <span className="lp-eyebrow">What it does</span>
          <h2 className="lp-features-heading">
            Everything you need.{' '}
            <span className="lp-gradient-text">Nothing you don't.</span>
          </h2>
        </div>

        <div className="lp-features-list">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn('lp-feature-row', index % 2 === 1 && 'lp-feature-row--reverse')}
              style={{ background: index % 2 === 0 ? 'var(--lp-bg)' : 'var(--lp-surface)' }}
            >
              <div className="lp-feature-row__inner">
                <div className="lp-feature-row__image">
                  {feature.preview && (
                    <img
                      src={feature.preview}
                      alt={feature.previewAlt ?? feature.title}
                      className="lp-feature-img"
                    />
                  )}
                </div>
                <div className="lp-feature-row__text">
                  <span className="lp-eyebrow">{feature.eyebrow}</span>
                  <div className="lp-gradient-bg lp-feature-icon">
                    <feature.icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="lp-feature-heading">
                    {feature.title}
                  </h3>
                  <p className="lp-feature-body">
                    {feature.description}
                  </p>
                  <a href="#demo" className="lp-feature-link">
                    See it in the demo →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="lp-steps-section"
        style={{ background: 'var(--lp-tint)' }}
      >
        <div className="lp-steps-heading-wrap">
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-steps-h2">
            Simple enough to{' '}
            <span className="lp-gradient-text">actually use.</span>
          </h2>
        </div>

        {steps.map((step, index) => (
          <div
            key={step.number}
            className={cn('lp-step', index % 2 === 1 && 'lp-step--reverse')}
          >
            <span className="lp-step__number">{step.number}</span>
            <div className="lp-step__content">
              <h3 className="lp-step__title">{step.title}</h3>
              <p className="lp-step__desc">{step.description}</p>
            </div>
            <div className="lp-step__image">
              <img src={step.image} alt={step.imageAlt} className="lp-step__img" />
            </div>
          </div>
        ))}
      </section>

      {/* ── Mobile callout ── */}
      <section className="lp-phone-section">
        <div className="lp-phone-frame">
          <div className="lp-phone-screen">
            <img
              src={mobileDashboardPreview}
              alt="FlipSite dashboard on a phone showing inventory stats and total profit"
            />
          </div>
        </div>
        <p className="lp-phone-label">Works just as well on your phone.</p>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="pricing">
        <div className="pricing__inner">
          <div className="pricing__header">
            <span className="lp-eyebrow">Pricing</span>
            <h2 className="lp-features-heading">Simple, honest pricing.</h2>
            <p className="lp-feature-body" style={{ marginBottom: 0 }}>
              Free forever for casual flippers. Upgrade when it starts paying for itself.
            </p>
          </div>

          <div className="pricing__grid">
            {/* Free card */}
            <div className="pricing-card">
              <p className="pricing-card__name">Free</p>
              <p className="pricing-card__price">Get started — no card needed</p>
              <p className="pricing-card__intro">Everything you need to see if this clicks.</p>
              <div className="pricing-card__divider" />
              <ul className="pricing-card__features">
                {[
                  'Up to 100 items',
                  'Full profit & ROI calculations',
                  'Bundle math that actually works',
                  'Table and gallery view',
                  'Dashboard with 9 KPIs',
                  'All four statuses: holding, listed, sold, keeping',
                  '3 photos per item',
                  'Basic filters & search',
                  'CSV export',
                  '3 themes',
                ].map((f) => (
                  <li key={f} className="pricing-card__feature">
                    <span className="pricing-card__check" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/flipsite/login?tab=signup" className="pricing-card__cta pricing-card__cta--outline">
                Start for free
              </a>
            </div>

            {/* Premium card */}
            <div className="pricing-card pricing-card--premium">
              <span className="pricing-card__badge">Most popular</span>
              <p className="pricing-card__name">Premium</p>
              <p className="pricing-card__price">€5/month or €45/year</p>
              <p className="pricing-card__intro">For anyone doing this seriously.</p>
              <div className="pricing-card__divider" />
              <p className="pricing-card__also">Everything in free, plus:</p>
              <ul className="pricing-card__features">
                {[
                  'Unlimited items',
                  'Full analytics — date ranges, platform breakdowns, hold time, pace tracking',
                  'Unlimited photos per item',
                  'File attachments — receipts, manuals, warranties',
                  'All 8 themes & 6 fonts',
                  'CSV import',
                  'Advanced filters — platform, category, date range, bundles',
                  'Profit reports for tax season',
                ].map((f) => (
                  <li key={f} className="pricing-card__feature">
                    <span className="pricing-card__check--gradient" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <defs>
                          <linearGradient id="check-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#C026D3" />
                          </linearGradient>
                        </defs>
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="url(#check-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/flipsite/login?tab=signup" className="pricing-card__cta pricing-card__cta--filled">
                Get Premium
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA / Demo ── */}
      <section id="demo" style={{ background: 'var(--lp-bg)' }}>
        <div className="lp-cta-section">
          <h2 className="lp-cta-heading">Try it before you decide.</h2>
          <p className="lp-cta-sub">
            Jump into a pre-filled demo — real items, real numbers, no sign-up needed. If it clicks, make a free account in 30 seconds.
          </p>
          <div className="lp-cta-btns">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="lp-btn-white inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ color: 'var(--lp-accent)' }}
            >
              {demoLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Try the demo →
            </button>
            <a href="/flipsite/login?tab=signup" className="lp-btn-ghost">
              Create free account
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t px-6 py-12"
        style={{ background: '#1A1523', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <Logo size={19} />
          <p className="text-center text-base" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Track your flips. Know your numbers. Keep more of what you make.
          </p>
          <div className="flex items-center gap-6 text-base" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <a href="/flipsite/login" className="transition-colors hover:text-white">Log in</a>
            <a href="/flipsite/login?tab=signup" className="transition-colors hover:text-white">Sign up</a>
            <a href="https://vollrath.dev" target="_blank" rel="noopener" className="transition-colors hover:text-white">vollrath.dev</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
