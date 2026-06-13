'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { ScrambleHeading } from './ScrambleHeading'

// Lightweight responsive hook — no layout thrash
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ── CDN helpers ──────────────────────────────────────────
const DV = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/'
const SI = 'https://cdn.simpleicons.org/'
const dv = (p: string) => DV + p
const si = (n: string, h: string) => `${SI}${n}/${h}`

type Chip = { name: string; src: string; color: string }
const rows: { label: string; chips: Chip[]; rev?: boolean; slow?: boolean }[] = [
  { label: 'Frontend', chips: [
    { name: 'React',      src: dv('react/react-original.svg'),            color: '#61dafb' },
    { name: 'TypeScript', src: dv('typescript/typescript-original.svg'),   color: '#3178c6' },
    { name: 'JavaScript', src: dv('javascript/javascript-original.svg'),   color: '#f7df1e' },
    { name: 'HTML5',      src: dv('html5/html5-original.svg'),             color: '#e34f26' },
    { name: 'CSS3',       src: dv('css3/css3-original.svg'),               color: '#1572b6' },
    { name: 'Tailwind',   src: dv('tailwindcss/tailwindcss-original.svg'), color: '#38bdf8' },
    { name: 'Next.js',    src: dv('nextjs/nextjs-original.svg'),           color: '#ffffff' },
    { name: 'Sass',       src: dv('sass/sass-original.svg'),               color: '#cc6699' },
  ]},
  { label: 'Backend', rev: true, chips: [
    { name: 'Python',  src: dv('python/python-original.svg'),   color: '#ffd343' },
    { name: 'Flask',   src: dv('flask/flask-original.svg'),     color: '#ffffff' },
    { name: 'Django',  src: dv('django/django-plain.svg'),      color: '#44b78b' },
    { name: 'Node.js', src: dv('nodejs/nodejs-original.svg'),   color: '#68a063' },
    { name: 'Express', src: dv('express/express-original.svg'), color: '#ffffff' },
    { name: 'Java',    src: dv('java/java-original.svg'),       color: '#ed8b00' },
    { name: 'FastAPI', src: dv('fastapi/fastapi-original.svg'), color: '#009688' },
    { name: 'GraphQL', src: dv('graphql/graphql-plain.svg'),    color: '#e535ab' },
  ]},
  { label: 'Databases', slow: true, chips: [
    { name: 'MongoDB',    src: dv('mongodb/mongodb-original.svg'),       color: '#4db33d' },
    { name: 'PostgreSQL', src: dv('postgresql/postgresql-original.svg'), color: '#336791' },
    { name: 'MySQL',      src: dv('mysql/mysql-original.svg'),           color: '#00758f' },
    { name: 'Redis',      src: dv('redis/redis-original.svg'),           color: '#ff4438' },
    { name: 'SQLite',     src: dv('sqlite/sqlite-original.svg'),         color: '#0f80cc' },
    { name: 'Supabase',   src: si('supabase', '3ecf8e'),                 color: '#3ecf8e' },
  ]},
  { label: 'AI & Data', rev: true, chips: [
    { name: 'TensorFlow',   src: dv('tensorflow/tensorflow-original.svg'), color: '#ff6f00' },
    { name: 'scikit-learn', src: si('scikitlearn', 'f7931e'),              color: '#f7931e' },
    { name: 'Groq',         src: si('groq', 'f55036'),                     color: '#f55036' },
    { name: 'Claude',       src: si('anthropic', 'd4a574'),                color: '#d4a574' },
    { name: 'Jupyter',      src: dv('jupyter/jupyter-original.svg'),       color: '#f37626' },
    { name: 'Tableau',      src: si('tableau', 'e97627'),                  color: '#e97627' },
  ]},
  { label: 'Cloud & DevOps', slow: true, chips: [
    { name: 'AWS',            src: dv('amazonwebservices/amazonwebservices-original-wordmark.svg'), color: '#ff9900' },
    { name: 'Docker',         src: dv('docker/docker-original.svg'),           color: '#2496ed' },
    { name: 'Kubernetes',     src: dv('kubernetes/kubernetes-original.svg'),   color: '#326de6' },
    { name: 'Vercel',         src: si('vercel', 'ffffff'),                     color: '#ffffff' },
    { name: 'GitHub Actions', src: dv('githubactions/githubactions-original.svg'), color: '#2088ff' },
    { name: 'Azure',          src: dv('azure/azure-original.svg'),             color: '#0089d6' },
  ]},
  { label: 'Dev Tools', rev: true, slow: true, chips: [
    { name: 'VS Code', src: dv('vscode/vscode-original.svg'), color: '#007acc' },
    { name: 'Git',     src: dv('git/git-original.svg'),       color: '#f05032' },
    { name: 'GitHub',  src: dv('github/github-original.svg'), color: '#ffffff' },
    { name: 'Postman', src: dv('postman/postman-original.svg'),color: '#ff6c37' },
    { name: 'Figma',   src: dv('figma/figma-original.svg'),   color: '#a259ff' },
    { name: 'Linux',   src: dv('linux/linux-original.svg'),   color: '#fcc624' },
  ]},
]
const speeds = [22, 28, 34, 28, 34, 34]

function SkillChip({ chip }: { chip: Chip }) {
  return (
    <div className="skill-chip" style={{ '--c': chip.color } as React.CSSProperties}>
      <span className="skill-chip-logo">
        <img src={chip.src} alt={chip.name} width={18} height={18} loading="lazy"
          onError={(e) => {
            const img = e.currentTarget; const wrap = img.parentElement!
            wrap.style.cssText = `width:20px;font-size:10px;font-weight:700;letter-spacing:-0.03em;color:${chip.color};display:flex;align-items:center;justify-content:center;`
            wrap.textContent = chip.name.slice(0, 3).toUpperCase()
          }} />
      </span>
      <span className="skill-chip-label">{chip.name}</span>
    </div>
  )
}

function MarqueeRow({ chips, rev, speed }: { chips: Chip[]; rev: boolean; speed: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const speedMult = useRef(1)
  const doubled = [...chips, ...chips]
  useEffect(() => {
    const el = trackRef.current; if (!el) return
    let pos = 0, halfW = 0, lastTs: number | undefined, raf: number
    const tick = (ts: number) => {
      if (lastTs === undefined) { halfW = el.offsetWidth / 2; pos = rev ? -halfW : 0; lastTs = ts }
      const dt = Math.min((ts - lastTs) / 1000, 0.05); lastTs = ts
      const pxPerSec = halfW / speed
      pos += (rev ? 1 : -1) * pxPerSec * speedMult.current * dt
      if (!rev && pos <= -halfW) pos += halfW
      if (rev && pos >= 0) pos -= halfW
      el.style.transform = `translateX(${pos}px)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [speed, rev])
  return (
    <div className="marquee-row" onMouseEnter={() => { speedMult.current = 0.33 }} onMouseLeave={() => { speedMult.current = 1 }}>
      <div ref={trackRef} className="marquee-track" style={{ animation: 'none' }}>
        {doubled.map((chip, i) => <SkillChip key={`${chip.name}-${i}`} chip={chip} />)}
      </div>
    </div>
  )
}

// ── Experience & Education data ───────────────────────────
interface Metric { value: string; label: string; target?: number; suffix?: string }
interface Entry {
  id: string; year: string; range: string; location: string
  org: string; role: string; headline: string; emPhrase?: string
  bullets: string[]; chips: string[]; metrics: Metric[]
  isEducation?: boolean
}

const entries: Entry[] = [
  {
    id: 'e0', year: '2026', range: 'Mar –\nPresent', location: 'Remote',
    org: 'Proddy AI', role: 'AI Engineer',
    headline: 'Fixed the Composio integration — the product now talks to GitHub, Slack, email, and Notion seamlessly.',
    emPhrase: 'talks to GitHub, Slack, email, and Notion',
    bullets: [
      'Diagnosed and rebuilt the broken Composio integration layer — GitHub, Slack, email providers, and Notion now communicate reliably',
      'Contributed to the core agentic pipeline: company research → job requirement extraction → personalised content generation',
      'Built a candidate-to-job matching engine that maps resume content to role requirements automatically',
      'Refined prompt design and structured output formatting, improving context accuracy by 65%',
    ],
    chips: ['Python', 'FastAPI', 'Composio', 'Claude', 'Groq', 'GitHub API', 'Slack API', 'Notion API', 'AI Agents'],
    metrics: [
      { value: '65%', label: 'accuracy gain', target: 65, suffix: '%' },
      { value: '4+',  label: 'integrations fixed' },
      { value: 'LLM', label: 'orchestration' },
    ],
  },
  {
    id: 'e1', year: '2026', range: 'Apr –\nPresent', location: 'Remote',
    org: 'Koinos', role: 'QA Engineer Intern',
    headline: 'Pen testing, full functional coverage, feasibility analysis — nothing ships until it\'s solid.',
    emPhrase: 'nothing ships until it\'s solid.',
    bullets: [
      'Penetration testing across web and app surfaces — identified and reported security vulnerabilities before production',
      'Full functional test coverage: happy-path, edge cases, regression, and exploratory testing across every sprint',
      'Feasibility analysis on proposed features — evaluated technical viability and flagged risk areas early',
      'Defect lifecycle management — tracked bugs from discovery through fix verification within sprint cadence',
    ],
    chips: ['Postman', 'Burp Suite', 'GitHub', 'Sentry', 'Pen Testing', 'Feasibility Analysis'],
    metrics: [
      { value: '0',       label: 'bugs past prod' },
      { value: 'web+app', label: 'pen tested' },
      { value: 'sprint',  label: 'cadence' },
    ],
  },
  {
    id: 'e2', year: '2025', range: 'Sep –\nNov', location: 'Bengaluru',
    org: 'Magnovite \'25', role: 'Lead Web Developer · Christ University',
    headline: '163% registration growth. Per-event live dashboards so every teacher could plan in real time.',
    emPhrase: '163% registration growth.',
    bullets: [
      'Built a dedicated live-updating graph per event — registration trends, attendance, and session fill rates in real time',
      'Sole architect of the Magnovite portal — design, development, and deployment in a 3-month window',
      'Real-time dashboards with per-session analytics and live registration counts for every organiser',
      'Shipped feature iterations mid-event from live feedback; handled peak traffic spikes with zero downtime',
    ],
    chips: ['React', 'Node.js', 'MongoDB', 'WebSockets', 'Chart.js', 'Vercel'],
    metrics: [
      { value: '163%', label: 'reg. growth', target: 163, suffix: '%' },
      { value: '2500+', label: 'peak users', target: 2500, suffix: '+' },
      { value: '3mo',   label: 'design → prod' },
    ],
  },
  {
    id: 'e3', year: '2025', range: 'Jul –\nAug', location: 'Remote',
    org: 'Hypertraction', role: 'Full Stack Dev & Systems Admin',
    headline: 'Full infrastructure from scratch — corporate site, email platform, A+ security in 2 months.',
    emPhrase: 'A+ security in 2 months.',
    bullets: [
      'Built the corporate website and a secure internal email marketing platform from scratch in 2 months',
      'Configured SPF, DKIM, DMARC + Google Workspace — eliminated email spoofing risk entirely',
      'Role-based subdomain architecture for multi-team access governance and long-term scalability',
      'Production-ready deployment with documented operational workflows for the ongoing team',
    ],
    chips: ['Node.js', 'Express', 'MySQL', 'GoDaddy', 'Google Workspace', 'SPF / DKIM / DMARC'],
    metrics: [
      { value: 'A+',   label: 'email security' },
      { value: '2mo',  label: 'scratch → prod' },
      { value: 'RBAC', label: 'governance' },
    ],
  },
  {
    id: 'e4', year: '2025', range: 'May –\nJun', location: 'Cochin',
    org: 'FlyingSpark', role: 'AI Solution Developer Intern',
    headline: 'You speak. SQL runs. VoiceSQL — zero to shipped in 6 weeks.',
    emPhrase: 'SQL runs.',
    bullets: [
      'Built VoiceSQL end-to-end — a voice interface converting spoken natural language into executable SQL queries in 6 weeks',
      'Optimised the Speech-to-Text + LLM orchestration pipeline for accuracy and reduced query latency',
      'Prompt engineering and query-generation logic refined against real-world database schemas',
      'Collaborated with product and engineering to align model behaviour with actual user workflows',
    ],
    chips: ['Python', 'FastAPI', 'PostgreSQL', 'Groq', 'Speech-to-Text', 'LLM Orchestration'],
    metrics: [
      { value: '6wk', label: 'zero → shipped' },
      { value: '↓ms', label: 'latency opt.' },
      { value: 'SQL', label: 'voice → query' },
    ],
  },

]

// ── Entry component ───────────────────────────────────────
function ExperienceEntry({ entry, index, isActive }: { entry: Entry; index: number; isActive: boolean }) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.14, rootMargin: '0px 0px -48px 0px' })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  // count-up for metrics with data-target
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      entry.metrics.forEach(m => {
        if (m.target === undefined) return
        const id = `mv-${entry.id}-${m.label.replace(/\s/g, '')}`
        const el = document.getElementById(id); if (!el) return
        let step = 0; const steps = 55; const dur = 1300
        const tick = setInterval(() => {
          step++
          const p = 1 - Math.pow(1 - step / steps, 3)
          el.textContent = Math.round(m.target! * p) + (m.suffix || '')
          if (step >= steps) { el.textContent = m.target + (m.suffix || ''); clearInterval(tick) }
        }, dur / steps)
      })
    }, 560)
    return () => clearTimeout(timer)
  }, [visible])

  const rangeLines = entry.range.split('\n')

  const buildHeadline = () => {
    if (!entry.emPhrase) return entry.headline
    const parts = entry.headline.split(entry.emPhrase)
    return parts.map((part, i) => (
      <span key={i}>{part}{i < parts.length - 1 && <em style={{ color: 'var(--primary)', fontStyle: 'normal', fontWeight: 800 }}>{entry.emPhrase}</em>}</span>
    ))
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        /* Mobile: single column (date strip on top). Desktop: date col + content. */
        gridTemplateColumns: isMobile ? '1fr' : '120px 1fr',
        gap: isMobile ? '0' : '0 56px',
        marginBottom: index < entries.length - 1 ? (isMobile ? 52 : 88) : 0,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1)',
        transitionDelay: `${Math.min(index, 2) * 80}ms`,
      }}
    >
      {/* Date strip — row on mobile, left column on desktop */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: isMobile ? 'center' : 'flex-end',
        gap: isMobile ? 8 : 0,
        paddingTop: isMobile ? 0 : 2,
        marginBottom: isMobile ? 12 : 0,
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11, color: 'var(--muted-foreground)', letterSpacing: '.1em', opacity: 0.4 }}>
          {entry.year}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted-foreground)', letterSpacing: '.04em', textAlign: isMobile ? 'left' : 'right', lineHeight: 1.7, opacity: 0.5 }}>
          {isMobile
            ? `${entry.range.replace('\n', ' ')} · ${entry.location}`
            : rangeLines.map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)
          }
        </div>
        {!isMobile && (
          <>
            <div style={{
              width: hovered ? 26 : 16, height: 1,
              background: hovered ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 25%, transparent)',
              margin: '14px 0 14px auto', borderRadius: 1,
              transition: 'width 0.4s cubic-bezier(.22,1,.36,1), background 0.3s',
            }} />
            <div style={{ fontSize: 8.5, color: 'var(--muted-foreground)', letterSpacing: '.05em', textAlign: 'right', fontStyle: 'italic', opacity: 0.35 }}>
              {entry.location}
            </div>
          </>
        )}
      </div>

      {/* Content column */}
      <div style={{ position: 'relative' }}>
        {/* Animated top line */}
        <div style={{ width: '100%', height: 1, background: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: hovered ? '100%' : '0%',
            background: 'var(--primary)',
            transition: 'width 0.5s cubic-bezier(.22,1,.36,1)',
          }} />
        </div>

        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: isMobile ? 22 : 28, lineHeight: 1.02, color: 'var(--foreground)', letterSpacing: '-.02em', marginTop: 14, marginBottom: 4 }}>
          {entry.org}
          {entry.isEducation && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', letterSpacing: '.1em', marginLeft: 12, verticalAlign: 'middle' }}>EDU</span>}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)', letterSpacing: '.06em', marginBottom: 16 }}>
          {entry.role}
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: isMobile ? 13 : 'clamp(13px,1.8vw,16px)', lineHeight: 1.55, color: 'var(--foreground)', opacity: .85, maxWidth: 520, marginBottom: 20 }}>
          {buildHeadline()}
        </div>

        {/* Body: bullets + metrics — stacked on mobile, side-by-side on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 136px', gap: isMobile ? '0' : '0 44px', alignItems: 'start' }}>
          <div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entry.bullets.map((b, i) => (
                <li key={i} style={{ fontSize: 11.5, color: 'var(--muted-foreground)', lineHeight: 1.7, paddingLeft: 16, position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 0, top: 9, display: 'block',
                    width: hovered ? 8 : 6, height: 1,
                    background: 'var(--primary)', opacity: hovered ? 0.7 : 0.4,
                    transition: 'width 0.2s, opacity 0.2s',
                  }} />
                  {b}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 18 }}>
              {entry.chips.map(c => (
                <span key={c} style={{
                  fontSize: 8.5, letterSpacing: '.05em', padding: '3px 9px', borderRadius: 2,
                  background: hovered ? 'color-mix(in srgb, var(--foreground) 8%, transparent)' : 'color-mix(in srgb, var(--foreground) 4%, transparent)',
                  color: hovered ? 'color-mix(in srgb, var(--foreground) 55%, transparent)' : 'color-mix(in srgb, var(--foreground) 32%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--foreground) 10%, transparent)',
                  transition: 'all 0.25s',
                }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Metrics — inline row on mobile, right column on desktop */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '8px 20px' : 0,
            marginTop: isMobile ? 16 : 0,
          }}>
            {entry.metrics.map((m, i) => (
              <div key={i} style={{
                padding: isMobile ? '0' : `${i === 0 ? 0 : 13}px 0 13px`,
                borderBottom: !isMobile && i < entry.metrics.length - 1 ? '1px solid var(--border)' : 'none',
                borderRight: isMobile && i < entry.metrics.length - 1 ? '1px solid var(--border)' : 'none',
                paddingRight: isMobile ? 20 : 0,
              }}>
                <div
                  id={`mv-${entry.id}-${m.label.replace(/\s/g, '')}`}
                  style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: isMobile ? 18 : 24, color: 'var(--primary)', lineHeight: 1, marginBottom: 3, letterSpacing: '-.01em' }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: 8.5, color: 'var(--muted-foreground)', letterSpacing: '.07em', textTransform: 'uppercase', lineHeight: 1.3 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Scroll-linked Timeline Rail (v2) ─────────────────────────────────────────
// Dots are positioned at the ACTUAL entry DOM positions (not evenly spaced).
// Fill tracks scroll via RAF for butter-smooth animation.
// Active dot gets a ring-pulse glow; hovered dot shows an org label.
function TimelineRail({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement> }) {
  const railRef        = useRef<HTMLDivElement>(null)
  const fillRef        = useRef<HTMLDivElement>(null)
  const glowRef        = useRef<HTMLDivElement>(null)
  const rafRef         = useRef<number>(0)
  const [dotTops, setDotTops]       = useState<number[]>([])  // px from rail top
  const [activeIdx, setActiveIdx]   = useState(-1)
  const [hoveredIdx, setHoveredIdx] = useState(-1)

  // Recalculate dot positions from real entry DOM rects
  const recalc = () => {
    if (!sectionRef.current || !railRef.current) return
    const sectionTop = sectionRef.current.getBoundingClientRect().top + window.scrollY
    const railH      = railRef.current.offsetHeight
    const tops = entries.map(e => {
      const el = document.getElementById(`exp-${e.id}`)
      if (!el) return 0
      const elTop = el.getBoundingClientRect().top + window.scrollY - sectionTop
      // clamp within rail bounds
      return Math.max(0, Math.min(railH, elTop))
    })
    setDotTops(tops)
  }

  // RAF scroll loop — measures fill height directly from DOM, no setState per frame
  useEffect(() => {
    const tick = () => {
      if (sectionRef.current && fillRef.current && glowRef.current && railRef.current) {
        const rect   = sectionRef.current.getBoundingClientRect()
        const railH  = railRef.current.offsetHeight
        const viewH  = window.innerHeight
        // progress: 0 when section top is at 70% viewport, 1 when bottom leaves viewport
        const start  = viewH * 0.70
        const travel = sectionRef.current.offsetHeight + viewH * 0.5
        const scrolled = start - rect.top
        const pct    = Math.max(0, Math.min(1, scrolled / travel))
        const fillPx = pct * railH

        fillRef.current.style.height    = `${fillPx}px`
        glowRef.current.style.top       = `${fillPx}px`
        glowRef.current.style.opacity   = pct > 0.01 && pct < 0.99 ? '1' : '0'

        // active index = last dot whose px top ≤ fillPx
        if (dotTops.length > 0) {
          let best = -1
          dotTops.forEach((t, i) => { if (t <= fillPx + 6) best = i })
          setActiveIdx(best)
        }

        // Entry active via viewport midpoint
        let bestEntry = -1
        entries.forEach((e, i) => {
          const el = document.getElementById(`exp-${e.id}`)
          if (!el) return
          if (el.getBoundingClientRect().top < viewH * 0.58) bestEntry = i
        })
        setActiveIdx(bestEntry)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [dotTops])

  // Recalc dot positions on mount + resize
  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (sectionRef.current) ro.observe(sectionRef.current)
    window.addEventListener('resize', recalc)
    return () => { ro.disconnect(); window.removeEventListener('resize', recalc) }
  }, [])

  // Also recalc after a short delay (images/fonts may shift layout)
  useEffect(() => {
    const t = setTimeout(recalc, 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      ref={railRef}
      style={{
        position: 'absolute',
        left: -40,
        top: 0,
        bottom: 0,
        width: 2,
      }}
    >
      {/* Track — faint background line */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'color-mix(in srgb, var(--foreground) 7%, transparent)',
        borderRadius: 99,
      }} />

      {/* Filled portion — animates via direct DOM style in RAF */}
      <div
        ref={fillRef}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 0,
          background: 'linear-gradient(180deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 55%, transparent) 100%)',
          borderRadius: 99,
          boxShadow: '0 0 6px 1px color-mix(in srgb, var(--primary) 50%, transparent)',
        }}
      />

      {/* Travelling glow head at the bottom of the fill */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--primary)',
          boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent), 0 0 14px 4px color-mix(in srgb, var(--primary) 45%, transparent)',
          opacity: 0,
          transition: 'opacity 0.3s',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* Dots — at real entry positions */}
      {dotTops.map((topPx, i) => {
        const isAct  = activeIdx >= i
        const isHov  = hoveredIdx === i
        const entry  = entries[i]
        return (
          <div
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(-1)}
            onClick={() => document.getElementById(`exp-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              position: 'absolute',
              top: topPx,
              left: '50%',
              transform: 'translate(-50%, 0)',
              zIndex: 3,
              cursor: 'pointer',
            }}
          >
            {/* Outer pulse ring — only on active */}
            {isAct && (
              <div style={{
                position: 'absolute',
                inset: -5,
                borderRadius: '50%',
                border: '1.5px solid color-mix(in srgb, var(--primary) 35%, transparent)',
                animation: 'timelinePulse 2s ease-out infinite',
                pointerEvents: 'none',
              }} />
            )}

            {/* Dot */}
            <div style={{
              width: isAct ? 10 : isHov ? 8 : 6,
              height: isAct ? 10 : isHov ? 8 : 6,
              borderRadius: '50%',
              background: isAct
                ? 'var(--primary)'
                : 'color-mix(in srgb, var(--foreground) 16%, transparent)',
              border: isAct
                ? '2px solid var(--background)'
                : '1px solid color-mix(in srgb, var(--foreground) 14%, transparent)',
              boxShadow: isAct ? '0 0 8px 2px color-mix(in srgb, var(--primary) 55%, transparent)' : 'none',
              transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
            }} />

            {/* Tooltip — org name + role on hover */}
            <div style={{
              position: 'absolute',
              left: 18,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: isHov ? 1 : 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
              background: 'color-mix(in srgb, var(--background) 92%, transparent)',
              border: '1px solid color-mix(in srgb, var(--foreground) 10%, transparent)',
              borderRadius: 6,
              padding: '4px 10px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 10,
            }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 10, color: 'var(--foreground)', letterSpacing: '-.01em' }}>
                {entry.org}
              </div>
              <div style={{ fontSize: 8.5, color: 'var(--muted-foreground)', letterSpacing: '.04em', marginTop: 1 }}>
                {entry.year} · {entry.range.replace('\n', ' ')}
              </div>
            </div>

            {/* Year label — left of dot, fades in when active */}
            <div style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              letterSpacing: '.06em',
              color: isAct ? 'var(--primary)' : 'color-mix(in srgb, var(--foreground) 25%, transparent)',
              opacity: isAct || isHov ? 1 : 0,
              transition: 'opacity 0.3s, color 0.3s',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textAlign: 'right',
            }}>
              {entry.year}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export function About() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState(-1)
  const isMobile = useIsMobile()

  // Track which entry is the "active" one (in viewport midpoint)
  useEffect(() => {
    const entryEls = entries.map(e => document.getElementById(`exp-${e.id}`))
    const onScroll = () => {
      const mid = window.innerHeight * 0.55
      let best = -1
      entryEls.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top < mid) best = i
      })
      setActiveSection(best)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: 'var(--background)', overflowX: 'hidden' }}>

      {/* ── EXPERIENCE ── */}
      <section style={{ padding: isMobile ? '60px 0 80px' : '80px 0 140px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: isMobile ? '0 20px' : '0 48px' }}>

          {/* Section header */}
          <ScrambleHeading label="Career" plain="Work" accent="Experience" />

          {/* Entries + timeline rail (rail hidden on mobile) */}
          <div ref={sectionRef} style={{ position: 'relative', paddingLeft: isMobile ? 0 : 20 }}>
            {/* Timeline rail — desktop only */}
            {!isMobile && <TimelineRail sectionRef={sectionRef} />}

            {entries.map((entry, i) => (
              <div key={entry.id} id={`exp-${entry.id}`}>
                <ExperienceEntry entry={entry} index={i} isActive={activeSection >= i} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}