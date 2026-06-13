import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './SkillsCanvas.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  cat: string;
  color: string;
  logo: string;
}

interface CatMeta {
  color: string;
  desc: string;
}

interface NodeDatum {
  pos: THREE.Vector3;
  phase: number;
  amp: number;
}

interface EdgeMat {
  mat: THREE.LineBasicMaterial;
  catA: string;
  catB: string;
}

interface ZoneObj {
  outer: THREE.Mesh;
  inner: THREE.Mesh;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const DV = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/';
const SI = 'https://cdn.simpleicons.org/';
const dv = (p: string) => DV + p;
const si = (n: string, h: string) => `${SI}${n}/${h}`;

const CAT_META: Record<string, CatMeta> = {
  'Frontend': { color: '#61DAFB', desc: 'UI & Visual Layer'     },
  'Backend' : { color: '#68A063', desc: 'Server & Logic'        },
  'Database': { color: '#FF4438', desc: 'Data Storage'          },
  'AI & ML' : { color: '#FF6B1A', desc: 'Intelligence Layer'    },
  'DevOps'  : { color: '#2496ED', desc: 'Cloud & Infrastructure' },
  'Tools'   : { color: '#A259FF', desc: 'Dev Workflow'          },
};

const SKILLS: Skill[] = [
  { name: 'React',          cat: 'Frontend', color: '#61DAFB', logo: dv('react/react-original.svg') },
  { name: 'TypeScript',     cat: 'Frontend', color: '#3178C6', logo: dv('typescript/typescript-original.svg') },
  { name: 'Next.js',        cat: 'Frontend', color: '#e2e2e2', logo: dv('nextjs/nextjs-original.svg') },
  { name: 'Tailwind',       cat: 'Frontend', color: '#38BDF8', logo: dv('tailwindcss/tailwindcss-original.svg') },
  { name: 'JavaScript',     cat: 'Frontend', color: '#F7DF1E', logo: dv('javascript/javascript-original.svg') },
  { name: 'HTML5',          cat: 'Frontend', color: '#E34F26', logo: dv('html5/html5-original.svg') },
  { name: 'CSS3',           cat: 'Frontend', color: '#1572B6', logo: dv('css3/css3-original.svg') },
  { name: 'Sass',           cat: 'Frontend', color: '#CC6699', logo: dv('sass/sass-original.svg') },
  { name: 'Python',         cat: 'Backend',  color: '#FFD343', logo: dv('python/python-original.svg') },
  { name: 'FastAPI',        cat: 'Backend',  color: '#009688', logo: dv('fastapi/fastapi-original.svg') },
  { name: 'Node.js',        cat: 'Backend',  color: '#68A063', logo: dv('nodejs/nodejs-original.svg') },
  { name: 'Django',         cat: 'Backend',  color: '#44B78B', logo: dv('django/django-plain.svg') },
  { name: 'Express',        cat: 'Backend',  color: '#c8c8c8', logo: dv('express/express-original.svg') },
  { name: 'GraphQL',        cat: 'Backend',  color: '#E535AB', logo: dv('graphql/graphql-plain.svg') },
  { name: 'Java',           cat: 'Backend',  color: '#ED8B00', logo: dv('java/java-original.svg') },
  { name: 'Flask',          cat: 'Backend',  color: '#e2e2e2', logo: dv('flask/flask-original.svg') },
  { name: 'PostgreSQL',     cat: 'Database', color: '#336791', logo: dv('postgresql/postgresql-original.svg') },
  { name: 'MongoDB',        cat: 'Database', color: '#4DB33D', logo: dv('mongodb/mongodb-original.svg') },
  { name: 'Redis',          cat: 'Database', color: '#FF4438', logo: dv('redis/redis-original.svg') },
  { name: 'MySQL',          cat: 'Database', color: '#00758F', logo: dv('mysql/mysql-original.svg') },
  { name: 'Supabase',       cat: 'Database', color: '#3ECF8E', logo: si('supabase', '3ecf8e') },
  { name: 'SQLite',         cat: 'Database', color: '#0F80CC', logo: dv('sqlite/sqlite-original.svg') },
  { name: 'Claude',         cat: 'AI & ML',  color: '#D4A574', logo: si('anthropic', 'd4a574') },
  { name: 'TensorFlow',     cat: 'AI & ML',  color: '#FF6F00', logo: dv('tensorflow/tensorflow-original.svg') },
  { name: 'Groq',           cat: 'AI & ML',  color: '#F55036', logo: si('groq', 'f55036') },
  { name: 'scikit-learn',   cat: 'AI & ML',  color: '#F7931E', logo: si('scikitlearn', 'f7931e') },
  { name: 'Jupyter',        cat: 'AI & ML',  color: '#F37626', logo: dv('jupyter/jupyter-original.svg') },
  { name: 'Tableau',        cat: 'AI & ML',  color: '#E97627', logo: si('tableau', 'e97627') },
  { name: 'Docker',         cat: 'DevOps',   color: '#2496ED', logo: dv('docker/docker-original.svg') },
  { name: 'AWS',            cat: 'DevOps',   color: '#FF9900', logo: dv('amazonwebservices/amazonwebservices-plain-wordmark.svg') },
  { name: 'Vercel',         cat: 'DevOps',   color: '#e2e2e2', logo: si('vercel', 'ffffff') },
  { name: 'GitHub Actions', cat: 'DevOps',   color: '#2088FF', logo: dv('githubactions/githubactions-original.svg') },
  { name: 'Kubernetes',     cat: 'DevOps',   color: '#326DE6', logo: dv('kubernetes/kubernetes-original.svg') },
  { name: 'Azure',          cat: 'DevOps',   color: '#0089D6', logo: dv('azure/azure-original.svg') },
  { name: 'Git',            cat: 'Tools',    color: '#F05032', logo: dv('git/git-original.svg') },
  { name: 'Figma',          cat: 'Tools',    color: '#A259FF', logo: dv('figma/figma-original.svg') },
  { name: 'Postman',        cat: 'Tools',    color: '#FF6C37', logo: dv('postman/postman-original.svg') },
  { name: 'VS Code',        cat: 'Tools',    color: '#007ACC', logo: dv('vscode/vscode-original.svg') },
  { name: 'Linux',          cat: 'Tools',    color: '#FCC624', logo: dv('linux/linux-original.svg') },
  { name: 'GitHub',         cat: 'Tools',    color: '#c8c8c8', logo: dv('github/github-original.svg') },
];

const CAT_CENTERS: Record<string, THREE.Vector3> = {
  'Frontend': new THREE.Vector3(-2.4,  1.6,  0.9),
  'Backend' : new THREE.Vector3( 2.5,  0.7, -0.5),
  'Database': new THREE.Vector3(-0.8, -2.4,  1.3),
  'AI & ML' : new THREE.Vector3( 1.5, -1.7, -1.5),
  'DevOps'  : new THREE.Vector3( 0.3,  2.1, -2.1),
  'Tools'   : new THREE.Vector3(-2.5, -0.5, -1.3),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SkillsCanvas() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const ttRef          = useRef<HTMLDivElement>(null);
  const ttLogoRef      = useRef<HTMLImageElement>(null);
  const ttFbRef        = useRef<HTMLDivElement>(null);
  const ttNameRef      = useRef<HTMLDivElement>(null);
  const ttCatRef       = useRef<HTMLDivElement>(null);
  const ttBoxRef       = useRef<HTMLDivElement>(null);
  const countNumRef    = useRef<HTMLDivElement>(null);
  const catsRef        = useRef<HTMLDivElement>(null);
  const clusterRef     = useRef<HTMLDivElement>(null);
  const cpNameRef      = useRef<HTMLDivElement>(null);
  const cpDescRef      = useRef<HTMLDivElement>(null);
  const cpListRef      = useRef<HTMLDivElement>(null);
  const hintRef        = useRef<HTMLDivElement>(null);
  const resetBtnRef    = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;

    // ── Helpers ───────────────────────────────────────────────────────
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // ── Renderer ─────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, W() / H(), 0.1, 200);
    camera.position.set(0, 0, 11);

    const grp = new THREE.Group();
    scene.add(grp);

    // ── Starfield ────────────────────────────────────────────────────
    const starGeo = (() => {
      const n = 1600, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const r  = 22 + Math.random() * 28;
        pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        pos[i * 3 + 2] = r * Math.cos(ph);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return geo;
    })();
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.14 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Category label sprites ────────────────────────────────────────
    const catSprites: Record<string, THREE.Sprite> = {};
    const spriteTextures: THREE.CanvasTexture[] = [];
    const spriteMaterials: THREE.SpriteMaterial[] = [];

    Object.entries(CAT_META).forEach(([cat, m]) => {
      const cv = document.createElement('canvas');
      cv.width = 420; cv.height = 80;
      const ctx = cv.getContext('2d')!;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.textAlign = 'center';
      ctx.font = '700 32px "Syne",sans-serif';
      ctx.fillStyle = 'rgba(250,250,250,0.95)';
      ctx.textBaseline = 'top';
      ctx.fillText(cat.toUpperCase(), 210, 4);
      ctx.font = '500 14px "DM Mono",monospace';
      ctx.fillStyle = m.color;
      ctx.textBaseline = 'top';
      ctx.fillText(m.desc.toUpperCase(), 210, 46);
      const tex  = new THREE.CanvasTexture(cv);
      const mat  = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false });
      const sp   = new THREE.Sprite(mat);
      sp.scale.set(2.6, 0.5, 1);
      const c = CAT_CENTERS[cat];
      sp.position.set(c.x, c.y + 1.85, c.z);
      grp.add(sp);
      catSprites[cat] = sp;
      spriteTextures.push(tex);
      spriteMaterials.push(mat);
    });

    // ── Zone halos ───────────────────────────────────────────────────
    const zoneObjs: Record<string, ZoneObj> = {};
    const zoneMaterials: THREE.MeshBasicMaterial[] = [];

    Object.entries(CAT_META).forEach(([cat, m]) => {
      const c   = CAT_CENTERS[cat];
      const col = new THREE.Color(m.color);

      const outerMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.014, side: THREE.BackSide, depthWrite: false });
      const outer    = new THREE.Mesh(new THREE.SphereGeometry(1.55, 20, 20), outerMat);
      outer.position.copy(c); grp.add(outer);

      const innerMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.025, side: THREE.BackSide, depthWrite: false });
      const inner    = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 14), innerMat);
      inner.position.copy(c); grp.add(inner);

      zoneObjs[cat] = { outer, inner };
      zoneMaterials.push(outerMat, innerMat);
    });

    // ── Lighting ─────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(4, 6, 8);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x8ab4f8, 0.4);
    rimLight.position.set(-6, -2, -5);
    scene.add(rimLight);

    // ── Nodes ────────────────────────────────────────────────────────
    const nodeData: NodeDatum[]  = [];
    const dots: THREE.Mesh[]     = [];
    const rings: THREE.Mesh[]    = [];
    const dotMaterials:  THREE.MeshPhongMaterial[]   = [];
    const ringMaterials: THREE.MeshBasicMaterial[]   = [];
    const dotGeos:       THREE.SphereGeometry[]      = [];
    const ringGeos:      THREE.RingGeometry[]        = [];

    const catSkills: Record<string, number[]> = {};
    SKILLS.forEach((s, i) => {
      if (!catSkills[s.cat]) catSkills[s.cat] = [];
      catSkills[s.cat].push(i);
    });

    SKILLS.forEach((s, i) => {
      const center = CAT_CENTERS[s.cat];
      const list   = catSkills[s.cat];
      const pi     = list.indexOf(i), n = list.length;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const y2   = 1 - (pi / (n - 1 || 1)) * 2;
      const rad2 = Math.sqrt(1 - y2 * y2);
      const t2   = goldenAngle * pi;
      const spread = 1.08;

      const pos = new THREE.Vector3(
        center.x + Math.cos(t2) * rad2 * spread + (Math.random() - .5) * .06,
        center.y + y2 * spread + (Math.random() - .5) * .06,
        center.z + Math.sin(t2) * rad2 * spread + (Math.random() - .5) * .06,
      );

      const col     = new THREE.Color(s.color);
      const dotGeo  = new THREE.SphereGeometry(.072, 32, 32);
      const dotMat  = new THREE.MeshPhongMaterial({
        color: col, emissive: col, emissiveIntensity: 0.55,
        specular: new THREE.Color(0xffffff), shininess: 180,
        transparent: true, opacity: 1,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      dot.userData = { index: i };
      grp.add(dot);
      dots.push(dot);
      dotGeos.push(dotGeo);
      dotMaterials.push(dotMat);

      const ringGeo = new THREE.RingGeometry(.115, .128, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false });
      const ring    = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      grp.add(ring);
      rings.push(ring);
      ringGeos.push(ringGeo);
      ringMaterials.push(ringMat);

      nodeData.push({ pos: pos.clone(), phase: Math.random() * Math.PI * 2, amp: .038 + Math.random() * .038 });
    });

    // ── Edges ────────────────────────────────────────────────────────
    const edgeMats: EdgeMat[]  = [];
    const edgeGeos: THREE.BufferGeometry[] = [];
    const allEdgeLineMats: THREE.LineBasicMaterial[] = [];

    SKILLS.forEach((s, i) => {
      catSkills[s.cat].forEach(j => {
        if (j <= i) return;
        const d = dots[i].position.distanceTo(dots[j].position);
        if (d < 1.7) {
          const geo = new THREE.BufferGeometry().setFromPoints([dots[i].position, dots[j].position]);
          const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(s.color), transparent: true, opacity: .065 });
          grp.add(new THREE.Line(geo, mat));
          edgeMats.push({ mat, catA: s.cat, catB: SKILLS[j].cat });
          edgeGeos.push(geo);
          allEdgeLineMats.push(mat);
        }
      });
    });

    // Inter-cluster ghost links
    const ghostGeos: THREE.BufferGeometry[] = [];
    const cc = Object.values(CAT_CENTERS);
    for (let a = 0; a < cc.length; a++) {
      for (let b = a + 1; b < cc.length; b++) {
        const geo = new THREE.BufferGeometry().setFromPoints([cc[a], cc[b]]);
        grp.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .016 })));
        ghostGeos.push(geo);
      }
    }

    // ── Sidebar category buttons ──────────────────────────────────────
    const catsEl = catsRef.current!;
    Object.entries(CAT_META).forEach(([cat, _m]) => {
      const n   = SKILLS.filter(s => s.cat === cat).length;
      const btn = document.createElement('button');
      btn.className    = 'cat-btn';
      btn.dataset.cat  = cat;
      btn.innerHTML    = `<div class="cat-line"></div><span class="cat-label">${cat}</span><span class="cat-n">${n}</span>`;
      btn.addEventListener('click', () => { activeFilter === cat ? resetAll() : selectCat(cat); });
      catsEl.appendChild(btn);
    });

    // ── Camera / interaction state ────────────────────────────────────
    let rotX = 0, rotY = 0;
    let curRotX = 0, curRotY = 0;
    let tZoom = 11, cZoom = 11;
    let dragging = false, lastMx = 0, lastMy = 0, didDrag = false;
    let hovIdx = -1;
    let activeFilter: string | null = null;
    let focused = false;

    // ── Filter helpers ────────────────────────────────────────────────
    function applyFilter() {
      dots.forEach((dot, i) => {
        const s   = SKILLS[i];
        const vis = !activeFilter || s.cat === activeFilter;
        (dot.material as THREE.MeshPhongMaterial).color.set(vis ? new THREE.Color(s.color) : new THREE.Color(0x111118));
        dot.scale.setScalar(vis ? 1 : .22);
        ringMaterials[i].opacity = vis ? .28 : .008;
      });
      Object.entries(catSprites).forEach(([cat, sp]) => {
        const vis = !activeFilter || cat === activeFilter;
        (sp.material as THREE.SpriteMaterial).opacity = vis ? (activeFilter ? .92 : .7) : .05;
      });
      Object.entries(zoneObjs).forEach(([cat, z]) => {
        const vis = !activeFilter || cat === activeFilter;
        (z.outer.material as THREE.MeshBasicMaterial).opacity = vis ? (activeFilter ? .036 : .014) : .003;
        (z.inner.material as THREE.MeshBasicMaterial).opacity = vis ? (activeFilter ? .062 : .025) : .004;
      });
      edgeMats.forEach(({ mat, catA, catB }) => {
        const vis = !activeFilter || catA === activeFilter || catB === activeFilter;
        mat.opacity = vis ? .065 : .004;
      });
    }

    function selectCat(cat: string) {
      activeFilter = cat; focused = true;
      catsEl.querySelectorAll<HTMLButtonElement>('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));

      const n = SKILLS.filter(s => s.cat === cat).length;
      if (countNumRef.current) { countNumRef.current.textContent = String(n); countNumRef.current.classList.add('lit'); }

      const m = CAT_META[cat];
      if (cpNameRef.current) { cpNameRef.current.textContent = cat; cpNameRef.current.style.color = m.color; }
      if (cpDescRef.current) { cpDescRef.current.textContent = m.desc; }
      if (cpListRef.current) { cpListRef.current.textContent = SKILLS.filter(s => s.cat === cat).map(s => s.name).join('  ·  '); }
      clusterRef.current?.classList.add('on');
      if (resetBtnRef.current) resetBtnRef.current.style.display = 'block';
      hintRef.current?.classList.add('off');

      const c      = CAT_CENTERS[cat];
      const targetY = -Math.atan2(c.x, c.z);
      const targetX = -Math.atan2(c.y, Math.sqrt(c.x * c.x + c.z * c.z));
      let dY = targetY - rotY; dY = dY - Math.round(dY / (Math.PI * 2)) * Math.PI * 2;
      let dX = targetX - rotX; dX = dX - Math.round(dX / (Math.PI * 2)) * Math.PI * 2;
      rotY += dY; rotX += dX;
      tZoom = 6.5;
      applyFilter();
    }

    function resetAll() {
      activeFilter = null; focused = false;
      catsEl.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      if (countNumRef.current) { countNumRef.current.textContent = String(SKILLS.length); countNumRef.current.classList.remove('lit'); }
      clusterRef.current?.classList.remove('on');
      if (resetBtnRef.current) resetBtnRef.current.style.display = 'none';
      hintRef.current?.classList.remove('off');
      rotX = 0; rotY = 0; tZoom = 11;
      applyFilter();
    }

    // ── Tooltip ──────────────────────────────────────────────────────
    function showTT(i: number, mx: number, my: number) {
      const s = SKILLS[i];
      if (ttNameRef.current) { ttNameRef.current.textContent = s.name; ttNameRef.current.style.color = s.color; }
      if (ttCatRef.current)  { ttCatRef.current.textContent  = s.cat; }
      if (ttLogoRef.current) {
        ttLogoRef.current.src = s.logo;
        ttLogoRef.current.style.display = 'block';
        ttLogoRef.current.onerror = () => {
          if (!ttLogoRef.current || !ttFbRef.current) return;
          ttLogoRef.current.style.display = 'none';
          ttFbRef.current.style.display = 'flex';
          ttFbRef.current.style.background = s.color + '18';
          ttFbRef.current.style.color      = s.color;
          ttFbRef.current.style.border     = `1px solid ${s.color}33`;
          ttFbRef.current.textContent      = s.name.slice(0, 3).toUpperCase();
        };
      }
      if (ttFbRef.current)  ttFbRef.current.style.display = 'none';
      if (ttBoxRef.current) {
        ttBoxRef.current.style.borderColor = s.color + '20';
        ttBoxRef.current.style.boxShadow   = `0 16px 48px rgba(0,0,0,.6),0 0 30px ${s.color}0e`;
      }
      if (ttRef.current) {
        const flip = mx > W() - 210;
        ttRef.current.style.left      = (flip ? mx - 12 : mx + 12) + 'px';
        ttRef.current.style.top       = my + 'px';
        ttRef.current.style.transform = flip ? 'translate(-100%,-50%)' : 'translate(0,-50%)';
        ttRef.current.style.display   = 'block';
      }
    }

    function hideTT() {
      if (ttRef.current) ttRef.current.style.display = 'none';
    }

    // ── Raycasting ───────────────────────────────────────────────────
    const ray  = new THREE.Raycaster();
    const ndcV = new THREE.Vector2();

    function clearHov() {
      if (hovIdx < 0) return;
      const vis = !activeFilter || SKILLS[hovIdx].cat === activeFilter;
      dots[hovIdx].scale.setScalar(vis ? 1 : .22);
      ringMaterials[hovIdx].opacity = vis ? .28 : .008;
      hovIdx = -1;
    }

    // ── Depth cue ────────────────────────────────────────────────────
    const _wpos = new THREE.Vector3();
    function applyDepthCue() {
      const camWorld = camera.position.clone();
      dots.forEach((dot, i) => {
        dot.getWorldPosition(_wpos);
        const depth = _wpos.distanceTo(camWorld);
        const near  = cZoom - 3.5, far = cZoom + 5.5;
        const t     = Math.max(0, Math.min(1, (depth - near) / (far - near)));
        const opac  = 1.0 - t * 0.88;
        const s = SKILLS[i], vis = !activeFilter || s.cat === activeFilter;
        if (vis && hovIdx !== i) {
          dotMaterials[i].opacity  = opac;
          ringMaterials[i].opacity = opac * .30;
        }
      });
    }

    // ── Event handlers ────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      dragging = true; lastMx = e.clientX; lastMy = e.clientY; didDrag = false;
    };
    const onMouseUp = () => { dragging = false; };

    const onMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = e.clientX - lastMx, dy = e.clientY - lastMy;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag = true;
        rotY += dx * .005; rotX += dy * .005;
        rotX = Math.max(-1.1, Math.min(1.1, rotX));
        lastMx = e.clientX; lastMy = e.clientY;
        hideTT(); clearHov(); return;
      }
      ndcV.x = (e.clientX / W()) * 2 - 1;
      ndcV.y = -(e.clientY / H()) * 2 + 1;
      ray.setFromCamera(ndcV, camera);
      const hits = ray.intersectObjects(dots);
      clearHov();
      if (hits.length) {
        const idx = hits[0].object.userData.index as number | undefined;
        if (idx === undefined) { hideTT(); canvas.style.cursor = 'grab'; return; }
        const s   = SKILLS[idx];
        const vis = !activeFilter || s.cat === activeFilter;
        if (vis) {
          hovIdx = idx;
          dots[idx].scale.setScalar(1.55);
          ringMaterials[idx].opacity = .75;
          showTT(idx, e.clientX, e.clientY);
          canvas.style.cursor = 'pointer';
        } else { hideTT(); canvas.style.cursor = 'grab'; }
      } else { hideTT(); canvas.style.cursor = 'grab'; }
    };

    const onClick = () => {
      if (!didDrag && focused && hovIdx < 0) resetAll();
      didDrag = false;
    };

    const onWheel = (e: WheelEvent) => {
      tZoom = Math.max(4, Math.min(18, tZoom + e.deltaY * .012));
    };

    const onResize = () => {
      renderer.setSize(W(), H());
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
    };

    let lt = { x: 0, y: 0 }, ltd = 0;
    const onTouchStart = (e: TouchEvent) => {
      lt = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.touches.length === 2)
        ltd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        tZoom = Math.max(4, Math.min(18, tZoom - (d - ltd) * .035)); ltd = d; return;
      }
      const dx = e.touches[0].clientX - lt.x, dy = e.touches[0].clientY - lt.y;
      rotY += dx * .006; rotX += dy * .006;
      rotX = Math.max(-1.1, Math.min(1.1, rotX));
      lt = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    // Attach events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('click',     onClick);
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove',  onTouchMove, { passive: false });
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel',     onWheel, { passive: true });
    window.addEventListener('resize',    onResize);
    resetBtnRef.current?.addEventListener('click', resetAll);

    // ── Render loop ───────────────────────────────────────────────────
    let tick = 0;
    let rafId = 0;

    function frame() {
      rafId = requestAnimationFrame(frame);
      tick += .005;

      dots.forEach((dot, i) => {
        const d = nodeData[i];
        dot.position.set(
          d.pos.x + Math.sin(tick * .6  + d.phase)       * d.amp,
          d.pos.y + Math.cos(tick * .45 + d.phase * 1.3) * d.amp,
          d.pos.z + Math.sin(tick * .5  + d.phase * .7)  * d.amp,
        );
        rings[i].position.copy(dot.position);
        rings[i].lookAt(camera.position);
      });

      Object.entries(catSprites).forEach(([cat, sp], ki) => {
        const c = CAT_CENTERS[cat];
        sp.position.y = c.y + 1.85 + Math.sin(tick * .4 + ki * 1.1) * .05;
      });

      if (activeFilter && zoneObjs[activeFilter]) {
        const z = zoneObjs[activeFilter];
        (z.outer.material as THREE.MeshBasicMaterial).opacity = .034 + Math.sin(tick * 1.2) * .008;
        (z.inner.material as THREE.MeshBasicMaterial).opacity = .058 + Math.sin(tick * 1.6) * .013;
      }

      curRotX += (rotX - curRotX) * .07;
      curRotY += (rotY - curRotY) * .07;
      grp.rotation.x = curRotX;
      grp.rotation.y = curRotY;

      if (hovIdx >= 0) rings[hovIdx].scale.setScalar(1 + Math.sin(tick * 5) * .06);

      applyDepthCue();

      cZoom += (tZoom - cZoom) * .07;
      camera.position.z = cZoom;

      renderer.render(scene, camera);
    }

    frame();

    // ── Cleanup ───────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);

      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('click',      onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('mouseup',    onMouseUp);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('resize',     onResize);

      // Dispose geometries
      starGeo.dispose();
      dotGeos.forEach(g => g.dispose());
      ringGeos.forEach(g => g.dispose());
      edgeGeos.forEach(g => g.dispose());
      ghostGeos.forEach(g => g.dispose());
      Object.values(zoneObjs).forEach(z => {
        z.outer.geometry.dispose();
        z.inner.geometry.dispose();
      });

      // Dispose materials
      starMat.dispose();
      dotMaterials.forEach(m => m.dispose());
      ringMaterials.forEach(m => m.dispose());
      allEdgeLineMats.forEach(m => m.dispose());
      spriteMaterials.forEach(m => m.dispose());
      spriteTextures.forEach(t => t.dispose());
      zoneMaterials.forEach(m => m.dispose());

      // Dispose renderer
      renderer.dispose();

      // Remove injected cat buttons
      if (catsRef.current) catsRef.current.innerHTML = '';
    };
  }, []);

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <>
      <canvas ref={canvasRef} id="skills-canvas" />

      <div id="count-wrap">
        <div id="count-num" ref={countNumRef}>{SKILLS.length}</div>
        <div id="count-label">Technologies</div>
      </div>

      <div id="cats" ref={catsRef} />

      <div id="cluster-panel" ref={clusterRef}>
        <div id="cp-eyebrow">Cluster</div>
        <div id="cp-name" ref={cpNameRef} />
        <div id="cp-desc" ref={cpDescRef} />
        <div id="cp-list" ref={cpListRef} />
      </div>

      <div id="tt" ref={ttRef}>
        <div id="tt-box" ref={ttBoxRef}>
          <img id="tt-logo" ref={ttLogoRef} src="" alt="" />
          <div id="tt-fb" ref={ttFbRef} />
          <div>
            <div id="tt-name" ref={ttNameRef} />
            <div id="tt-cat"  ref={ttCatRef}  />
          </div>
        </div>
      </div>

      <div id="hint" ref={hintRef}>Drag to orbit &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click a category</div>
      <button id="reset-btn" ref={resetBtnRef}>↩ &nbsp;Show all</button>
    </>
  );
}
