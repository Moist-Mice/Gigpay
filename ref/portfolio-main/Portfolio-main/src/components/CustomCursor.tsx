'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

/**
 * GlobalCustomCursor
 * ─────────────────
 * A site-wide custom cursor that:
 *  • Small crisp dot (direct position — no lag)
 *  • Larger soft ring that lags behind with lerp (premium feel)
 *  • Theme-aware accent: orange (dark) / blue (light)
 *  • Enlarges on interactive elements automatically
 *  • Zoom-mode: ring expands + shows ＋/− label when scroll-zoom is active
 *  • Hidden on coarse-pointer (touch) devices via .hide-on-touch CSS
 *  • Fades out when mouse leaves the browser window
 */
export function CustomCursor() {
  const dotRef    = useRef<HTMLDivElement>(null)
  const ringRef   = useRef<HTMLDivElement>(null)
  const labelRef  = useRef<HTMLSpanElement>(null)
  const { resolvedTheme } = useTheme()

  // ── Mouse tracking + ring animation ──────────────────────────────────────
  useEffect(() => {
    const dot   = dotRef.current
    const ring  = ringRef.current
    const label = labelRef.current
    if (!dot || !ring || !label) return

    let mouseX = -300, mouseY = -300
    let ringX  = -300, ringY  = -300
    let rafId  = 0
    let isHovering = false
    let isZoomMode = false
    let lastDeltaSign = 0   // track scroll direction for ＋/−

    // ── State applier — single source of truth for ring sizing ─────────────
    const applyRingState = () => {
      if (isZoomMode) {
        dot.style.width  = dot.style.height  = '9px'
        ring.style.width = ring.style.height = '48px'
        ring.style.opacity = '0.65'
        ring.style.borderWidth = '2px'
        ring.style.animation = 'cursorZoomPulse 1.6s ease-in-out infinite'
        label.style.opacity = '1'
      } else if (isHovering) {
        dot.style.width  = dot.style.height  = '11px'
        ring.style.width = ring.style.height = '38px'
        ring.style.opacity = '0.45'
        ring.style.borderWidth = '1.5px'
        ring.style.animation = 'none'
        label.style.opacity = '0'
      } else {
        dot.style.width  = dot.style.height  = '7px'
        ring.style.width = ring.style.height = '24px'
        ring.style.opacity = '0.22'
        ring.style.borderWidth = '1.5px'
        ring.style.animation = 'none'
        label.style.opacity = '0'
      }
    }

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.left = mouseX + 'px'
      dot.style.top  = mouseY + 'px'

      if (!isZoomMode) {
        // Auto-detect interactive elements (skip in zoom mode — ring stays big)
        const target = e.target as HTMLElement
        const hit = target.closest(
          'a, button, [role="button"], input, textarea, select, label, [tabindex], .cursor-pointer'
        )
        if (hit && !isHovering) { isHovering = true;  applyRingState() }
        else if (!hit && isHovering) { isHovering = false; applyRingState() }
      }
    }

    // Lerp ring to follow the dot with slight lag
    const tick = () => {
      ringX += (mouseX - ringX) * 0.11
      ringY += (mouseY - ringY) * 0.11
      ring.style.left = ringX + 'px'
      ring.style.top  = ringY + 'px'
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const onLeave = () => { dot.style.opacity = '0'; ring.style.opacity = '0' }
    const onEnter = () => {
      dot.style.opacity = '1'
      applyRingState()
    }

    // ── Zoom mode event from SkillsCanvas ───────────────────────────────────
    const onZoomMode = (e: Event) => {
      const { active } = (e as CustomEvent).detail as { active: boolean }
      isZoomMode = active
      label.textContent = '⊕'
      applyRingState()
    }

    // Show ＋/− in cursor label while scrolling in zoom mode
    const onWheel = (e: WheelEvent) => {
      if (!isZoomMode) return
      const newSign = e.deltaY > 0 ? 1 : -1
      if (newSign !== lastDeltaSign) {
        lastDeltaSign = newSign
        label.textContent = newSign > 0 ? '−' : '＋'
        // Bounce the ring briefly
        ring.style.transform = 'translate(-50%,-50%) scale(1.22)'
        setTimeout(() => { ring.style.transform = 'translate(-50%,-50%) scale(1)' }, 180)
      }
    }

    window.addEventListener('mousemove',  onMove)
    window.addEventListener('wheel',      onWheel, { passive: true })
    window.addEventListener('skillsZoomMode', onZoomMode)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    return () => {
      window.removeEventListener('mousemove',  onMove)
      window.removeEventListener('wheel',      onWheel)
      window.removeEventListener('skillsZoomMode', onZoomMode)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      cancelAnimationFrame(rafId)
    }
  }, []) // runs once — refs are guaranteed to be set since we always render

  // ── Update accent colour reactively when theme changes ────────────────────
  useEffect(() => {
    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return
    const accent = resolvedTheme === 'light' ? '#0094E5' : '#FF6B1A'
    dot.style.background   = accent
    ring.style.borderColor = accent
    if (labelRef.current) labelRef.current.style.color = accent
  }, [resolvedTheme])

  // ─────────────────────────────────────────────────────────────────────────
  const base: React.CSSProperties = {
    position:      'fixed',
    pointerEvents: 'none',
    zIndex:        99999,
    borderRadius:  '50%',
    transform:     'translate(-50%, -50%)',
    left:          -300,
    top:           -300,
  }

  return (
    <>
      {/* Inject keyframe for zoom pulse into head once */}
      <style>{`
        @keyframes cursorZoomPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.65; }
          50%       { transform: translate(-50%,-50%) scale(1.18); opacity: 0.85; }
        }
      `}</style>

      {/* Dot — snaps directly to pointer */}
      <div
        ref={dotRef}
        className="hide-on-touch"
        style={{
          ...base,
          width:        7,
          height:       7,
          background:   '#FF6B1A',
          mixBlendMode: 'difference',
          transition:   'width 0.15s ease, height 0.15s ease, background 0.35s ease',
        }}
      />

      {/* Ring — lags behind for that premium "trailing" feel */}
      <div
        ref={ringRef}
        className="hide-on-touch"
        style={{
          ...base,
          width:        24,
          height:       24,
          border:       '1.5px solid #FF6B1A',
          opacity:      0.22,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          transition:   'width 0.22s cubic-bezier(0.22,1,0.36,1), height 0.22s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease, border-color 0.35s ease, border-width 0.2s ease, transform 0.18s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Zoom mode label inside the ring */}
        <span
          ref={labelRef}
          style={{
            fontSize:       13,
            fontWeight:     700,
            color:          '#FF6B1A',
            opacity:        0,
            transition:     'opacity 0.2s ease, color 0.35s ease',
            userSelect:     'none',
            lineHeight:     1,
            letterSpacing:  '-0.02em',
          }}
        >⊕</span>
      </div>
    </>
  )
}
