'use client'
import { useEffect, useRef, useState } from 'react'
import { animFns } from './ServicesAnims'
import { svgWEB, svgAI, svgDESIGN } from './ServicesSVG1'
import { svgSECURITY, svgAUTOMATION, svgDATABASE } from './ServicesSVG2'
import { ScrambleHeading } from './ScrambleHeading'

// ── Responsive helper ─────────────────────────────────────
function useIsMobile() {
  const [v, setV] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const fn = () => setV(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return v
}


const SVC = [
  { num:'01', title:'Full-Stack\nWeb Development',  tag:'Engineering',  sub:'End-to-end architecture',           desc:'Architecting complete products — from database schema to polished UI. React, Node.js, Flask, and MongoDB, unified into systems that are fast, maintainable, and built to grow.', stack:['React','Node.js','Flask','MongoDB','REST APIs','TypeScript'], vis:'web'        },
  { num:'02', title:'AI & ML\nIntegration',         tag:'Intelligence', sub:'Models that do real work',          desc:'Embedding intelligence where it counts. NLP pipelines, RAG systems, and conversational AI that integrate cleanly into real products — not just demos.',                        stack:['NLP','LLMs','Python','TensorFlow','VoiceSQL','RAG'],           vis:'ai'         },
  { num:'03', title:'UI/UX\nDesign',                tag:'Design',       sub:'Purposeful, pixel-precise',         desc:'Design that earns trust before a word is read. Every screen is considered from the first wireframe — purposeful hierarchy, clear interactions, nothing wasted.',             stack:['Figma','Wireframing','Prototyping','Design Systems','Research'],vis:'design'     },
  { num:'04', title:'Cybersecurity\nConsulting',    tag:'Security',     sub:'Finding cracks before attackers do',desc:'Systematic vulnerability analysis, injection testing, and hardening recommendations — backed by Google Cybersecurity certification.',                                        stack:['Pen Testing','OWASP','SQLi','Auditing','Risk Analysis'],        vis:'security'   },
  { num:'05', title:'System & Task\nAutomation',    tag:'Automation',   sub:'Pipelines that run while you sleep',desc:'Turning repetitive processes into scheduled pipelines. Bash scripts, cron jobs, and CI/CD workflows that execute reliably and free up time for work that actually matters.',stack:['Bash','Python','Cron','CI/CD','Linux','Workflows'],             vis:'automation' },
  { num:'06', title:'Database Design\n& Management',tag:'Data',         sub:'Schemas that hold up under load',   desc:'Thoughtful data modelling across MongoDB, MySQL, and PostgreSQL — indexed correctly, queried efficiently, and built to last.',                                               stack:['MongoDB','MySQL','PostgreSQL','Schema Design','Optimisation'],  vis:'database'   },
]

const svgFns: Record<string,()=>string> = { web:svgWEB, ai:svgAI, design:svgDESIGN, security:svgSECURITY, automation:svgAUTOMATION, database:svgDATABASE }

export function Services() {
  const isMobile    = useIsMobile()
  const trackRef    = useRef<HTMLDivElement>(null)
  const spineRef    = useRef<HTMLDivElement>(null)
  const pgRunRef    = useRef<HTMLDivElement>(null)
  const numGhostRef = useRef<HTMLSpanElement>(null)
  const numColorRef = useRef<HTMLSpanElement>(null)
  const nameRef     = useRef<HTMLDivElement>(null)
  const tagRef      = useRef<HTMLDivElement>(null)
  const subRef      = useRef<HTMLDivElement>(null)
  const counterRef  = useRef<HTMLDivElement>(null)
  const panelRefs   = useRef<(HTMLDivElement|null)[]>([])
  const dotRefs     = useRef<(HTMLDivElement|null)[]>([])
  const curIdx      = useRef(-1)
  const [themeKey, setThemeKey] = useState(0)
  const [, forceRender] = useState(0)

  const pr = 'var(--primary)'
  const fg = 'var(--foreground)'
  const bg = 'var(--background)'
  const bd = 'var(--border)'
  const mf = 'var(--muted-foreground)'
  const fmix = (p: number) => `color-mix(in srgb, var(--foreground) ${p}%, transparent)`

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeKey(k => k + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const track = trackRef.current; if (!track) return
    track.style.height = `${(SVC.length + 1) * 75}vh`

    const update = () => {
      const rect     = track.getBoundingClientRect()
      if (!rect.height) return
      const scrolled = Math.max(0, -rect.top)
      const activeH  = SVC.length * (rect.height / (SVC.length + 1))
      const sH       = activeH / SVC.length
      const raw      = sH > 0 ? scrolled / sH : 0
      const idx      = Math.max(0, Math.min(SVC.length - 1, Math.floor(raw)))
      const frac     = Math.max(0, Math.min(1, raw - idx))
      const tp       = (idx + frac) / SVC.length

      if (spineRef.current)    spineRef.current.style.height    = `${(tp * 100).toFixed(2)}%`
      if (pgRunRef.current)    pgRunRef.current.style.width     = `${(frac * 100).toFixed(2)}%`
      // Per-frame clip: always runs, no suppression guard needed
      if (numColorRef.current)
        numColorRef.current.style.clipPath = `inset(0 ${((1 - frac) * 100).toFixed(2)}% 0 0)`

      if (idx !== curIdx.current) {
        curIdx.current = idx
        const s = SVC[idx]

        // ── Number: update immediately, reset clip to 0, NO opacity fade.
        // This ensures the fill is always perfectly scroll-linked with no jump.
        if (numGhostRef.current) {
          numGhostRef.current.textContent = s.num
          numGhostRef.current.style.opacity = '1'
        }
        if (numColorRef.current) {
          numColorRef.current.textContent = s.num
          numColorRef.current.style.clipPath = 'inset(0 100% 0 0)'  // start empty
          numColorRef.current.style.opacity = '1'
        }
        if (nameRef.current)    nameRef.current.innerHTML = s.title.replace('\n', '<br/>')
        if (counterRef.current) counterRef.current.textContent = `${s.num} / 0${SVC.length}`

        // ── Tag + sub: short opacity fade (they're small, looks nice)
        if (tagRef.current) {
          tagRef.current.style.opacity = '0'
          setTimeout(() => { if (tagRef.current) { tagRef.current.textContent = s.tag; tagRef.current.style.opacity = '1' } }, 120)
        }
        if (subRef.current) {
          subRef.current.style.opacity = '0'
          setTimeout(() => { if (subRef.current) { subRef.current.textContent = s.sub; subRef.current.style.opacity = '1' } }, 140)
        }

        panelRefs.current.forEach((p, i) => {
          if (!p) return
          p.style.opacity = i === idx ? '1' : '0'
          p.style.pointerEvents = i === idx ? 'auto' : 'none'
        })
        dotRefs.current.forEach((d, i) => {
          if (!d) return
          d.style.background = i === idx ? 'var(--primary)' : fmix(14)
          d.style.transform  = i === idx ? 'scale(1.5)' : 'scale(1)'
        })
      }

      // ── KEY: call animation function on EVERY scroll with current frac ──
      const fn = animFns[SVC[idx].vis]
      if (fn) fn(frac)
    }

      // Also reinitialise when the window is resized so the desktop
      // section re-measures itself correctly after going mobile→desktop
      const onResize = () => {
        if (!trackRef.current) return
        trackRef.current.style.height = `${(SVC.length + 1) * 75}vh`
        update()
      }
      window.addEventListener('resize', onResize)

    let raf: number
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    // init
    if (tagRef.current)  tagRef.current.style.opacity  = '1'
    if (subRef.current)  subRef.current.style.opacity  = '1'
    update()
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])

  const s0 = SVC[0]

  return (
    <div style={{ background: bg, color: fg, fontFamily: "'DM Mono',monospace" }}>

      <div className="container mx-auto px-6 sm:px-8 lg:px-12" style={{ paddingTop: '80px' }}>
        <ScrambleHeading label="What I Do" plain="Services &" accent="Expertise" />
      </div>

      {/* MOBILE card list — always in DOM, shown/hidden via display */}
      <div style={{ display: isMobile ? 'block' : 'none', padding: '24px 20px 64px' }}>
          {SVC.map((s, i) => (
            <div key={i} style={{
              borderTop: `1px solid ${bd}`,
              paddingTop: 24,
              paddingBottom: 28,
              marginBottom: i < SVC.length - 1 ? 4 : 0,
            }}>
              {/* Number + tag row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 900, letterSpacing: '-.06em', color: pr, lineHeight: 1 }}>{s.num}</span>
                <span style={{ fontSize: 8, letterSpacing: '.22em', textTransform: 'uppercase', color: pr, opacity: 0.75 }}>{s.tag}</span>
              </div>
              {/* Title */}
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.15, color: fg, marginBottom: 10 }}
                dangerouslySetInnerHTML={{ __html: s.title.replace('\n', ' ') }} />
              {/* Sub */}
              <div style={{ fontSize: 9.5, color: pr, letterSpacing: '.05em', marginBottom: 10, opacity: 0.85 }}>{s.sub}</div>
              {/* Desc */}
              <p style={{ fontSize: 12, lineHeight: 1.8, color: mf, marginBottom: 14 }}>{s.desc}</p>
              {/* Stack chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {s.stack.map(t => (
                  <span key={t} style={{ fontSize: 8, letterSpacing: '.04em', padding: '3px 10px', border: `1px solid ${bd}`, borderRadius: 999, color: mf }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
      </div> {/* end mobile card list */}

      {/* DESKTOP sticky scroll — always in DOM, shown/hidden via display.
          This keeps trackRef mounted so the useEffect runs on load regardless
          of viewport size, fixing the resize-to-desktop blank animation bug. */}
      <div style={{ display: isMobile ? 'none' : 'block' }}>
      <div ref={trackRef} style={{ position:'relative' }}>
      {/* Sticky track: top offset = nav height (60px) so content clears the fixed nav */}
        <div style={{ position:'sticky', top:0, height:'100vh', display:'flex', overflow:'hidden', paddingTop:'60px' }}>

          {/* Spine */}
          <div style={{ position:'absolute', left:72, top:0, bottom:0, width:1, background:bd, zIndex:5, pointerEvents:'none' }}>
            <div ref={spineRef} style={{ position:'absolute', top:0, left:0, right:0, background:pr, height:'0%', transition:'height .05s linear' }} />
          </div>

          {/* Left col */}
          <div style={{ width:'46%', flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 48px 0 96px', position:'relative' }}>

            <div ref={tagRef} style={{ fontSize:8.5, letterSpacing:'.24em', textTransform:'uppercase', color:pr, marginBottom:10, display:'flex', alignItems:'center', gap:10, opacity:1, transition:'opacity .35s ease' }}>
              <span style={{ width:18, height:1, background:pr, opacity:.5, flexShrink:0, display:'inline-block' }} />{s0.tag}
            </div>

            <div style={{ position:'relative', lineHeight:.85, userSelect:'none' }}>
              <span ref={numGhostRef} style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(52px,7vw,88px)', fontWeight:900, letterSpacing:'-.06em', color:'transparent', WebkitTextStroke:`1px ${fmix(6)}`, display:'block', transition:'opacity .2s' }}>{s0.num}</span>
              <span ref={numColorRef} style={{ position:'absolute', inset:0, fontFamily:"'Syne',sans-serif", fontSize:'clamp(52px,7vw,88px)', fontWeight:900, letterSpacing:'-.06em', color:pr, display:'block', clipPath:'inset(0 0% 0 0)', transition:'opacity .2s' }}>{s0.num}</span>
            </div>

            <div style={{ width:'100%', height:1, background:`linear-gradient(to right,color-mix(in srgb,var(--primary) 25%,transparent),transparent)`, margin:'12px 0 14px' }} />

            <div ref={nameRef} style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(16px,2vw,26px)', fontWeight:700, letterSpacing:'-.03em', lineHeight:1.18, color:fg, maxWidth:300 }}
              dangerouslySetInnerHTML={{ __html: s0.title.replace('\n','<br/>') }} />

            <div ref={subRef} style={{ marginTop:10, fontSize:10, lineHeight:1.75, color:mf, maxWidth:280, opacity:1, transition:'opacity .4s .1s' }}>{s0.sub}</div>

            <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:52, height:1, background:fmix(8), position:'relative', flexShrink:0 }}>
                <div ref={pgRunRef} style={{ position:'absolute', top:0, left:0, bottom:0, background:pr, width:'0%' }} />
              </div>
              <div ref={counterRef} style={{ fontSize:8.5, letterSpacing:'.12em', color:fmix(18) }}>01 / 06</div>
            </div>

            {/* Dot nav */}
            <div style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:9 }}>
              {SVC.map((s, i) => (
                <div key={i} ref={el => { dotRefs.current[i] = el }} title={s.title.replace('\n',' ')}
                  onClick={() => {
                    const track = trackRef.current; if (!track) return
                    const tTop = track.getBoundingClientRect().top + window.scrollY
                    window.scrollTo({ top: tTop + i * (track.offsetHeight / (SVC.length+1)) + 4, behavior:'smooth' })
                  }}
                  style={{ width:4, height:4, borderRadius:'50%', background: i===0 ? pr : fmix(14), cursor:'pointer', transition:'background .3s,transform .3s', transform: i===0?'scale(1.5)':'scale(1)' }} />
              ))}
            </div>
          </div>

          {/* Right col — panels with dangerouslySetInnerHTML SVGs */}
          <div style={{ width:'54%', flexShrink:0, position:'relative', borderLeft:`1px solid ${bd}`, overflow:'hidden' }}>
            {SVC.map((s, i) => (
              <div key={i} ref={el => { panelRefs.current[i] = el }}
                style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', opacity: i===0?1:0, pointerEvents: i===0?'auto':'none', transition:'opacity .3s ease' }}>
                <div style={{ flexShrink:0, padding:'32px 48px 24px 44px', borderBottom:`1px solid ${bd}` }}>
                  <div style={{ fontSize:8.5, letterSpacing:'.22em', textTransform:'uppercase', color:pr, marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
                    {s.tag}<span style={{ width:18, height:1, background:pr, opacity:.4, display:'inline-block' }} />
                  </div>
                  <p style={{ fontSize:'clamp(11px,1vw,13px)', lineHeight:1.9, color:mf, marginBottom:14, maxWidth:380 }}>{s.desc}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {s.stack.map(t => (
                      <span key={t} style={{ fontSize:8, letterSpacing:'.04em', padding:'3px 9px', border:`1px solid ${bd}`, borderRadius:999, color:mf, cursor:'default', transition:'border-color .22s,color .22s' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.borderColor='var(--primary)'; (e.target as HTMLElement).style.color='var(--primary)' }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.borderColor=''; (e.target as HTMLElement).style.color='' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ flex:1, minHeight:0, display:'flex', alignItems:'center', justifyContent:'center', padding:'10px 32px' }}>
                  <div key={`${s.vis}-${themeKey}`} className="svc-viz" style={{ width:'100%', maxWidth:500 }} dangerouslySetInnerHTML={{ __html: svgFns[s.vis]() }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div> {/* end desktop sticky scroll wrapper */}

      {/* Footer */}
      <div style={{ padding: isMobile ? '32px 20px 48px' : '48px 72px 72px', display:'flex', alignItems:'center', gap:12, opacity:.22 }}>
        <div style={{ flex:1, height:1, background:bd }} />
        <span style={{ fontSize:9, letterSpacing:'.18em', textTransform:'uppercase', color:mf, whiteSpace:'nowrap' }}>6 disciplines · available for projects</span>
        <div style={{ flex:1, height:1, background:bd }} />
      </div>
    </div>
  )
}
