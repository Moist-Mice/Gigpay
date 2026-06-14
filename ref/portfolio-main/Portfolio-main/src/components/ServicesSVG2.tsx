import { O, OA, WA } from './ServicesAnims'

export function svgSECURITY() {
  return `<svg viewBox="0 0 380 190" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="sgl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect x="2" y="2" width="268" height="186" rx="7" fill="${WA(.022)}" stroke="${WA(.09)}" stroke-width="1"/>
  <rect x="2" y="2" width="268" height="24" rx="7" fill="${WA(.04)}"/>
  <rect x="2" y="15" width="268" height="11" fill="${WA(.03)}"/>
  <circle cx="16" cy="13" r="4" fill="${WA(.1)}"/>
  <circle cx="28" cy="13" r="4" fill="${WA(.1)}"/>
  <circle cx="40" cy="13" r="4" fill="${OA(.42)}"/>
  <text x="136" y="16" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="${WA(.24)}">audit.sh</text>
  <text x="14" y="40"  font-family="DM Mono,monospace" font-size="7.5" fill="${OA(.7)}"  opacity="0" id="sl1">$ nmap -sV --script vuln target.io</text>
  <text x="14" y="54"  font-family="DM Mono,monospace" font-size="7"   fill="${WA(.34)}" opacity="0" id="sl2">Starting Nmap 7.94 scan...</text>
  <text x="14" y="66"  font-family="DM Mono,monospace" font-size="7"   fill="${WA(.28)}" opacity="0" id="sl3">Scanning ports 1–65535</text>
  <text x="14" y="80"  font-family="DM Mono,monospace" font-size="7"   fill="${OA(.48)}" opacity="0" id="sl4">PORT    STATE  SERVICE</text>
  <text x="14" y="92"  font-family="DM Mono,monospace" font-size="7"   fill="${WA(.26)}" opacity="0" id="sl5">22/tcp  open   ssh</text>
  <text x="14" y="103" font-family="DM Mono,monospace" font-size="7"   fill="${WA(.26)}" opacity="0" id="sl6">80/tcp  open   http</text>
  <text x="14" y="114" font-family="DM Mono,monospace" font-size="7"   fill="${WA(.26)}" opacity="0" id="sl7">443/tcp open   https</text>
  <text x="14" y="128" font-family="DM Mono,monospace" font-size="7.5" fill="#ef4444"   opacity="0" id="sl8">⚠  CVE-2021-41773  Path Traversal</text>
  <text x="14" y="141" font-family="DM Mono,monospace" font-size="7.5" fill="#ef4444"   opacity="0" id="sl9">⚠  SQLi vector found in /login</text>
  <text x="14" y="155" font-family="DM Mono,monospace" font-size="7.5" fill="${OA(.78)}" opacity="0" id="sl10">✓  Patch report generated</text>
  <rect x="2" y="38" width="268" height="1.5" fill="${O()}" opacity="0" id="s_beam"/>
  <rect x="14" y="164" width="6" height="10" rx="1" fill="${O()}" opacity="0" id="s_cur"/>
  <rect x="2" y="122" width="268" height="24" rx="0" fill="#ef4444" opacity="0" id="s_flash"/>
  <circle cx="-10" cy="90" r="3.5" fill="#ef4444" opacity="0" filter="url(#sgl)" id="s_pkt"/>
  <rect x="282" y="2" width="96" height="186" rx="7" fill="${WA(.02)}" stroke="${WA(.07)}" stroke-width=".7"/>
  <text x="330" y="20" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.26)}">STATUS</text>
  <path d="M330 30 L344 38 L344 56 Q344 70 330 78 Q316 70 316 56 L316 38 Z" fill="${OA(.05)}" stroke="${O()}" stroke-width="1.1" opacity="0" id="s_shield"/>
  <rect x="324" y="54" width="11" height="9" rx="2" fill="${OA(.18)}" stroke="${O()}" stroke-width=".7" opacity="0" id="s_lock"/>
  <path d="M327 54 L327 51 Q327 47 330 47 Q333 47 333 51 L333 54" stroke="${O()}" stroke-width=".7" fill="none" opacity="0" id="s_arch"/>
  <circle cx="296" cy="100" r="0" fill="#22c55e" id="ss1"/>
  <circle cx="296" cy="116" r="0" fill="#22c55e" id="ss2"/>
  <circle cx="296" cy="132" r="0" fill="#ef4444" id="ss3"/>
  <circle cx="296" cy="148" r="0" fill="#f59e0b" id="ss4"/>
  <text x="305" y="104" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.28)}" opacity="0" id="st1">SSH  ✓</text>
  <text x="305" y="120" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.28)}" opacity="0" id="st2">TLS  ✓</text>
  <text x="305" y="136" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.28)}" opacity="0" id="st3">SQLi ✗</text>
  <text x="305" y="152" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.28)}" opacity="0" id="st4">CVE  !</text>
</svg>`
}

export function svgAUTOMATION() {
  return `<svg viewBox="0 0 380 190" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="pgl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="apg" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="${WA(.04)}"/></pattern>
  </defs>
  <rect width="380" height="190" fill="url(#apg)"/>
  <line x1="14" y1="80" x2="366" y2="80" stroke="${WA(.07)}" stroke-width="1.2"/>
  <rect x="14" y="79" width="0" height="2.5" rx="1.2" fill="${O()}" id="p_flow"/>
  <rect x="14" y="58" width="58" height="44" rx="6" fill="${WA(.03)}" stroke="${WA(.1)}" stroke-width="1" id="pb1"/>
  <text x="43" y="74" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="${WA(.28)}">CRON</text>
  <text x="43" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.18)}">trigger</text>
  <text x="43" y="97" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${OA(0)}" id="pt1">✓ fired</text>
  <polygon points="76,76 84,80 76,84" fill="${WA(.12)}" id="pa1"/>
  <rect x="90" y="58" width="58" height="44" rx="6" fill="${WA(.03)}" stroke="${WA(.1)}" stroke-width="1" id="pb2"/>
  <text x="119" y="74" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="${WA(.28)}">BASH</text>
  <text x="119" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.18)}">process</text>
  <text x="119" y="97" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${OA(0)}" id="pt2">✓ done</text>
  <polygon points="152,76 160,80 152,84" fill="${WA(.12)}" id="pa2"/>
  <rect x="166" y="58" width="58" height="44" rx="6" fill="${WA(.03)}" stroke="${WA(.1)}" stroke-width="1" id="pb3"/>
  <text x="195" y="74" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="${WA(.28)}">API</text>
  <text x="195" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.18)}">post</text>
  <text x="195" y="97" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${OA(0)}" id="pt3">✓ 200</text>
  <polygon points="228,76 236,80 228,84" fill="${WA(.12)}" id="pa3"/>
  <rect x="242" y="58" width="58" height="44" rx="6" fill="${WA(.03)}" stroke="${WA(.1)}" stroke-width="1" id="pb4"/>
  <text x="271" y="74" text-anchor="middle" font-family="DM Mono,monospace" font-size="8" fill="${WA(.28)}">CI/CD</text>
  <text x="271" y="86" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.18)}">deploy</text>
  <text x="271" y="97" text-anchor="middle" font-family="DM Mono,monospace" font-size="6.5" fill="${OA(0)}" id="pt4">✓ live</text>
  <polygon points="304,76 312,80 304,84" fill="${WA(.12)}" id="pa4"/>
  <rect x="318" y="54" width="48" height="52" rx="6" fill="${OA(0)}" stroke="${O()}" stroke-width="1.1" id="pb5" opacity="0"/>
  <text x="342" y="82" text-anchor="middle" font-family="DM Mono,monospace" font-size="16" fill="${O()}" opacity="0" id="p_ck">✓</text>
  <text x="342" y="96" text-anchor="middle" font-family="DM Mono,monospace" font-size="6" fill="${O()}" opacity="0" id="p_dn">done</text>
  <circle cx="-10" cy="80" r="4.5" fill="${O()}" opacity="0" filter="url(#pgl)" id="p_tok"/>
  <rect x="14" y="122" width="0" height="15" rx="3.5" fill="${OA(.07)}" stroke="${O()}" stroke-width=".6" id="p_cbar"/>
  <text x="24" y="133" font-family="DM Mono,monospace" font-size="7" fill="${O()}" opacity="0" id="p_ct">$ cron: 0 */6 * * *  →  next run in 2h 14m</text>
  <text x="14" y="154" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.19)}" opacity="0" id="p_l1">[06:00:01] Pipeline started</text>
  <text x="14" y="166" font-family="DM Mono,monospace" font-size="6.5" fill="${WA(.19)}" opacity="0" id="p_l2">[06:00:09] All tasks completed — 0 errors</text>
</svg>`
}

export function svgDATABASE() {
  return `<svg viewBox="0 0 380 190" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="dbgl"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <pattern id="dbp" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0L0 0L0 16" fill="none" stroke="${WA(.03)}" stroke-width=".5"/></pattern>
  </defs>
  <rect width="380" height="190" fill="url(#dbp)"/>
  <rect x="8" y="12" width="148" height="158" rx="5" fill="${WA(.022)}" stroke="${WA(.09)}" stroke-width="1"/>
  <rect x="8" y="12" width="148" height="24" rx="5" fill="${OA(.1)}" stroke="${O()}" stroke-width=".7"/>
  <rect x="8" y="26" width="148" height="10" fill="${OA(.06)}"/>
  <text x="82" y="27" text-anchor="middle" font-family="DM Mono,monospace" font-size="8.5" font-weight="600" fill="${O()}">users</text>
  <rect x="18" y="44" width="9" height="4" rx="2" fill="${O()}" opacity=".5"/>
  <rect x="34" y="44" width="44" height="4" rx="2" fill="${WA(.28)}"/>
  <rect x="86" y="44" width="48" height="4" rx="2" fill="${WA(.18)}"/>
  <line x1="8" y1="54" x2="156" y2="54" stroke="${WA(.07)}" stroke-width=".6"/>
  <rect x="18" y="62" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="32" y="62" width="36" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="80" y="62" width="50" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="18" y="73" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="32" y="73" width="30" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="80" y="73" width="46" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="18" y="84" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="32" y="84" width="40" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="80" y="84" width="44" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="18" y="95" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="32" y="95" width="34" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="80" y="95" width="52" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="18" y="106" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="32" y="106" width="38" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="80" y="106" width="48" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="224" y="12" width="148" height="158" rx="5" fill="${WA(.022)}" stroke="${WA(.09)}" stroke-width="1"/>
  <rect x="224" y="12" width="148" height="24" rx="5" fill="${OA(.1)}" stroke="${O()}" stroke-width=".7"/>
  <rect x="224" y="26" width="148" height="10" fill="${OA(.06)}"/>
  <text x="298" y="27" text-anchor="middle" font-family="DM Mono,monospace" font-size="8.5" font-weight="600" fill="${O()}">orders</text>
  <rect x="234" y="44" width="9" height="4" rx="2" fill="${O()}" opacity=".5"/>
  <rect x="250" y="44" width="44" height="4" rx="2" fill="${WA(.28)}"/>
  <rect x="302" y="44" width="48" height="4" rx="2" fill="${WA(.18)}"/>
  <line x1="224" y1="54" x2="372" y2="54" stroke="${WA(.07)}" stroke-width=".6"/>
  <rect x="234" y="62" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="248" y="62" width="40" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="298" y="62" width="48" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="234" y="73" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="248" y="73" width="32" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="298" y="73" width="54" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="234" y="84" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="248" y="84" width="44" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="298" y="84" width="42" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="234" y="95" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="248" y="95" width="36" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="298" y="95" width="50" height="3" rx="1" fill="${WA(.14)}"/>
  <rect x="234" y="106" width="7" height="3" rx="1" fill="${O()}" opacity=".35"/>
  <rect x="248" y="106" width="42" height="3" rx="1" fill="${WA(.2)}"/>
  <rect x="298" y="106" width="46" height="3" rx="1" fill="${WA(.14)}"/>
  <line x1="156" y1="68" x2="224" y2="68" stroke="${O()}" stroke-width="1.3" opacity="0" stroke-dasharray="68" stroke-dashoffset="68" id="db_j1"/>
  <circle cx="156" cy="68" r="0" fill="${O()}" id="db_d1"/>
  <circle cx="224" cy="68" r="0" fill="${O()}" id="db_d2"/>
  <line x1="156" y1="84" x2="224" y2="84" stroke="${O()}" stroke-width=".8" opacity="0" stroke-dasharray="68" stroke-dashoffset="68" id="db_j2"/>
  <rect x="166" y="56" width="0" height="13" rx="3.5" fill="${OA(.1)}" stroke="${O()}" stroke-width=".6" id="db_badge"/>
  <text x="190" y="65" text-anchor="middle" font-family="DM Mono,monospace" font-size="7" fill="${O()}" opacity="0" id="db_jlbl">JOIN</text>
  <rect x="8" y="60" width="148" height="11" rx="0" fill="${OA(.1)}" opacity="0" id="db_cur"/>
  <rect x="8" y="178" width="0" height="10" rx="3" fill="${OA(.07)}" stroke="${O()}" stroke-width=".6" id="db_qbar"/>
  <text x="16" y="186" font-family="DM Mono,monospace" font-size="6.5" fill="${O()}" opacity="0" id="db_qt">SELECT u.name, o.total FROM users JOIN orders ON user_id</text>
</svg>`
}
