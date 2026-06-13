import React from 'react'

const F = (x: number) => `color-mix(in srgb, var(--foreground) ${x}%, transparent)`
const P = (x: number) => `color-mix(in srgb, var(--primary) ${x}%, transparent)`

type SvgProps = { active: boolean }

function animStyle(active: boolean, name: string, delay: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...extra,
    animation: active ? `${name} 0.7s ${delay} cubic-bezier(.22,1,.36,1) both` : 'none',
    transform: active ? undefined : name.includes('grow') ? 'scaleX(0)' : 'translateY(10px)',
    opacity: active ? undefined : 0,
  }
}

export function WebViz({ active }: SvgProps) {
  return (
    <svg viewBox="0 0 380 190" fill="none" style={{ width: '100%', maxHeight: 200 }}>
      <rect x="2" y="2" width="185" height="186" rx="6" style={{ fill: F(3), stroke: F(9) }} strokeWidth="1" />
      <rect x="2" y="2" width="185" height="22" rx="6" style={{ fill: F(5) }} />
      <rect x="10" y="6" width="48" height="13" rx="3" style={{ fill: F(7), stroke: F(8) }} strokeWidth=".6" />
      <circle cx="160" cy="12" r="3" style={{ fill: P(40) }} />
      <circle cx="171" cy="12" r="3" style={{ fill: F(8) }} />
      <circle cx="182" cy="12" r="3" style={{ fill: F(8) }} />
      {[
        { y: 30, w: 90,  d: '0.05s', fill: F(18) },
        { y: 41, w: 110, d: '0.12s', fill: 'var(--primary)' },
        { y: 52, w: 70,  d: '0.19s', fill: F(25) },
        { y: 63, w: 140, d: '0.26s', fill: F(18) },
        { y: 74, w: 100, d: '0.33s', fill: P(45) },
        { y: 85, w: 80,  d: '0.40s', fill: F(16) },
        { y: 96, w: 120, d: '0.47s', fill: F(12) },
      ].map(({ y, w, d, fill }, i) => (
        <rect key={i} x="22" y={y} width={w} height="5" rx="1.5"
          style={{ fill, transformOrigin: '22px center', ...animStyle(active, 'svc-grow', d) }} />
      ))}
      <rect x="194" y="2" width="184" height="186" rx="6" style={{ fill: F(2), stroke: F(7) }} strokeWidth="1" />
      <rect x="194" y="2" width="184" height="20" rx="6" style={{ fill: F(3) }} />
      <circle cx="206" cy="11" r="3" style={{ fill: F(8) }} />
      <circle cx="215" cy="11" r="3" style={{ fill: F(8) }} />
      <circle cx="224" cy="11" r="3" style={{ fill: P(40) }} />
      <rect x="232" y="6" width="100" height="9" rx="3" style={{ fill: F(4) }} />
      <rect x="204" y="30" width="90" height="8" rx="3"
        style={{ fill: P(76), transformOrigin: '204px center', ...animStyle(active, 'svc-grow', '0.3s') }} />
      <rect x="204" y="44" width="82" height="4" rx="2"
        style={{ fill: F(22), transformOrigin: '204px center', ...animStyle(active, 'svc-grow', '0.4s') }} />
      <rect x="204" y="52" width="68" height="4" rx="2"
        style={{ fill: F(15), transformOrigin: '204px center', ...animStyle(active, 'svc-grow', '0.48s') }} />
      <rect x="204" y="62" width="58" height="12" rx="4"
        style={{ fill: P(70), transformOrigin: '204px center', ...animStyle(active, 'svc-grow', '0.56s') }} />
      <rect x="306" y="28" width="64" height="56" rx="4"
        style={{ fill: F(4), stroke: F(9), transformOrigin: '306px center', ...animStyle(active, 'svc-grow', '0.5s') }} strokeWidth=".6" />
    </svg>
  )
}

export function AiViz({ active }: SvgProps) {
  const dim = F(9)
  const nodes: [number, number, string][] = [
    [50,48,'in'],[50,95,'in'],[50,142,'in'],
    [138,36,'h1'],[138,78,'h1'],[138,120,'h1'],[138,162,'h1'],
    [232,55,'h2'],[232,95,'h2'],[232,135,'h2'],
    [330,75,'out'],[330,135,'out'],
  ]
  const lines = [
    [50,48,138,36],[50,48,138,78],[50,95,138,78],[50,95,138,120],[50,142,138,120],[50,142,138,162],
    [138,36,232,55],[138,78,232,55],[138,78,232,95],[138,120,232,95],[138,120,232,135],[138,162,232,135],
    [232,55,330,75],[232,95,330,75],[232,95,330,135],[232,135,330,135],
  ]
  return (
    <svg viewBox="0 0 380 190" fill="none" style={{ width: '100%', maxHeight: 200 }}>
      {lines.map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dim} strokeWidth=".55" />
      ))}
      {nodes.map(([cx,cy,type], i) => {
        const isIn = type === 'in', isOut = type === 'out'
        const delay = `${0.05 + i * 0.04}s`
        return (
          <circle key={i} cx={cx} cy={cy}
            r={isIn || isOut ? 9 : 7}
            style={{
              fill: isIn || isOut ? P(10) : F(2),
              stroke: isIn || isOut ? 'var(--primary)' : F(13),
              strokeWidth: isIn || isOut ? '1.2' : '1',
              opacity: active ? 1 : 0,
              transition: `opacity 0.4s ${delay} ease`,
            }} />
        )
      })}
      {active && (
        <>
          <circle r="4" style={{ fill: 'var(--primary)', filter: 'blur(1px)' }}>
            <animateMotion dur="2s" repeatCount="indefinite" path="M50,95 L138,78 L232,95 L330,75" />
          </circle>
          <circle r="4" style={{ fill: 'var(--primary)', filter: 'blur(1px)', opacity: 0.7 }}>
            <animateMotion dur="2s" begin="0.5s" repeatCount="indefinite" path="M50,48 L138,36 L232,55 L330,75" />
          </circle>
          <circle r="4" style={{ fill: 'var(--primary)', filter: 'blur(1px)', opacity: 0.7 }}>
            <animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M50,142 L138,162 L232,135 L330,135" />
          </circle>
        </>
      )}
    </svg>
  )
}

export function DesignViz({ active }: SvgProps) {
  return (
    <svg viewBox="0 0 380 190" fill="none" style={{ width: '100%', maxHeight: 200 }}>
      <rect x="16" y="12" width="330" height="170" rx="4" style={{ fill: F(2), stroke: F(12) }} strokeWidth="1" />
      <rect x="16" y="12" width="330" height="22" rx="4" style={{ fill: F(4) }} />
      <rect x="26" y="18" width="0" height="9" rx="3" style={{ fill: 'var(--primary)', opacity: .55, transformOrigin:'26px center', ...animStyle(active,'svc-grow','0.1s') }} />
      <rect x="268" y="20" width="0" height="5" rx="2" style={{ fill: F(20), transformOrigin:'268px center', ...animStyle(active,'svc-grow','0.3s') }} />
      <rect x="298" y="20" width="0" height="5" rx="2" style={{ fill: F(15), transformOrigin:'298px center', ...animStyle(active,'svc-grow','0.38s') }} />
      <rect x="328" y="18" width="0" height="9" rx="4" style={{ fill: P(60), transformOrigin:'328px center', ...animStyle(active,'svc-grow','0.46s') }} />
      <rect x="28" y="42" width="0" height="12" rx="3" style={{ fill: P(75), transformOrigin:'28px center', ...animStyle(active,'svc-grow','0.2s') }} />
      <rect x="28" y="59" width="0" height="5" rx="2" style={{ fill: F(26), transformOrigin:'28px center', ...animStyle(active,'svc-grow','0.3s') }} />
      <rect x="28" y="68" width="0" height="5" rx="2" style={{ fill: F(18), transformOrigin:'28px center', ...animStyle(active,'svc-grow','0.38s') }} />
      <rect x="28" y="80" width="0" height="12" rx="4" style={{ fill: P(70), transformOrigin:'28px center', ...animStyle(active,'svc-grow','0.46s') }} />
      <rect x="208" y="36" width="0" height="70" rx="4" style={{ fill: F(4), stroke: F(10), transformOrigin:'208px center', ...animStyle(active,'svc-grow','0.5s') }} strokeWidth=".7" />
      {[0,1,2,3].map(i => (
        <rect key={i} x={28+i*76} y="148" width="66" height="28" rx="4"
          style={{ fill: i===2 ? P(7) : F(3), stroke: i===2 ? 'var(--primary)' : F(7), strokeWidth: i===2?'.8':'.6', opacity: active ? 1 : 0, transition: `opacity 0.4s ${0.5+i*0.1}s ease` }} />
      ))}
    </svg>
  )
}

export function SecurityViz({ active }: SvgProps) {
  return (
    <svg viewBox="0 0 380 190" fill="none" style={{ width: '100%', maxHeight: 200 }}>
      <rect x="2" y="2" width="268" height="186" rx="6" style={{ fill: F(2), stroke: F(9) }} strokeWidth="1" />
      <rect x="2" y="2" width="268" height="24" rx="6" style={{ fill: F(4) }} />
      <circle cx="16" cy="13" r="4" style={{ fill: F(10) }} />
      <circle cx="28" cy="13" r="4" style={{ fill: F(10) }} />
      <circle cx="40" cy="13" r="4" style={{ fill: P(42) }} />
      {[
        { y: 40,  w: 220, d: '0.1s', fill: P(70),  text: true },
        { y: 54,  w: 160, d: '0.2s', fill: F(34) },
        { y: 66,  w: 140, d: '0.28s', fill: F(28) },
        { y: 78,  w: 110, d: '0.36s', fill: P(48) },
        { y: 90,  w: 130, d: '0.44s', fill: F(26) },
        { y: 101, w: 125, d: '0.52s', fill: F(26) },
        { y: 112, w: 110, d: '0.6s',  fill: F(26) },
        { y: 126, w: 200, d: '0.68s', fill: 'rgba(239,68,68,0.7)' },
        { y: 138, w: 190, d: '0.76s', fill: 'rgba(239,68,68,0.7)' },
        { y: 152, w: 175, d: '0.84s', fill: P(78) },
      ].map(({ y, w, d, fill }, i) => (
        <rect key={i} x="14" y={y} width={w} height="5" rx="1"
          style={{ fill, transformOrigin:'14px center', ...animStyle(active,'svc-grow',d) }} />
      ))}
      {active && <rect x="2" y="38" width="268" height="2" style={{ fill: 'var(--primary)', opacity: .3 }}>
        <animate attributeName="y" values="38;170;38" dur="3s" repeatCount="indefinite" />
      </rect>}
      <rect x="282" y="2" width="96" height="186" rx="6" style={{ fill: F(2), stroke: F(7) }} strokeWidth=".7" />
      <path d="M330 30 L344 38 L344 56 Q344 70 330 78 Q316 70 316 56 L316 38 Z"
        style={{ fill: P(8), stroke: 'var(--primary)', strokeWidth: '1.1', opacity: active ? 1 : 0, transition: 'opacity 0.5s 0.5s ease' }} />
    </svg>
  )
}

export function AutomationViz({ active }: SvgProps) {
  const nodes = ['CRON', 'BASH', 'API', 'CI/CD', '✓']
  const xs = [30, 100, 170, 240, 318]
  return (
    <svg viewBox="0 0 380 190" fill="none" style={{ width: '100%', maxHeight: 200 }}>
      <line x1="14" y1="80" x2="366" y2="80" style={{ stroke: F(7) }} strokeWidth="1.2" />
      <rect x="14" y="79" width="0" height="2.5" rx="1.2" style={{ fill: 'var(--primary)', transformOrigin:'14px center', ...animStyle(active,'svc-grow','0.05s') }} />
      {nodes.map((label, i) => (
        <g key={i}>
          <rect x={xs[i]} y={i===4?54:58} width={i===4?48:58} height={i===4?52:44} rx="6"
            style={{ fill: i===4 ? P(12) : F(3), stroke: i===4 ? 'var(--primary)' : F(10), strokeWidth:'1', opacity: active?1:0, transition:`opacity 0.4s ${0.1+i*0.12}s ease` }} />
          <text x={xs[i]+(i===4?24:29)} y={i===4?83:83} textAnchor="middle"
            style={{ fontFamily:"'DM Mono',monospace", fontSize: i===4?16:8, fill: i===4?'var(--primary)':F(28), opacity: active?1:0, transition:`opacity 0.4s ${0.15+i*0.12}s ease` }}>
            {label}
          </text>
        </g>
      ))}
      {active && (
        <circle r="5" style={{ fill: 'var(--primary)', filter: 'blur(1.5px)' }}>
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M30,80 L100,80 L170,80 L240,80 L342,80" />
        </circle>
      )}
      <rect x="14" y="118" width="0" height="15" rx="3" style={{ fill: P(7), stroke:'var(--primary)', strokeWidth:'.6', transformOrigin:'14px center', ...animStyle(active,'svc-grow','0.8s') }} />
    </svg>
  )
}

export function DatabaseViz({ active }: SvgProps) {
  return (
    <svg viewBox="0 0 380 190" fill="none" style={{ width: '100%', maxHeight: 200 }}>
      {[8, 224].map((x, ti) => (
        <g key={ti}>
          <rect x={x} y="12" width="148" height="158" rx="5" style={{ fill: F(2), stroke: F(9) }} strokeWidth="1" />
          <rect x={x} y="12" width="148" height="24" rx="5" style={{ fill: P(10), stroke: 'var(--primary)' }} strokeWidth=".7" />
          <text x={x+74} y="27" textAnchor="middle" style={{ fontFamily:"'DM Mono',monospace", fontSize:8.5, fontWeight:600, fill:'var(--primary)' }}>
            {ti===0 ? 'users' : 'orders'}
          </text>
          {[44,62,73,84,95,106].map((y,ri) => (
            <g key={ri}>
              {ri===0 && <rect x={x+10} y={y} width="9" height="4" rx="2" style={{ fill:'var(--primary)', opacity:.5 }} />}
              <rect x={x+(ri===0?26:26)} y={y} width={ri===0?44:40} height="4" rx="2" style={{ fill: F(ri===0?28:20), opacity: active?1:0, transition:`opacity 0.3s ${0.2+ri*0.07}s` }} />
              <rect x={x+86} y={y} width={48} height="4" rx="2" style={{ fill: F(ri===0?18:14), opacity: active?1:0, transition:`opacity 0.3s ${0.25+ri*0.07}s` }} />
              {ri===0 && <line x1={x} y1={y+10} x2={x+148} y2={y+10} style={{ stroke: F(7) }} strokeWidth=".6" />}
            </g>
          ))}
        </g>
      ))}
      <line x1="156" y1="68" x2="224" y2="68" style={{ stroke:'var(--primary)', strokeWidth:'1.3', strokeDasharray:'68', strokeDashoffset: active?'0':'68', transition:'stroke-dashoffset 0.6s 0.5s ease', opacity: active?1:0 }} />
      <circle cx="156" cy="68" r={active?4:0} style={{ fill:'var(--primary)', transition:'r 0.3s 0.8s' }} />
      <circle cx="224" cy="68" r={active?4:0} style={{ fill:'var(--primary)', transition:'r 0.3s 0.9s' }} />
      <rect x="170" y="58" width={active?48:0} height="13" rx="3" style={{ fill: P(10), stroke:'var(--primary)', strokeWidth:'.6', transition:'width 0.4s 0.7s ease' }} />
      <text x="194" y="67" textAnchor="middle" style={{ fontFamily:"'DM Mono',monospace", fontSize:7, fill:'var(--primary)', opacity: active?1:0, transition:'opacity 0.3s 1s' }}>JOIN</text>
    </svg>
  )
}
