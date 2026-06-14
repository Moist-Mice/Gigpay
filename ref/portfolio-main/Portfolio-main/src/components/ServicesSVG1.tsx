import { O, OA, WA } from './ServicesAnims'

export function svgWEB() {
  return `<svg viewBox="0 0 380 190" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="wgl"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="wgrid" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="${WA(.04)}"/></pattern>
  </defs>
  <rect width="380" height="190" fill="url(#wgrid)"/>
  <rect x="2" y="2" width="185" height="186" rx="7" fill="${WA(.022)}" stroke="${WA(.09)}" stroke-width="1"/>
  <rect x="2" y="2" width="185" height="22" rx="7" fill="${WA(.04)}"/>
  <rect x="2" y="15" width="185" height="9" fill="${WA(.025)}"/>
  <rect x="10" y="5" width="48" height="14" rx="3" fill="${WA(.07)}" stroke="${WA(.08)}" stroke-width=".6"/>
  <text x="34" y="15" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" fill="${OA(.7)}">App.jsx</text>
  <rect x="62" y="5" width="44" height="14" rx="3" fill="none"/>
  <text x="84" y="15" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" fill="${WA(.2)}">api.js</text>
  <rect x="110" y="5" width="52" height="14" rx="3" fill="none"/>
  <text x="136" y="15" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" fill="${WA(.2)}">schema.js</text>
  <rect x="2" y="24" width="18" height="164" fill="${WA(.015)}"/>
  <text x="11" y="36" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${WA(.14)}">1</text>
  <text x="11" y="46" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${WA(.14)}">2</text>
  <text x="11" y="56" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${WA(.14)}">3</text>
  <text x="11" y="66" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${WA(.14)}">4</text>
  <text x="11" y="76" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${WA(.14)}">5</text>
  <text x="11" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${WA(.14)}">6</text>
  <rect x="22" y="30" width="0" height="5" rx="1.5" fill="${WA(.18)}" id="w_l0"/>
  <rect x="22" y="41" width="0" height="5" rx="1.5" fill="${OA(.65)}" id="w_l1"/>
  <rect x="22" y="52" width="0" height="5" rx="1.5" fill="${WA(.25)}" id="w_l2"/>
  <rect x="28" y="63" width="0" height="5" rx="1.5" fill="${WA(.18)}" id="w_l3"/>
  <rect x="28" y="74" width="0" height="5" rx="1.5" fill="${OA(.45)}" id="w_l4"/>
  <rect x="28" y="85" width="0" height="5" rx="1.5" fill="${WA(.16)}" id="w_l5"/>
  <rect x="22" y="96" width="0" height="5" rx="1.5" fill="${WA(.12)}" id="w_l6"/>
  <rect x="20" y="100" width="164" height="6" rx="1" fill="${OA(.04)}" id="w_linehl" opacity="0"/>
  <rect x="22" y="100" width="1.5" height="8" rx=".8" fill="${O()}" opacity="0" id="w_cur"/>
  <rect x="22" y="112" width="80" height="4" rx="1.5" fill="${WA(.08)}" id="w_l7" opacity="0"/>
  <rect x="22" y="121" width="120" height="4" rx="1.5" fill="${WA(.06)}" id="w_l8" opacity="0"/>
  <rect x="22" y="130" width="66" height="4" rx="1.5" fill="${WA(.06)}" id="w_l9" opacity="0"/>
  <rect x="2" y="174" width="185" height="14" rx="0" fill="${OA(.12)}" stroke="${O()}" stroke-width=".4"/>
  <text x="12" y="183" font-family="DM Mono,monospace" font-size="5.5" fill="${O()}" opacity=".7">React  TypeScript  Node.js</text>
  <line x1="190" y1="2" x2="190" y2="188" stroke="${WA(.07)}" stroke-width=".8" stroke-dasharray="3 4"/>
  <rect x="194" y="2" width="184" height="186" rx="7" fill="${WA(.018)}" stroke="${WA(.07)}" stroke-width="1"/>
  <rect x="194" y="2" width="184" height="20" rx="7" fill="${WA(.035)}"/>
  <rect x="194" y="14" width="184" height="8" fill="${WA(.02)}"/>
  <circle cx="206" cy="12" r="3" fill="${WA(.08)}"/>
  <circle cx="215" cy="12" r="3" fill="${WA(.08)}"/>
  <circle cx="224" cy="12" r="3" fill="${OA(.4)}"/>
  <rect x="232" y="7" width="100" height="10" rx="4" fill="${WA(.04)}"/>
  <rect x="237" y="10" width="0" height="4" rx="2" fill="${WA(.18)}" id="w_url"/>
  <rect x="204" y="28" width="0" height="8" rx="3" fill="${O()}" opacity=".78" id="w_h1"/>
  <rect x="204" y="42" width="0" height="4" rx="2" fill="${WA(.22)}" id="w_sl1"/>
  <rect x="204" y="50" width="0" height="4" rx="2" fill="${WA(.15)}" id="w_sl2"/>
  <rect x="204" y="60" width="0" height="12" rx="4" fill="${OA(.72)}" id="w_btn"/>
  <rect x="306" y="24" width="0" height="58" rx="4" fill="${WA(.04)}" stroke="${WA(.07)}" stroke-width=".6" id="w_img"/>
  <line x1="306" y1="24" x2="374" y2="82" stroke="${WA(.05)}" stroke-width=".5" id="w_ix1" opacity="0"/>
  <line x1="374" y1="24" x2="306" y2="82" stroke="${WA(.05)}" stroke-width=".5" id="w_ix2" opacity="0"/>
  <rect x="204" y="92" width="54" height="46" rx="4" fill="${WA(.02)}" stroke="${WA(.06)}" stroke-width=".6" id="w_c1" opacity="0"/>
  <rect x="262" y="92" width="54" height="46" rx="4" fill="${WA(.02)}" stroke="${WA(.06)}" stroke-width=".6" id="w_c2" opacity="0"/>
  <rect x="320" y="92" width="54" height="46" rx="4" fill="${OA(.06)}" stroke="${O()}" stroke-width=".7" id="w_c3" opacity="0"/>
  <rect x="327" y="102" width="0" height="4" rx="2" fill="${O()}" id="w_c3t"/>
  <rect x="327" y="110" width="0" height="3" rx="1.5" fill="${WA(.2)}" id="w_c3l"/>
  <text x="278" y="162" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="${O()}" opacity="0" id="w_200">200 OK</text>
  <circle cx="-10" cy="90" r="4" fill="${O()}" opacity="0" filter="url(#wgl)" id="w_pkt"/>
</svg>`
}

export function svgAI() {
  const dim = WA(.09)
  return `<svg viewBox="0 0 380 190" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="aibg" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="${O()}" stop-opacity=".05"/><stop offset="100%" stop-color="${O()}" stop-opacity="0"/></radialGradient>
    <filter id="agl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="380" height="190" fill="url(#aibg)"/>
  <line x1="50" y1="48" x2="138" y2="32" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="48" x2="138" y2="78" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="48" x2="138" y2="120" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="95" x2="138" y2="32" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="95" x2="138" y2="78" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="95" x2="138" y2="120" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="95" x2="138" y2="162" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="142" x2="138" y2="78" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="142" x2="138" y2="120" stroke="${dim}" stroke-width=".55"/>
  <line x1="50" y1="142" x2="138" y2="162" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="32" x2="232" y2="55" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="32" x2="232" y2="95" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="78" x2="232" y2="55" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="78" x2="232" y2="95" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="78" x2="232" y2="135" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="120" x2="232" y2="95" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="120" x2="232" y2="135" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="162" x2="232" y2="95" stroke="${dim}" stroke-width=".55"/>
  <line x1="146" y1="162" x2="232" y2="135" stroke="${dim}" stroke-width=".55"/>
  <line x1="240" y1="55" x2="322" y2="75" stroke="${dim}" stroke-width=".65"/>
  <line x1="240" y1="55" x2="322" y2="135" stroke="${dim}" stroke-width=".65"/>
  <line x1="240" y1="95" x2="322" y2="75" stroke="${dim}" stroke-width=".65"/>
  <line x1="240" y1="95" x2="322" y2="135" stroke="${dim}" stroke-width=".65"/>
  <line x1="240" y1="135" x2="322" y2="75" stroke="${dim}" stroke-width=".65"/>
  <line x1="240" y1="135" x2="322" y2="135" stroke="${dim}" stroke-width=".65"/>
  <circle cx="50" cy="48" r="8.5" fill="${OA(.1)}" stroke="${O()}" stroke-width="1.1"/>
  <circle cx="50" cy="95" r="8.5" fill="${OA(.1)}" stroke="${O()}" stroke-width="1.1"/>
  <circle cx="50" cy="142" r="8.5" fill="${OA(.1)}" stroke="${O()}" stroke-width="1.1"/>
  <circle cx="138" cy="32" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h11"/>
  <circle cx="138" cy="78" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h12"/>
  <circle cx="138" cy="120" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h13"/>
  <circle cx="138" cy="162" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h14"/>
  <circle cx="232" cy="55" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h21"/>
  <circle cx="232" cy="95" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h22"/>
  <circle cx="232" cy="135" r="7" fill="${WA(.02)}" stroke="${WA(.13)}" stroke-width="1" id="n_h23"/>
  <circle cx="330" cy="75" r="9" fill="${OA(.08)}" stroke="${O()}" stroke-width="1.2" id="n_o1"/>
  <circle cx="330" cy="135" r="9" fill="${OA(.08)}" stroke="${O()}" stroke-width="1.2" id="n_o2"/>
  <circle cx="0" cy="0" r="4" fill="${O()}" opacity="0" filter="url(#agl)" id="ai_p0"/>
  <circle cx="0" cy="0" r="4" fill="${O()}" opacity="0" filter="url(#agl)" id="ai_p1"/>
  <circle cx="0" cy="0" r="4" fill="${O()}" opacity="0" filter="url(#agl)" id="ai_p2"/>
  <circle cx="0" cy="0" r="4" fill="${O()}" opacity="0" filter="url(#agl)" id="ai_p3"/>
  <text x="348" y="79" font-family="DM Mono,monospace" font-size="7.5" fill="${O()}" opacity="0" id="al1">0.94</text>
  <text x="348" y="139" font-family="DM Mono,monospace" font-size="7.5" fill="${O()}" opacity="0" id="al2">0.71</text>
</svg>`
}

export function svgDESIGN() {
  return `<svg viewBox="0 0 380 190" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="dgl"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="dpt" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="${WA(.05)}"/></pattern>
  </defs>
  <rect width="380" height="190" fill="url(#dpt)"/>
  <rect x="16" y="12" width="332" height="172" rx="3" fill="${WA(.025)}" stroke="${WA(.12)}" stroke-width="1"/>
  <line x1="16" y1="12" x2="16" y2="184" stroke="${WA(.06)}" stroke-width=".6" stroke-dasharray="3 5" id="dg1" opacity="0"/>
  <line x1="126" y1="12" x2="126" y2="184" stroke="${WA(.06)}" stroke-width=".6" stroke-dasharray="3 5" id="dg2" opacity="0"/>
  <line x1="236" y1="12" x2="236" y2="184" stroke="${WA(.06)}" stroke-width=".6" stroke-dasharray="3 5" id="dg3" opacity="0"/>
  <line x1="348" y1="12" x2="348" y2="184" stroke="${WA(.06)}" stroke-width=".6" stroke-dasharray="3 5" id="dg4" opacity="0"/>
  <line x1="16" y1="72" x2="348" y2="72" stroke="${WA(.06)}" stroke-width=".6" stroke-dasharray="3 5" id="dg5" opacity="0"/>
  <line x1="16" y1="134" x2="348" y2="134" stroke="${WA(.06)}" stroke-width=".6" stroke-dasharray="3 5" id="dg6" opacity="0"/>
  <rect x="16" y="12" width="332" height="20" rx="3" fill="${WA(.035)}"/>
  <rect x="26" y="19" width="0" height="6" rx="3" fill="${O}" opacity=".55" id="d_logo"/>
  <rect x="246" y="20" width="22" height="4.5" rx="2" fill="${WA(.2)}" opacity="0" id="d_na"/>
  <rect x="276" y="20" width="22" height="4.5" rx="2" fill="${WA(.15)}" opacity="0" id="d_nb"/>
  <rect x="304" y="18" width="38" height="8.5" rx="4" fill="${OA(.6)}" opacity="0" id="d_ncta"/>
  <rect x="28" y="42" width="0" height="11" rx="3.5" fill="${O}" opacity=".76" id="d_ht"/>
  <rect x="28" y="59" width="0" height="4.5" rx="2" fill="${WA(.26)}" id="d_hs1"/>
  <rect x="28" y="68" width="0" height="4.5" rx="2" fill="${WA(.18)}" id="d_hs2"/>
  <rect x="28" y="80" width="0" height="12" rx="4" fill="${OA(.7)}" id="d_hcta"/>
  <rect x="210" y="36" width="0" height="70" rx="5" fill="${WA(.04)}" stroke="${WA(.1)}" stroke-width=".7" id="d_img"/>
  <line x1="210" y1="36" x2="344" y2="106" stroke="${WA(.06)}" stroke-width=".6" id="d_x1" opacity="0"/>
  <line x1="344" y1="36" x2="210" y2="106" stroke="${WA(.06)}" stroke-width=".6" id="d_x2" opacity="0"/>
  <rect x="28" y="144" width="66" height="32" rx="4" fill="${WA(.03)}" stroke="${WA(.07)}" stroke-width=".6" opacity="0" id="d_c1"/>
  <rect x="100" y="144" width="66" height="32" rx="4" fill="${WA(.03)}" stroke="${WA(.07)}" stroke-width=".6" opacity="0" id="d_c2"/>
  <rect x="172" y="144" width="66" height="32" rx="4" fill="${OA(.07)}" stroke="${O()}" stroke-width=".7" opacity="0" id="d_c3"/>
  <rect x="244" y="144" width="66" height="32" rx="4" fill="${WA(.03)}" stroke="${WA(.07)}" stroke-width=".6" opacity="0" id="d_c4"/>
  <rect x="352" y="12" width="44" height="172" fill="${WA(.02)}" stroke="${WA(.06)}" stroke-width=".7"/>
  <circle cx="374" cy="50" r="0" fill="${O()}" id="d_s1"/>
  <circle cx="374" cy="76" r="0" fill="#c2410c" id="d_s2"/>
  <circle cx="374" cy="102" r="0" fill="${WA(.25)}" id="d_s3"/>
  <circle cx="374" cy="128" r="0" fill="${WA(.07)}" id="d_s4"/>
  <text x="374" y="158" text-anchor="middle" font-family="DM Mono,monospace" font-size="5.5" fill="${O()}" opacity="0" id="d_hex">${O()}</text>
  <rect x="0" y="0" width="0" height="0" rx="1.5" fill="none" stroke="#4f8ef7" stroke-width="1.2" opacity="0" stroke-dasharray="3 2" id="d_sel"/>
  <polygon points="0,0 0,0 0,0" fill="#4f8ef7" opacity="0" id="d_arrow"/>
</svg>`
}
