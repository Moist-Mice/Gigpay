// Scroll-driven animation helpers — ported from reference HTML
export const O  = () => isDark() ? '#FF6B1A' : '#0094E5'
export const OA = (a: number) => isDark() ? `rgba(255,107,26,${a})` : `rgba(0,148,229,${a})`
// WA is theme-aware: dark = light rgba, light = dark rgba
export const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
export const WA = (a: number) => isDark() ? `rgba(237,233,227,${a})` : `rgba(15,15,15,${a})`

const norm  = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t
const ease  = (t: number) => t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2
const eNorm = (v: number, a: number, b: number) => ease(norm(v, a, b))
const G   = (id: string): SVGElement | null => document.getElementById(id) as SVGElement | null
const W   = (id: string, v: number) => { const e = G(id); if (e) e.setAttribute('width', String(Math.max(0, v))) }
const R   = (id: string, v: number) => { const e = G(id); if (e) e.setAttribute('r', String(Math.max(0, v))) }
const Op  = (id: string, v: number) => { const e = G(id); if (e) e.style.opacity = String(Math.max(0, Math.min(1, v))) }

function nodeGlow(id: string, g: number, baseStroke: string, baseFill: string) {
  const e = G(id); if (!e) return
  e.setAttribute('stroke', g > 0.05 ? OA(+(0.2 + g * .8).toFixed(2)) : baseStroke)
  e.setAttribute('fill',   g > 0.05 ? OA(+(g * .2).toFixed(2))        : baseFill)
}

export function animWeb(p: number) {
  const lines: [string, number, number, number][] = [
    ['w_l0',.0,.12,90],['w_l1',.06,.18,110],['w_l2',.10,.22,70],
    ['w_l3',.14,.26,140],['w_l4',.18,.30,100],['w_l5',.22,.34,80],['w_l6',.26,.38,120],
  ]
  lines.forEach(([id,a,b,mW]) => W(id, lerp(0, mW, eNorm(p,a,b))))
  Op('w_l7', eNorm(p,.30,.44)); Op('w_l8', eNorm(p,.34,.48)); Op('w_l9', eNorm(p,.38,.52))
  Op('w_linehl', eNorm(p,.26,.38))
  const cur = G('w_cur')
  if (cur) {
    cur.setAttribute('y', String(lerp(30, 130, Math.min(1, p * 1.5))))
    cur.style.opacity = p < .52 ? (Math.floor(p * 18) % 2 === 0 ? '.85' : '.1') : '.85'
  }
  W('w_url', lerp(0,86,eNorm(p,.04,.20))); W('w_h1', lerp(0,90,eNorm(p,.08,.26)))
  W('w_sl1', lerp(0,82,eNorm(p,.14,.32))); W('w_sl2', lerp(0,68,eNorm(p,.18,.36)))
  W('w_btn', lerp(0,58,eNorm(p,.24,.42)))
  const ip = eNorm(p,.22,.44)
  Op('w_img',ip); Op('w_ix1',ip); Op('w_ix2',ip)
  Op('w_c1',eNorm(p,.38,.54)); Op('w_c2',eNorm(p,.44,.58)); Op('w_c3',eNorm(p,.50,.64))
  W('w_c3t',lerp(0,38,eNorm(p,.54,.68))); W('w_c3l',lerp(0,32,eNorm(p,.58,.72)))
  const pkt = G('w_pkt')
  if (pkt && p > 0.46) {
    const t = norm(p,.46,1.0), cycle = (t*1.6)%1
    let px: number, py: number
    if (cycle < 0.44) { const cp=ease(norm(cycle,0,.44)); px=lerp(190,310,cp); py=90-Math.sin(cp*Math.PI)*20 }
    else if (cycle < 0.52) { px=310; py=90 }
    else { const cp=ease(norm(cycle,.52,1)); px=lerp(310,190,cp); py=90+Math.sin(cp*Math.PI)*16 }
    pkt.setAttribute('cx',String(px)); pkt.setAttribute('cy',String(py))
    pkt.style.opacity = cycle < .02 ? '0' : '0.88'
    Op('w_200', cycle>.43&&cycle<.55 ? norm(cycle,.43,.50) : cycle>.55 ? norm(cycle,.55,.62) : 0)
  } else if (pkt) pkt.style.opacity='0'
}

export function animAI(p: number) {
  const PATHS = [
    [{x:50,y:48},{x:138,y:32},{x:232,y:55},{x:330,y:75}],
    [{x:50,y:95},{x:138,y:78},{x:232,y:95},{x:330,y:75}],
    [{x:50,y:95},{x:138,y:120},{x:232,y:135},{x:330,y:135}],
    [{x:50,y:142},{x:138,y:162},{x:232,y:135},{x:330,y:135}],
  ]
  const t = (p*2)%1
  const glow: Record<string,number> = {h11:0,h12:0,h13:0,h14:0,h21:0,h22:0,h23:0,o1:0,o2:0}
  PATHS.forEach((path,pi) => {
    const phase=(t+pi*.25)%1, el=G(`ai_p${pi}`); if(!el) return
    const seg=phase*(path.length-1), si=Math.min(path.length-2,Math.floor(seg)), sf=ease(seg-si)
    el.setAttribute('cx',String(lerp(path[si].x,path[si+1].x,sf)))
    el.setAttribute('cy',String(lerp(path[si].y,path[si+1].y,sf)))
    el.setAttribute('r',String(lerp(2.5,5,Math.sin(phase*Math.PI))))
    el.style.opacity=(Math.sin(phase*Math.PI)*.9).toFixed(2)
    const opac=Math.sin(phase*Math.PI)
    const atH1=(si===0&&sf>.65)||(si===1&&sf<.35), atH2=(si===1&&sf>.65)||(si===2&&sf<.35), atOut=si===2&&sf>.5
    const h1m=['h11','h12','h13','h14'],h2m=['h21','h22','h23','h23'],om=['o1','o1','o2','o2']
    if(atH1) glow[h1m[pi]]=Math.max(glow[h1m[pi]],opac)
    if(atH2) glow[h2m[pi]]=Math.max(glow[h2m[pi]],opac)
    if(atOut) glow[om[pi]]=Math.max(glow[om[pi]],opac)
  })
  ['n_h11','n_h12','n_h13','n_h14'].forEach((id,i)=>nodeGlow(id,glow[['h11','h12','h13','h14'][i]],WA(.13),WA(.02)))
  ['n_h21','n_h22','n_h23'].forEach((id,i)=>nodeGlow(id,glow[['h21','h22','h23'][i]],WA(.13),WA(.02)))
  ;['n_o1','n_o2'].forEach((id,i)=>{
    const g=glow[['o1','o2'][i]],e=G(id); if(!e) return
    e.setAttribute('stroke',OA(+(.5+g*.5).toFixed(2))); e.setAttribute('fill',OA(+(.06+g*.18).toFixed(2)))
  })
  Op('al1',eNorm(p,.55,.78)); Op('al2',eNorm(p,.60,.82))
}

export function animDesign(p: number) {
  ;['dg1','dg2','dg3','dg4','dg5','dg6'].forEach((id,i)=>Op(id,eNorm(p,i*.015,i*.015+.14)))
  W('d_logo',lerp(0,48,eNorm(p,.04,.22))); W('d_ht',lerp(0,140,eNorm(p,.08,.28)))
  W('d_hs1',lerp(0,128,eNorm(p,.14,.34))); W('d_hs2',lerp(0,110,eNorm(p,.18,.38)))
  W('d_hcta',lerp(0,66,eNorm(p,.24,.44))); W('d_img',lerp(0,134,eNorm(p,.22,.48)))
  Op('d_x1',eNorm(p,.30,.50)); Op('d_x2',eNorm(p,.30,.50))
  Op('d_na',eNorm(p,.34,.52)); Op('d_nb',eNorm(p,.38,.56)); Op('d_ncta',eNorm(p,.42,.60))
  Op('d_c1',eNorm(p,.46,.62)); Op('d_c2',eNorm(p,.50,.66)); Op('d_c3',eNorm(p,.54,.70)); Op('d_c4',eNorm(p,.58,.74))
  R('d_s1',lerp(0,8.5,eNorm(p,.52,.68))); R('d_s2',lerp(0,8.5,eNorm(p,.58,.72)))
  R('d_s3',lerp(0,8.5,eNorm(p,.64,.76))); R('d_s4',lerp(0,8.5,eNorm(p,.68,.80)))
  Op('d_hex',eNorm(p,.74,.90))
  const sel=G('d_sel'),arr=G('d_arrow')
  if(sel&&p>0.36){
    const t=norm(p,.36,1.0)
    const stops=[[28,42,140,11],[210,36,134,70],[172,144,66,32],[352,44,44,94]]
    const cycle=(t*3)%1,si=Math.min(stops.length-2,Math.floor(cycle*(stops.length-1)))
    const sf=ease(cycle*(stops.length-1)-si)
    const [x,y,w,h]=stops[si].map((v,k)=>lerp(v,stops[si+1][k],sf))
    sel.setAttribute('x',String(x-2)); sel.setAttribute('y',String(y-2))
    sel.setAttribute('width',String(w+4)); sel.setAttribute('height',String(h+4))
    sel.style.opacity=String(0.7+Math.sin(t*Math.PI)*.3)
    arr?.setAttribute('points',`${x-2},${y-2} ${x+5},${y+8} ${x+1},${y+8}`)
    if(arr) arr.style.opacity=sel.style.opacity
  } else { if(sel)sel.style.opacity='0'; if(arr)arr.style.opacity='0' }
}

export function animSecurity(p: number) {
  ;['sl1','sl2','sl3','sl4','sl5','sl6','sl7','sl8','sl9','sl10'].forEach((id,i)=>Op(id,eNorm(p,i*.076,i*.076+.09)))
  const cur=G('s_cur')
  if(cur){ cur.setAttribute('y',String(lerp(36,164,Math.min(1,p*1.06)))); cur.style.opacity=Math.floor(p*14)%2===0?'.9':'.15' }
  const bm=G('s_beam')
  if(bm){ bm.setAttribute('y',String(lerp(38,160,eNorm(p,.03,.86)))); bm.style.opacity=String(0.10+eNorm(p,.08,.9)*.20) }
  const flash=G('s_flash'); if(flash) flash.style.opacity=(Math.sin(norm(p,.56,.68)*Math.PI)*.18).toFixed(2)
  const pkt=G('s_pkt')
  if(pkt&&p>0.58){ const t=norm(p,.58,1.0),cycle=(t*2)%1,going=cycle<0.5,cp=going?ease(cycle*2):ease(1-(cycle-.5)*2)
    pkt.setAttribute('cx',String(going?lerp(136,330,cp):lerp(330,136,cp))); pkt.setAttribute('cy',String(lerp(90,60,Math.sin(cp*Math.PI)*.3+.35))); pkt.style.opacity=(Math.sin(cycle*Math.PI)*.85).toFixed(2)
  } else if(pkt) pkt.style.opacity='0'
  Op('s_shield',eNorm(p,.38,.56)); Op('s_lock',eNorm(p,.44,.60)); Op('s_arch',eNorm(p,.44,.60))
  ;[[0,.52],[1,.58],[2,.64],[3,.70]].forEach(([i,t])=>{ R(`ss${i+1}`,lerp(0,4,eNorm(p,t,t+.12))); Op(`st${i+1}`,eNorm(p,t+.05,t+.18)) })
}

export function animAutomation(p: number) {
  W('p_flow',lerp(0,352,eNorm(p,0,.90)))
  const th=[0,.18,.38,.58,.76]
  ;['pb1','pb2','pb3','pb4'].forEach((id,i)=>{
    const v=eNorm(p,th[i],th[i]+.20),e=G(id); if(!e) return
    e.setAttribute('stroke',OA(+v.toFixed(2))); e.setAttribute('fill',OA(+(v*.1).toFixed(2)))
    Op(`pt${i+1}`,eNorm(p,th[i]+.16,th[i]+.30))
    const a=G(`pa${i+1}`); if(a) a.setAttribute('fill',OA(+eNorm(p,th[i]+.10,th[i]+.22).toFixed(2)))
  })
  const d=eNorm(p,.78,.94); Op('pb5',d); Op('p_ck',d); Op('p_dn',d)
  const b5=G('pb5'); if(b5) b5.setAttribute('fill',OA(+(d*.12).toFixed(2)))
  W('p_cbar',lerp(0,352,eNorm(p,.84,1))); Op('p_ct',eNorm(p,.88,1)); Op('p_l1',eNorm(p,.90,1)); Op('p_l2',eNorm(p,.94,1))
  const tok=G('p_tok')
  if(tok&&p>0.08){ const t=norm(p,.08,1.0),cycle=(t*1.8)%1,stops=[43,119,195,271,342],seg=cycle*(stops.length-1),si=Math.min(stops.length-2,Math.floor(seg)),sf=ease(seg-si)
    tok.setAttribute('cx',String(lerp(stops[si],stops[si+1],sf))); tok.setAttribute('cy','80'); tok.setAttribute('r',String(lerp(3,5,Math.sin(cycle*Math.PI)))); tok.style.opacity=(0.5+Math.sin(cycle*Math.PI)*.45).toFixed(2)
  } else if(tok) tok.style.opacity='0'
}

export function animDatabase(p: number) {
  const j1=G('db_j1')
  if(j1){ const rp=eNorm(p,.12,.50); j1.setAttribute('stroke-dashoffset',String(lerp(68,0,rp))); j1.style.opacity=rp>0?'1':'0' }
  R('db_d1',lerp(0,4.5,eNorm(p,.18,.44))); R('db_d2',lerp(0,4.5,eNorm(p,.32,.56)))
  W('db_badge',lerp(0,48,eNorm(p,.42,.60))); Op('db_jlbl',eNorm(p,.48,.64))
  const j2=G('db_j2')
  if(j2){ const r2=eNorm(p,.46,.72); j2.setAttribute('stroke-dashoffset',String(lerp(68,0,r2))); j2.style.opacity=r2>0?'.5':'0' }
  const cur=G('db_cur')
  if(cur&&p>0.50){ const t=norm(p,.50,.92),rows=[62,73,84,95,106],cycle=(t*2.5)%1,ri=Math.floor(cycle*rows.length)%rows.length,nextRi=(ri+1)%rows.length,rf=ease((cycle*rows.length)%1),ry=lerp(rows[ri],rows[nextRi],rf)
    cur.setAttribute('y',String(ry-1)); cur.style.opacity=(0.4+Math.sin(cycle*Math.PI*rows.length)*.2).toFixed(2)
  } else if(cur) cur.style.opacity='0'
  W('db_qbar',lerp(0,364,eNorm(p,.66,.94))); Op('db_qt',eNorm(p,.70,.94))
}

export const animFns: Record<string,(p:number)=>void> = {
  web:animWeb, ai:animAI, design:animDesign, security:animSecurity, automation:animAutomation, database:animDatabase
}
