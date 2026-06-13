'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, ChevronDown, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
// @ts-ignore — vanilla JS fluid simulation (exact reference engine)
import { startFluid } from '../fluid.js'

// ═══════════════════════════════════════════════════════════════════════════════
//  Hero Component
// ═══════════════════════════════════════════════════════════════════════════════
export function Hero() {
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const cursorRef        = useRef<HTMLDivElement>(null)
  const rippleRef        = useRef<HTMLDivElement>(null)
  const themeChangeCbRef = useRef<((cx: number, cy: number) => void) | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [hasToggledTheme, setHasToggledTheme] = useState(false)
  const [isHeroLocked, setIsHeroLocked] = useState(true)
  const [activeSection, setActiveSection] = useState('')
  const { theme, setTheme } = useTheme()

  useEffect(() => { setMounted(true) }, [])

  // Active section tracker for nav highlighting
  useEffect(() => {
    const ids = ['about','tech-stack','portfolio','services','awards','contact']
    const update = () => {
      const mid = window.scrollY + window.innerHeight * 0.42
      let cur = ''
      for (const id of ids) { const el = document.getElementById(id); if (el && el.offsetTop <= mid) cur = id }
      setActiveSection(cur)
    }
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true)
        setIsHeroLocked(false)
      } else {
        setIsScrolled(false)
        if (window.scrollY <= 10) {
          setIsHeroLocked(true)
        }
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (isHeroLocked) {
      document.body.classList.add('lock-scroll-mobile')
      document.documentElement.classList.add('lock-scroll-mobile')
    } else {
      document.body.classList.remove('lock-scroll-mobile')
      document.documentElement.classList.remove('lock-scroll-mobile')
    }
    return () => {
      document.body.classList.remove('lock-scroll-mobile')
      document.documentElement.classList.remove('lock-scroll-mobile')
    }
  }, [isHeroLocked])

  // Text scramble
  useEffect(() => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%!'
    document.querySelectorAll<HTMLElement>('.hero-phrase').forEach((el, i) => {
      const orig = el.textContent || ''
      setTimeout(() => {
        let f = 0; const tot = 30
        const iv = setInterval(() => {
          if (f >= tot) { el.textContent = orig; clearInterval(iv); return }
          const rev = Math.floor((f / tot) * orig.length * 1.5)
          el.textContent = [...orig].map((c, j) =>
            c === ' ' || c === '-' ? c : j < rev - 3 ? c : CHARS[Math.floor(Math.random() * CHARS.length)]
          ).join('')
          f++
        }, 38)
      }, 600 + i * 220)
    })
  }, [])

  // WebGL fluid
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    return startFluid(canvas, themeChangeCbRef)
  }, [])

  // Theme toggle — View Transitions API with ripple fallback
  const handleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    setHasToggledTheme(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const goLight = theme === 'dark'

    document.documentElement.style.setProperty('--vt-cx', `${cx}px`)
    document.documentElement.style.setProperty('--vt-cy', `${cy}px`)

    if ('startViewTransition' in document) {
      ;(document as any).startViewTransition(() => {
        const root = document.documentElement
        if (goLight) {
          root.classList.remove('dark')
          root.style.colorScheme = 'light'
        } else {
          root.classList.add('dark')
          root.style.colorScheme = 'dark'
        }
      })
      setTheme(goLight ? 'light' : 'dark')
      themeChangeCbRef.current?.(cx, cy)
    } else {
      const ripple = rippleRef.current; if (!ripple) return
      const maxR = Math.hypot(window.innerWidth, window.innerHeight) * 2.2
      const bg = goLight ? '#F9F9F9' : '#060606'
      ripple.style.cssText = `position:fixed;border-radius:50%;pointer-events:none;z-index:9998;left:${cx}px;top:${cy}px;width:4px;height:4px;background:${bg};transform:translate(-50%,-50%) scale(1);opacity:1;transition:transform 0.9s cubic-bezier(0.22,1,0.36,1),opacity 0.15s ease 0.75s;`
      ripple.getBoundingClientRect()
      ripple.style.transform = `translate(-50%,-50%) scale(${maxR / 2})`
      setTimeout(() => { setTheme(goLight ? 'light' : 'dark'); themeChangeCbRef.current?.(cx, cy) }, 280)
      setTimeout(() => { ripple.style.opacity = '0' }, 780)
      setTimeout(() => { ripple.style.transform = 'translate(-50%,-50%) scale(0)'; ripple.style.transition = 'none' }, 960)
    }
  }

  const isDark = !mounted || theme === 'dark'
  const ORANGE = '#FF6B1A'
  const BLUE   = '#0094E5'
  const accent = isDark ? ORANGE : BLUE

  const navLinkStyle: React.CSSProperties = {
    color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem',
    letterSpacing: '0.12em', textDecoration: 'none', textTransform: 'uppercase' as const,
    transition: 'opacity 0.2s',
  }
  const circleBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.3s', color: '#fff',
    fontSize: '1rem', position: 'relative',
  }

  // Shared easing for nav transitions
  const NAV_EASE = 'cubic-bezier(0.4,0,0.2,1)'
  const NAV_DUR  = '0.6s'
  const navT = (prop: string) => `${prop} ${NAV_DUR} ${NAV_EASE}`

  return (
    <div style={{ position: 'relative', width: '100%', height: '100svh', background: isDark ? '#060606' : '#F9F9F9', overflow: 'hidden' }}>

      {/* WebGL canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, filter: isDark ? 'none' : 'invert(1)' }} />

      {/* Film grain overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")`, pointerEvents: 'none', zIndex: 50, opacity: 0.45 }} />

      {/* Ripple overlay */}
      <div ref={rippleRef} style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 9998, opacity: 0 }} />

      {/*
        ── Nav ──────────────────────────────────────────────────────────────────
        Architecture (Dual Layer to fix mix-blend-mode stacking):
          Layer 1: Background Pill. zIndex: 59. mixBlendMode: normal.
                   Renders the frosted glass pill. Content is hidden (visibility:hidden) just for sizing.
          Layer 2: Content. zIndex: 60. mixBlendMode: difference (when unscrolled).
                   Renders the text and buttons. No background pill.
        ────────────────────────────────────────────────────────────────────── */}

      {/* ── Layer 1: Background Pill ── */}
      <nav style={{
        position: 'fixed',
        top: isScrolled ? 14 : 0,
        left: 0, right: 0,
        zIndex: 59,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        padding: isScrolled ? '0 18px' : '0',
        background: 'transparent',
        pointerEvents: 'none',
        transition: [navT('top'), navT('padding')].join(', '),
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: isScrolled ? 760 : 4000,
          display: 'flex',
          alignItems: 'center',
          borderRadius: isScrolled ? 999 : 0,
          transition: [navT('max-width'), navT('border-radius')].join(', '),
        }}>
          {/* Pill BG */}
          <div style={{
            position: 'absolute', inset: 0,
            background: isDark ? 'rgba(8,8,8,0.92)' : 'rgba(246,246,246,0.94)',
            backdropFilter: 'blur(28px) saturate(1.9)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
            borderRadius: 'inherit',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
            boxShadow: '0 4px 36px rgba(0,0,0,0.14)',
            opacity: isScrolled ? 1 : 0,
            transition: navT('opacity'),
          }} />

          {/* Invisible content for perfect sizing */}
          <div style={{
            position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: isScrolled ? '10px 28px' : '22px 36px', transition: navT('padding'), visibility: 'hidden'
          }}>
            <div style={{ fontSize: isScrolled ? '1.12rem' : '1.35rem', transition: navT('font-size') }}>Amal.</div>
            <div className="hidden md:flex" style={{ gap: isScrolled ? 4 : 32, transition: navT('gap') }}>
              {([['Experience','#about'],['Stack','#tech-stack'],['Work','#portfolio'],['Services','#services'],['Contact','#contact']] as [string,string][]).map(([label]) => (
                <span key={label} style={{ padding: isScrolled ? '6px 14px' : '0', fontSize: isScrolled ? '0.72rem' : '0.78rem' }}>{label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: isScrolled ? 8 : 10, transition: navT('gap') }}>
              <div style={{ width: isScrolled ? 34 : 40, height: isScrolled ? 34 : 40, transition: `width ${NAV_DUR}, height ${NAV_DUR}` }} />
              <div className="md:hidden" style={{ width: isScrolled ? 34 : 40, height: isScrolled ? 34 : 40, transition: `width ${NAV_DUR}, height ${NAV_DUR}` }} />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Layer 2: Content (Mix Blend Mode) ── */}
      <nav style={{
        position: 'fixed',
        top: isScrolled ? 14 : 0,
        left: 0, right: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        padding: isScrolled ? '0 18px' : '0',
        background: 'transparent',
        pointerEvents: 'none',
        mixBlendMode: isScrolled ? 'normal' : 'difference',
        transition: [navT('top'), navT('padding')].join(', '),
      }}>
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: isScrolled ? 760 : 4000,
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'auto',
          transition: [navT('max-width')].join(', '),
        }}>
          {/* Content row */}
          <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isScrolled ? '10px 28px' : '22px 36px',
            transition: navT('padding'),
          }}>
            {/* Logo */}
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: isScrolled ? '1.12rem' : '1.35rem',
                fontWeight: 900,
                letterSpacing: '-.03em',
                color: (!isScrolled || isDark) ? '#fff' : '#111',
                userSelect: 'none',
                cursor: 'pointer',
                transition: navT('font-size'),
              }}
            >
              <span style={{ color: (!isScrolled || isDark) ? ORANGE : BLUE }}>A</span>mal.
            </div>

            {/* Desktop links */}
            <div
              className="hidden md:flex items-center"
              style={{ gap: isScrolled ? 4 : 32, transition: navT('gap') }}
            >
              {([['Experience','#about'],['Stack','#tech-stack'],['Work','#portfolio'],['Services','#services'],['Contact','#contact']] as [string,string][]).map(([label, href]) => {
                const sid = href.slice(1)
                const isActive = activeSection === sid
                const baseColor = (!isScrolled || isDark) ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.72)'
                const blendAccent = (!isScrolled || isDark) ? ORANGE : BLUE
                return (
                  <a key={label} href={href}
                    style={{
                      ...navLinkStyle,
                      fontSize: isScrolled ? '0.72rem' : '0.78rem',
                      color: isActive ? blendAccent : baseColor,
                      padding: isScrolled ? '6px 14px' : '0',
                      borderRadius: isScrolled ? 999 : 0,
                      background: isActive && isScrolled ? `${accent}22` : 'transparent',
                      transition: 'font-size 0.35s ease, padding 0.35s ease, border-radius 0.35s ease, background 0.35s ease, opacity 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.55' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  >{label}</a>
                )
              })}
            </div>

            {/* Right controls */}
            <div style={{
              display: 'flex',
              gap: isScrolled ? 8 : 10,
              alignItems: 'center',
              transition: navT('gap'),
            }}>
              {/* Theme toggle */}
              {mounted && (
                <button onClick={handleTheme}
                  style={{
                    width: isScrolled ? 34 : 40,
                    height: isScrolled ? 34 : 40,
                    borderRadius: '50%',
                    background: (!isScrolled || isDark) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    border: `1px solid ${(!isScrolled || isDark) ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: `width ${NAV_DUR} ${NAV_EASE}, height ${NAV_DUR} ${NAV_EASE}, border 0.4s ease, background 0.4s ease`,
                    animation: hasToggledTheme ? 'none' : 'occasionalWiggle 8s ease-in-out infinite',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(128,128,128,0.18)'; e.currentTarget.style.animation = 'none' }}
                  onMouseLeave={e => { e.currentTarget.style.background = (!isScrolled || isDark) ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; if (!hasToggledTheme) e.currentTarget.style.animation = 'occasionalWiggle 8s ease-in-out infinite' }}
                >
                  <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', transition: 'all .5s cubic-bezier(0.4,0,0.2,1)', opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)' }}>
                      <Moon size={16} color={(!isScrolled || isDark) ? '#ccc' : '#555'} strokeWidth={2} />
                    </div>
                    <div style={{ position: 'absolute', transition: 'all .5s cubic-bezier(0.4,0,0.2,1)', opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(90deg) scale(0)' : 'rotate(0deg) scale(1)' }}>
                      <Sun size={16} color={(!isScrolled || isDark) ? '#ccc' : '#555'} strokeWidth={2} />
                    </div>
                  </div>
                </button>
              )}

              {/* Hamburger — mobile only */}
              <div className="md:hidden">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  style={{ width: isScrolled ? 34 : 40, height: isScrolled ? 34 : 40, borderRadius: '50%', background: (!isScrolled || isDark) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', border: `1px solid ${(!isScrolled || isDark) ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: `width ${NAV_DUR} ${NAV_EASE}, height ${NAV_DUR} ${NAV_EASE}` }}
                >
                  {isMobileMenuOpen
                    ? <X size={15} color={(!isScrolled || isDark) ? '#fff' : '#111'} />
                    : <Menu size={15} color={(!isScrolled || isDark) ? '#fff' : '#111'} />}
                </button>
              </div>
            </div>

          </div>{/* /content-wrapper */}
        </div>{/* /pill-container */}
      </nav>

      {/* ── Mobile overlay ── */}
      {isMobileMenuOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          className="md:hidden" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 80 }}
          onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* ── Mobile panel ── */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: isMobileMenuOpen ? '0%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="md:hidden"
        style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: 280, maxWidth: '85vw', background: 'rgba(6,6,6,0.95)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 90 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '16px' }}>
            <button onClick={() => setIsMobileMenuOpen(false)} style={circleBtn}><X size={15} color="white" /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0 24px 24px', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#fff' }}>
              {([['Experience','#about'],['Stack','#tech-stack'],['Work','#portfolio'],['Services','#services'],['Contact','#contact']] as [string,string][]).map(([label, href]) => (
                <a key={label} href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ ...navLinkStyle, display: 'block', padding: '12px 16px', borderRadius: 8, fontSize: '1rem', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >{label}</a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Hero content — centered, mix-blend-mode:difference ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 24px', zIndex: 10, pointerEvents: 'none', mixBlendMode: 'difference' }}>

        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.62rem', letterSpacing: '0.25em', color: '#fff', textTransform: 'uppercase', marginBottom: 22, opacity: 0, animation: 'heroRiseIn .8s ease forwards .1s' }}>
          CS Engineer &amp; Developer
        </p>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(2rem,6vw,4.8rem)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-.04em', color: '#fff', marginBottom: 18, opacity: 0, animation: 'heroRiseIn .8s ease forwards .3s', wordBreak: 'break-word', padding: '0 10px' }}>
          Hi, I'm{' '}
          <span style={{ color: ORANGE, display: 'inline-block', mixBlendMode: 'exclusion' }}>Amal Tom</span>
        </h1>

        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(0.95rem,2.4vw,1.75rem)', fontWeight: 800, lineHeight: 1.5, letterSpacing: '-.02em', color: '#fff', opacity: 0, animation: 'heroRiseIn .8s ease forwards .5s', pointerEvents: 'auto' }}>
          <span style={{ display: 'block' }}>
            <span className="hero-phrase">CS Engineer by degree</span>
            <span style={{ color: ORANGE, mixBlendMode: 'exclusion' }}>,</span>
          </span>
          <span style={{ display: 'block' }}>
            <span className="hero-phrase">problem-solver by instinct</span>
            <span style={{ color: ORANGE, mixBlendMode: 'exclusion' }}>,</span>
          </span>
          <span style={{ display: 'block' }}>
            <span className="hero-phrase">builder by passion</span>
            <span style={{ display: 'inline-block', width: 2, height: '0.78em', background: ORANGE, marginLeft: 3, verticalAlign: 'middle', borderRadius: 1, animation: 'heroBlink 1.1s step-end infinite', mixBlendMode: 'exclusion' }} />
          </span>
        </div>
      </div>

      {/* ── Scroll hint — bottom center ── */}
      <div style={{ position: 'absolute', bottom: 28, left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none', mixBlendMode: 'difference' }}>
        <div
          onClick={() => {
            // Release lock first, then scroll immediately — no RAF/setTimeout needed
            setIsHeroLocked(false)
            const next = document.getElementById('about') || document.getElementById('portfolio')
            if (next) {
              next.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else {
              window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })
            }
          }}
          className="cursor-pointer"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            opacity: 0, animation: 'heroRiseIn .8s ease forwards 1.3s',
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => { const cur = cursorRef.current; if (cur) { cur.style.width = cur.style.height = '15px' } }}
          onMouseLeave={() => { const cur = cursorRef.current; if (cur) { cur.style.width = cur.style.height = '7px'  } }}
        >
          <motion.div
             animate={{ y: [0, 4, 0] }}
             transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
             className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </motion.div>
          <span className="hidden md:inline" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.22em', paddingLeft: '0.22em', color: '#fff', textTransform: 'uppercase' }}>Scroll</span>
          <span className="md:hidden" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.52rem', letterSpacing: '0.22em', paddingLeft: '0.22em', color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Tap to Explore</span>
        </div>
      </div>

    </div>
  )
}
