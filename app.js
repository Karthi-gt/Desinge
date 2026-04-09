/* ═══════════════════════════════════════════════════════════
   ANTIGRAVITY ARCHITECT — Application Engine v3
   Zero-Gravity AI Architectural Platform
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── State ──────────────────────────────────────────────── */
const STATE = {
  activeSection: 'site',
  renderMode: 'solid',
  isGenerating: false,
  isListening: false,
  exploded: false,
  isDragging: false,
  designAngle: { x: 28, y: 35 },
  designScale: 1.0,
  sunAngle: 50,
  costCurrent: 0,
  particles: [],
  buildingParts: [],
  assembleStarted: false,
  designLoopRunning: false,
};

/* ── DOM helpers ────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = s  => document.querySelectorAll(s);

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  setupParticles();
  setupCursor();
  setupNav();
  setupTerrain();
  setupAICore();
  setupSliders();
  setupButtons();
  setupCompare();
  setupGenerateBtn();
  setupParallax();
  setupTimeline();
  // Design view: start immediately via IntersectionObserver — fires when canvas becomes visible
  const designCanvas = document.getElementById('designCanvas');
  if (designCanvas) {
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        onDesignSectionVisible();
      }
    }, { threshold: 0.01 });
    io.observe(designCanvas);
  }
});

/* ═══════════════════════════════════════════════════════════
   PARTICLE SYSTEM
═══════════════════════════════════════════════════════════ */
function setupParticles() {
  const canvas = $('particleCanvas');
  const ctx = canvas.getContext('2d');

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const mkP = (x, y, vx, vy) => ({
    x:  x  ?? Math.random() * canvas.width,
    y:  y  ?? Math.random() * canvas.height,
    vx: vx ?? (Math.random() - 0.5) * 0.45,
    vy: vy ?? (Math.random() - 0.5) * 0.45 - 0.08,
    r:  Math.random() * 1.8 + 0.3,
    a:  Math.random() * 0.85 + 0.1,
    da: (Math.random() - 0.5) * 0.008,
    streak: Math.random() > 0.72,
    color: Math.random() > 0.65
      ? `hsl(${170 + Math.random() * 80},100%,72%)`
      : '#fff',
  });

  for (let i = 0; i < 200; i++) STATE.particles.push(mkP());

  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    STATE.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.a += p.da;
      if (p.a > 1 || p.a < 0.05) p.da *= -1;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.save(); ctx.globalAlpha = p.a;
      if (p.streak) {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.r * 0.5;
        ctx.shadowColor = p.color; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 18, p.y - p.vy * 18); ctx.stroke();
      } else {
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
    requestAnimationFrame(tick);
  })();

  window.spawnBurst = (cx, cy, n = 70) => {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 / n) * i, s = Math.random() * 4 + 1;
      STATE.particles.push(mkP(cx, cy, Math.cos(a)*s, Math.sin(a)*s));
    }
    if (STATE.particles.length > 320) STATE.particles.splice(0, n);
  };
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM CURSOR
═══════════════════════════════════════════════════════════ */
function setupCursor() {
  const glow = $('cursorGlow'), dot = $('cursorDot');
  let mx = 0, my = 0, gx = 0, gy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });

  (function lag() {
    gx += (mx - gx) * 0.08; gy += (my - gy) * 0.08;
    glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
    requestAnimationFrame(lag);
  })();

  const exp = () => {
    dot.style.width = '22px'; dot.style.height = '22px';
    dot.style.background = 'var(--magenta)';
    dot.style.boxShadow = '0 0 18px var(--magenta),0 0 36px var(--magenta)';
  };
  const shr = () => {
    dot.style.width = '10px'; dot.style.height = '10px';
    dot.style.background = 'var(--cyan)';
    dot.style.boxShadow = '0 0 12px var(--cyan),0 0 24px var(--cyan)';
  };
  document.querySelectorAll('button,a,.tag,.variant-card,.material-card,.component-item,.style-chip,.ctrl-btn')
    .forEach(el => { el.addEventListener('mouseenter', exp); el.addEventListener('mouseleave', shr); });
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function setupNav() {
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      $$('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      switchSection(link.dataset.section);
    });
  });
}

function switchSection(name) {
  const old = document.querySelector('.workspace-section.active');
  if (old) { old.classList.remove('active'); old.style.animation = 'none'; }
  const next = $(`section-${name}`);
  if (!next) return;
  next.style.display = 'block';
  next.classList.add('active');
  requestAnimationFrame(() => { next.style.animation = ''; });
  STATE.activeSection = name;

  // Sustain/Insights still need deferred init
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (name === 'sustain')  onSustainSectionVisible();
    if (name === 'insights') onInsightsSectionVisible();
  }));
}

/* ═══════════════════════════════════════════════════════════
   TERRAIN MAP
═══════════════════════════════════════════════════════════ */
function setupTerrain() {
  const canvas = $('terrainCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;

  const resize = () => {
    const p = canvas.parentElement;
    W = canvas.width  = p.clientWidth  || 800;
    H = canvas.height = p.clientHeight || 500;
  };
  resize(); window.addEventListener('resize', resize);

  const noise = (x, y) =>
    (Math.sin(x*0.11+y*0.07)*0.35 + Math.sin(x*0.22-y*0.13)*0.25 + Math.sin(x*0.05+y*0.04)*0.40)*0.5+0.5;

  let overlay = 'sun';
  $$('.ctrl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ctrl-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); overlay = btn.dataset.overlay;
      const T={sun:'SOLAR INTENSITY',wind:'WIND SPEED',noise:'NOISE LEVEL',zone:'ZONING CLASS'};
      const leg=$('overlayLegend'); if(leg) leg.querySelector('.legend-title').textContent=T[overlay]||overlay.toUpperCase();
    });
  });

  const ovCol=(c,r,t)=>{
    const n=noise(c+t*0.15,r+t*0.08);
    if(overlay==='sun')   return `hsla(${230-n*210},90%,58%,0.52)`;
    if(overlay==='wind')  return `hsla(${160+n*80},82%,52%,0.48)`;
    if(overlay==='noise') return `hsla(${290-n*230},85%,58%,0.55)`;
    const z=['rgba(0,245,255,0.42)','rgba(191,0,255,0.42)','rgba(255,140,0,0.42)','rgba(0,255,136,0.42)'];
    return z[Math.floor(n*4)];
  };

  const COLS=55, ROWS=38;
  let t=0;
  (function draw(){
    ctx.clearRect(0,0,W,H);
    const cw=W/COLS, ch=H/ROWS;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const n=noise(c+t*0.08,r);
      ctx.fillStyle=`hsl(230,30%,${18+n*38}%)`; ctx.fillRect(c*cw,r*ch,cw+1,ch+1);
    }
    for(let lv=1;lv<8;lv++){
      const th=lv/8; ctx.strokeStyle='rgba(0,245,255,0.12)'; ctx.lineWidth=0.8; ctx.beginPath();
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
        if(Math.abs(noise(c+t*0.04,r)-th)<0.025) ctx.lineTo(c*cw+cw/2,r*ch+ch/2);
      ctx.stroke();
    }
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      ctx.fillStyle=ovCol(c,r,t); ctx.fillRect(c*cw,r*ch,cw+1,ch+1);
    }
    ctx.strokeStyle='rgba(0,245,255,0.07)'; ctx.lineWidth=0.5;
    for(let c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(c*cw,0);ctx.lineTo(c*cw,H);ctx.stroke();}
    for(let r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*ch);ctx.lineTo(W,r*ch);ctx.stroke();}

    [{x:.28,y:.38,r:.055,label:'Site A'},{x:.58,y:.52,r:.038,label:'Site B'},{x:.48,y:.26,r:.046,label:'Site C'}].forEach(b=>{
      const bx=b.x*W,by=b.y*H,br=b.r*W,pulse=(Math.sin(t*0.12)*0.5+0.5)*br*0.5;
      [1,1.6,2.2].forEach((m,pi)=>{
        ctx.beginPath(); ctx.arc(bx,by,br*m,0,Math.PI*2);
        ctx.strokeStyle=`rgba(0,245,255,${0.5-pi*0.15})`; ctx.lineWidth=pi===0?1.5:0.7; ctx.stroke();
      });
      ctx.fillStyle='rgba(0,245,255,0.1)'; ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,245,255,0.35)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(bx-br*1.6,by); ctx.lineTo(bx+br*1.6,by);
      ctx.moveTo(bx,by-br*1.6); ctx.lineTo(bx,by+br*1.6); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='rgba(0,245,255,0.8)'; ctx.font='10px Orbitron,monospace';
      ctx.fillText(b.label,bx+br+4,by-4);
    });

    const vg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.7);
    vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(4,2,13,0.75)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    t+=0.006; requestAnimationFrame(draw);
  })();
}

/* ═══════════════════════════════════════════════════════════
   AI CORE VISUALIZER
═══════════════════════════════════════════════════════════ */
function setupAICore() {
  const canvas=$('aiCoreCanvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d'); let W,H;
  const resize=()=>{const p=canvas.parentElement;W=canvas.width=p.clientWidth||400;H=canvas.height=p.clientHeight||200;};
  resize(); window.addEventListener('resize',resize);

  const nodes=Array.from({length:28},(_,i)=>{
    const a=(Math.PI*2/28)*i, r=55+(i%3)*18;
    return{x:W/2+Math.cos(a)*r,y:H/2+Math.sin(a)*r,size:Math.random()*3+1,active:i%2===0};
  });
  let t=0;
  (function draw(){
    if(!canvas.parentElement) return;
    const cx=W/2,cy=H/2; ctx.clearRect(0,0,W,H); t+=0.018;
    nodes.forEach((n,i)=>{
      const a=(Math.PI*2/28)*i+t*(i%2?0.38:0.28),r=55+(i%3)*18;
      n.x=cx+Math.cos(a)*r; n.y=cy+Math.sin(a)*r;
    });
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
      const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y);
      if(d<90){
        const alpha=(1-d/90)*0.35+(STATE.isGenerating?Math.abs(Math.sin(t*4+i))*0.25:0);
        ctx.strokeStyle=`rgba(0,245,255,${alpha})`; ctx.lineWidth=0.6;
        ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y); ctx.stroke();
      }
    }
    const ca=STATE.isGenerating?0.35+Math.abs(Math.sin(t*2.5))*0.35:0.12;
    const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,55);
    grd.addColorStop(0,`rgba(0,245,255,${ca})`); grd.addColorStop(0.5,`rgba(191,0,255,${ca*0.55})`); grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(cx,cy,55,0,Math.PI*2); ctx.fill();
    nodes.forEach(n=>{
      const pulse=STATE.isGenerating?Math.abs(Math.sin(t*3+n.x*0.02))*0.6:0;
      ctx.fillStyle=n.active?`rgba(0,245,255,${0.7+pulse})`:`rgba(191,0,255,${0.45+pulse})`;
      ctx.shadowColor=n.active?'#00f5ff':'#bf00ff'; ctx.shadowBlur=6+pulse*6;
      ctx.beginPath(); ctx.arc(n.x,n.y,n.size+pulse,0,Math.PI*2); ctx.fill();
    });
    ctx.shadowBlur=0; requestAnimationFrame(draw);
  })();
}

/* ═══════════════════════════════════════════════════════════
   3D BUILDING ENGINE — initialized only when section visible
═══════════════════════════════════════════════════════════ */
const BUILDING_DEFS = [
  { label:'Foundation',  col:'#2a2855', glow:'#0044ff', lv:-2, w:95, d:85, h:12  },
  { label:'Podium',      col:'#18204e', glow:'#00f5ff', lv:0,  w:82, d:72, h:20  },
  { label:'Core-Low',    col:'#141c45', glow:'#00d4ff', lv:0,  w:24, d:24, h:65  },
  { label:'Slab-8',      col:'#1b2e55', glow:'#00f5ff', lv:8,  w:78, d:68, h:3   },
  { label:'Slab-16',     col:'#1b2e55', glow:'#00f5ff', lv:16, w:70, d:60, h:3   },
  { label:'Slab-24',     col:'#1b2e55', glow:'#aa00ff', lv:24, w:62, d:52, h:3   },
  { label:'Slab-32',     col:'#1b2e55', glow:'#aa00ff', lv:32, w:54, d:44, h:3   },
  { label:'Slab-40',     col:'#1b2e55', glow:'#00f5ff', lv:40, w:46, d:36, h:3   },
  { label:'Core-High',   col:'#141c45', glow:'#00d4ff', lv:18, w:20, d:20, h:65  },
  { label:'Glass-Low',   col:'#0c1628', glow:'#00f5ff', lv:0,  w:80, d:70, h:58, glass:true },
  { label:'Glass-High',  col:'#0c1628', glow:'#aa00ff', lv:18, w:66, d:56, h:58, glass:true },
  { label:'SkyBridge',   col:'#182e58', glow:'#ff8c00', lv:28, w:55, d:8,  h:3,  ox:58 },
  { label:'Terrace',     col:'#122814', glow:'#00ff88', lv:38, w:54, d:44, h:5   },
  { label:'BioScreen',   col:'#183218', glow:'#00ff88', lv:43, w:50, d:40, h:9   },
  { label:'Spire',       col:'#201442', glow:'#bf00ff', lv:48, w:7,  d:7,  h:28  },
];

function onDesignSectionVisible() {
  if (!STATE.assembleStarted) {
    STATE.assembleStarted = true;
    startDesignEngine();
  }
}

function startDesignEngine() {
  const canvas = $('designCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // At this point the section IS visible (IntersectionObserver triggered us)
  // Read actual dimensions
  const toolbar = canvas.parentElement.querySelector('.viewport-toolbar');
  const toolH   = toolbar ? toolbar.offsetHeight : 52;
  canvas.width  = canvas.parentElement.clientWidth  || 900;
  canvas.height = (canvas.parentElement.clientHeight || 620) - toolH;

  // Keep canvas sized on window resize
  window.addEventListener('resize', () => {
    canvas.width  = canvas.parentElement.clientWidth  || 900;
    canvas.height = (canvas.parentElement.clientHeight || 620) - toolH;
  });

  // Init building parts — entryY is ADDED to worldBaseY, starts negative (below ground)
  STATE.buildingParts = BUILDING_DEFS.map((def, i) => ({
    ...def, opacity: 0, entryY: -280 - i * 18,
  }));

  // Drag / zoom
  let lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown',  e => { STATE.isDragging=true; lastX=e.clientX; lastY=e.clientY; });
  canvas.addEventListener('mousemove',  e => {
    if (!STATE.isDragging) return;
    STATE.designAngle.y += (e.clientX - lastX) * 0.55;
    STATE.designAngle.x  = Math.max(-75, Math.min(75, STATE.designAngle.x + (e.clientY - lastY) * 0.35));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('mouseup',    () => { STATE.isDragging = false; });
  canvas.addEventListener('mouseleave', () => { STATE.isDragging = false; });
  canvas.addEventListener('wheel', e => {
    STATE.designScale = Math.max(0.35, Math.min(2.6, STATE.designScale - e.deltaY * 0.0012));
  }, { passive: true });

  // 3D projection — Y+ is UP, camera pivot at (W/2, H*0.72)
  const project = (x, y, z) => {
    const W = canvas.width, H = canvas.height;
    const ry = STATE.designAngle.y * Math.PI / 180;
    const rx = STATE.designAngle.x * Math.PI / 180;
    const sc = 1.8 * STATE.designScale;

    const x1 =  x * Math.cos(ry) - z * Math.sin(ry);
    const z1 =  x * Math.sin(ry) + z * Math.cos(ry);
    const y2 =  y * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 =  y * Math.sin(rx) + z1 * Math.cos(rx);
    const fov = 700 / (700 + z2 + 120);

    // pivot at 72% down so building (reaching up) stays in frame
    return { sx: W/2 + x1*sc*fov, sy: H*0.72 - y2*sc*fov, depth: z2 };
  };

  // drawBox: baseY is the BOTTOM face of the box, box extends UP by h
  const drawBox = (cx, baseY, cz, w, d, h, hexCol, glow, alpha, glass=false) => {
    if (alpha < 0.01) return;
    const hw=w/2, hd=d/2;

    const V=[
      [-hw+cx, baseY,   -hd+cz],[hw+cx, baseY,   -hd+cz],[hw+cx, baseY,   hd+cz],[-hw+cx, baseY,   hd+cz], // bottom
      [-hw+cx, baseY+h, -hd+cz],[hw+cx, baseY+h, -hd+cz],[hw+cx, baseY+h, hd+cz],[-hw+cx, baseY+h, hd+cz], // top
    ];
    const P=V.map(v=>project(v[0],v[1],v[2]));

    const FACES=[
      {vi:[4,5,6,7],nm:[0,1,0]},   // top face (y = baseY+h)
      {vi:[0,1,5,4],nm:[0,0,-1]},  // front
      {vi:[1,2,6,5],nm:[1,0,0]},   // right
      {vi:[3,2,6,7],nm:[0,0,1]},   // back
      {vi:[0,3,7,4],nm:[-1,0,0]},  // left
      // skip bottom face {vi:[0,1,2,3]} for performance
    ];

    const lightDir=[0.55,0.75,-0.3], lm=Math.hypot(0.55,0.75,0.3);

    FACES.sort((a,b)=>{
      const da=a.vi.reduce((s,i)=>s+P[i].depth,0)/4;
      const db=b.vi.reduce((s,i)=>s+P[i].depth,0)/4;
      return da-db;
    });

    const rr=parseInt(hexCol.substr(1,2),16);
    const rg=parseInt(hexCol.substr(3,2),16);
    const rb=parseInt(hexCol.substr(5,2),16);

    FACES.forEach(face=>{
      const pts=face.vi.map(i=>P[i]);
      const dot=(face.nm[0]*lightDir[0]+face.nm[1]*lightDir[1]+face.nm[2]*lightDir[2])/lm;
      const lum=face.nm[1]===1?0.95:0.30+Math.max(0,dot)*0.60;

      ctx.save(); ctx.globalAlpha=alpha;
      ctx.beginPath(); ctx.moveTo(pts[0].sx,pts[0].sy);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].sx,pts[i].sy);
      ctx.closePath();

      if(STATE.renderMode==='wireframe'){
        ctx.strokeStyle='rgba(0,245,255,0.75)'; ctx.lineWidth=0.8; ctx.stroke();
      } else if(STATE.renderMode==='xray'){
        ctx.fillStyle='rgba(0,245,255,0.04)'; ctx.fill();
        ctx.strokeStyle='rgba(0,245,255,0.40)'; ctx.lineWidth=0.5; ctx.stroke();
      } else if(glass){
        ctx.fillStyle=`rgba(${rr},${Math.min(255,rg+45)},${Math.min(255,rb+90)},${0.11*lum})`;
        ctx.fill();
        ctx.strokeStyle='rgba(0,245,255,0.20)'; ctx.lineWidth=0.5; ctx.stroke();
      } else {
        ctx.fillStyle=`rgba(${~~(rr*lum)},${~~(rg*lum)},${~~(Math.min(255,rb*lum+38*lum))},0.95)`;
        ctx.fill();
        ctx.strokeStyle='rgba(0,245,255,0.13)'; ctx.lineWidth=0.5; ctx.stroke();
      }

      if(face.nm[1]===1 && STATE.renderMode==='solid'){
        ctx.shadowColor=glow; ctx.shadowBlur=16; ctx.stroke(); ctx.shadowBlur=0;
      }
      ctx.restore();
    });
  };

  const LH = 5; // 5 units per floor level

  // Main render loop
  (function loop(){
    const W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(4,2,18,0.88)'; ctx.fillRect(0,0,W,H);

    // Ground grid at y=0 (street level)
    const gLines=14, step=38;
    for(let i=-gLines;i<=gLines;i++){
      const a=i===0?0.28:0.07, lw=i===0?1.2:0.5;
      const pf=project(i*step, 0, -gLines*step), pt=project(i*step, 0,  gLines*step);
      const qf=project(-gLines*step, 0, i*step), qt=project( gLines*step, 0, i*step);
      ctx.strokeStyle=`rgba(0,245,255,${a})`; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.moveTo(pf.sx,pf.sy); ctx.lineTo(pt.sx,pt.sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qf.sx,qf.sy); ctx.lineTo(qt.sx,qt.sy); ctx.stroke();
    }

    // Auto-rotate
    if(!STATE.isDragging) STATE.designAngle.y += 0.07;

    const explOff = STATE.exploded ? 30 : 0;

    // Draw building parts — worldBaseY is the BOTTOM of each component
    STATE.buildingParts.forEach((part, idx)=>{
      part.entryY += (0 - part.entryY) * 0.055;  // approach 0 from below
      part.opacity = Math.min(1, part.opacity + 0.016);

      // Correct: positive lv * LH = higher up on screen
      const worldBaseY = (part.lv * LH) + part.entryY;
      const expl = STATE.exploded ? (idx%3===0?28:(idx%3===1?-14:0)) : 0;

      drawBox(
        part.ox ?? 0,
        worldBaseY + expl,
        0,
        part.w, part.d, part.h,
        part.col, part.glow,
        part.opacity,
        part.glass || false
      );

      // Floating labels
      if (part.opacity > 0.55 && ['Foundation','Terrace','SkyBridge','Spire'].includes(part.label)) {
        const lp = project(part.ox??0, worldBaseY + part.h/2 + expl, -(part.d/2+4));
        ctx.save(); ctx.globalAlpha = part.opacity * 0.5;
        ctx.fillStyle = part.glow; ctx.font='bold 8px Orbitron,monospace';
        ctx.shadowColor = part.glow; ctx.shadowBlur = 4;
        ctx.fillText(part.label, lp.sx+3, lp.sy);
        ctx.shadowBlur=0; ctx.restore();
      }
    });

    // Structural force lines (xray/wireframe mode)
    if(STATE.renderMode!=='solid'){
      for(let i=0;i<6;i++){
        const a=(Math.PI*2/6)*i;
        const p1=project(Math.cos(a)*30, 0, Math.sin(a)*30);
        const p2=project(0, 240, 0);
        const g=ctx.createLinearGradient(p1.sx,p1.sy,p2.sx,p2.sy);
        g.addColorStop(0,'rgba(0,255,136,0.2)'); g.addColorStop(0.5,'rgba(255,220,0,0.3)'); g.addColorStop(1,'rgba(255,80,0,0.15)');
        ctx.strokeStyle=g; ctx.lineWidth=1; ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(p1.sx,p1.sy); ctx.lineTo(p2.sx,p2.sy); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // HUD overlay
    ctx.save(); ctx.globalAlpha=0.3;
    ctx.fillStyle='#00f5ff'; ctx.font='8px Orbitron,monospace';
    ctx.fillText(`ROT ${STATE.designAngle.y.toFixed(0)}°  SCALE ×${STATE.designScale.toFixed(2)}  ${STATE.renderMode.toUpperCase()}`, 14, H-12);
    ctx.restore();

    requestAnimationFrame(loop);
  })();

  // Variant canvases (section is now visible so widths are non-zero)
  initVariantCanvases();
}

function initVariantCanvases() {
  const cfgs=[
    {floors:34,twist:0,step:0,hue:195},
    {floors:24,twist:2.8,step:0,hue:270},
    {floors:29,twist:0,step:7,hue:195},
    {floors:20,twist:1.8,step:5,hue:320},
  ];
  cfgs.forEach((cfg,vi)=>{
    const canvas=$(`varCanvas${vi+1}`); if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const p=canvas.parentElement;
    const pW=p.offsetWidth || p.clientWidth || 120;
    canvas.width=Math.max(pW, 80); canvas.height=100;
    let ang=0;
    (function loop(){
      if(!canvas.parentElement) return;
      const W=canvas.width,H=canvas.height;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='rgba(4,2,18,0.88)'; ctx.fillRect(0,0,W,H);
      const bw=W*0.30,bx=W/2-bw/2,bh=H*0.74,by=H-10;
      for(let f=0;f<cfg.floors;f++){
        const lv=f/cfg.floors;
        const tw=cfg.twist?Math.sin(lv*Math.PI*2.6+ang*0.014)*16:0;
        const st=cfg.step?(Math.floor(lv*3)/3)*cfg.step*lv:0;
        const fw=Math.max(4,bw-st);
        const fh=bh/cfg.floors;
        ctx.fillStyle=`hsla(${cfg.hue},42%,${14+lv*22}%,0.94)`;
        ctx.fillRect(bx+tw,by-(f+1)*fh,fw,fh-0.7);
        if(f%4===0){
          ctx.strokeStyle=`hsla(${cfg.hue},80%,60%,${0.08+lv*0.22})`; ctx.lineWidth=0.5;
          ctx.strokeRect(bx+tw,by-(f+1)*fh,fw,fh-0.7);
        }
      }
      // Glow top
      const g=ctx.createLinearGradient(W/2,H,W/2,0);
      g.addColorStop(0,`hsla(${cfg.hue},80%,50%,0.14)`); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ang++; requestAnimationFrame(loop);
    })();
  });

  $$('.variant-card').forEach(card=>{
    card.addEventListener('click',()=>{
      $$('.variant-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   SUSTAINABILITY SECTION
═══════════════════════════════════════════════════════════ */
function onSustainSectionVisible() {
  if (!STATE._sustainStarted) { STATE._sustainStarted = true; startDaylightCanvas(); startAirflowCanvas(); }
}

function startDaylightCanvas() {
  const canvas=$('daylightCanvas'); if(!canvas||!canvas.parentElement) return;
  const ctx=canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth || canvas.parentElement.clientWidth || 600;
  canvas.height = 200;

  (function draw(){
    if(!canvas.parentElement) return;
    const W=canvas.width,H=canvas.height;
    const ang=(STATE.sunAngle/100)*Math.PI, sinA=Math.max(0,Math.sin(ang));
    ctx.clearRect(0,0,W,H);
    const sky=ctx.createLinearGradient(0,0,0,H*0.7);
    sky.addColorStop(0,`hsl(${200+~~(ang/Math.PI*55)},65%,${10+~~(sinA*30)}%)`);
    sky.addColorStop(1,'hsl(220,35%,7%)');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.7);
    ctx.fillStyle='hsl(220,28%,9%)'; ctx.fillRect(0,H*0.7,W,H*0.3);

    const sx=W/2+Math.cos(ang-Math.PI/2)*W*0.38, sy=H*0.62-sinA*H*0.52;
    const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,50);
    sg.addColorStop(0,`rgba(255,225,120,${sinA})`); sg.addColorStop(0.4,`rgba(255,150,60,${sinA*0.5})`); sg.addColorStop(1,'transparent');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    if(sinA>0.05){
      ctx.beginPath(); ctx.arc(sx,sy,10,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,240,190,${sinA})`;
      ctx.shadowColor='rgba(255,220,100,0.9)'; ctx.shadowBlur=24; ctx.fill(); ctx.shadowBlur=0;
    }

    const bx=W/2-18,bw=36,bh=95,by=H*0.7-bh;
    const shLen=Math.max(5,(1-sinA)*160), shDir=Math.cos(ang-Math.PI/2);
    ctx.fillStyle=`rgba(0,0,0,${0.28+sinA*0.08})`;
    ctx.beginPath(); ctx.moveTo(bx,H*0.7); ctx.lineTo(bx+bw,H*0.7); ctx.lineTo(bx+bw+shDir*shLen,H*0.7); ctx.lineTo(bx+shDir*shLen,H*0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(18,28,58,0.93)'; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='rgba(0,245,255,0.28)'; ctx.lineWidth=1; ctx.strokeRect(bx,by,bw,bh);
    for(let f=0;f<10;f++) for(let col=0;col<3;col++){
      ctx.fillStyle=sinA>0.25?`rgba(255,215,110,${sinA*0.65})`:'rgba(0,22,52,0.7)';
      ctx.fillRect(bx+3+col*10,by+4+f*9,7,7);
    }
    requestAnimationFrame(draw);
  })();
}

function startAirflowCanvas() {
  const canvas=$('airflowCanvas'); if(!canvas||!canvas.parentElement) return;
  const ctx=canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth || canvas.parentElement.clientWidth || 600;
  canvas.height = 200;

  const pts=Array.from({length:90},()=>({
    x:Math.random()*canvas.width, y:Math.random()*200,
    vx:2.2+Math.random()*2.2, vy:(Math.random()-0.5)*0.5, a:Math.random()*0.6+0.2,
  }));
  (function draw(){
    if(!canvas.parentElement) return;
    const W=canvas.width,H=canvas.height,bx=W*0.42,bw=52,bh=125,by=H-bh;
    ctx.fillStyle='rgba(4,2,18,0.18)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(18,28,58,0.82)'; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='rgba(0,245,255,0.2)'; ctx.lineWidth=1; ctx.strokeRect(bx,by,bw,bh);
    pts.forEach(p=>{
      const near=p.x>bx-22&&p.x<bx+bw+22&&p.y>by;
      if(near){p.vy+=p.y<by+bh/2?-0.22:0.22;p.vx*=0.92;} else {p.vy*=0.97;if(p.x>bx+bw+35)p.vx=2.2+Math.random()*2.2;}
      p.x+=p.vx; p.y+=p.vy;
      if(p.x>W){p.x=0;p.y=Math.random()*H;p.vx=2.2+Math.random()*2.2;p.vy=(Math.random()-0.5)*0.5;}
      const hue=p.y<by?182:210;
      ctx.strokeStyle=`hsla(${hue},82%,62%,${p.a})`; ctx.lineWidth=1.4; ctx.shadowColor=`hsla(${hue},82%,62%,0.35)`; ctx.shadowBlur=3;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*5,p.y-p.vy*5); ctx.stroke();
    });
    ctx.shadowBlur=0; requestAnimationFrame(draw);
  })();
}

/* ═══════════════════════════════════════════════════════════
   INSIGHTS SECTION
═══════════════════════════════════════════════════════════ */
function onInsightsSectionVisible() {
  animateCostCounter(true);
  if (!STATE._insightsStarted) { STATE._insightsStarted = true; startStressCanvas(); }
}

function animateCostCounter(restart=false) {
  const el=$('costCounter'); if(!el) return;
  if(restart) STATE.costCurrent=0;
  const target=45100000,dur=2600,t0=performance.now(),v0=STATE.costCurrent;
  (function tick(now){
    const pr=Math.min((now-t0)/dur,1),e=1-Math.pow(1-pr,3);
    STATE.costCurrent=v0+(target-v0)*e;
    el.textContent='$'+(STATE.costCurrent/1e6).toFixed(2)+'M';
    if(pr<1) requestAnimationFrame(tick);
  })(performance.now());
}

function startStressCanvas() {
  const canvas=$('stressCanvas'); if(!canvas||!canvas.parentElement) return;
  const ctx=canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth || canvas.parentElement.clientWidth || 500;
  canvas.height = 280;
  const W=canvas.width,H=canvas.height;

  const floors=11;
  const nodes=[];
  for(let f=0;f<floors;f++){
    const y=H-22-f*22,spread=W*0.38*(1-f*0.014),cx=W/2;
    nodes.push({x:cx-spread/2,y,f},{x:cx,y,f,core:true},{x:cx+spread/2,y,f});
  }

  const scol=v=>{
    if(v<0.38) return `rgba(0,255,${~~(136+v*80)},${0.55+v*0.35})`;
    if(v<0.68) return `rgba(${~~(v*280)},${~~(230-v*60)},0,${0.6+v*0.3})`;
    return `rgba(255,${~~(80-v*60)},0,${0.65+v*0.25})`;
  };

  let t=0;
  (function draw(){
    if(!canvas.parentElement) return;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(4,2,18,0.55)'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,245,255,0.22)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,H-12); ctx.lineTo(W,H-12); ctx.stroke();
    ctx.fillStyle='rgba(0,245,255,0.05)'; ctx.fillRect(0,H-12,W,12);

    for(let f=0;f<floors-1;f++){
      const b=f*3,sv=Math.abs(Math.sin(t*0.04+f*0.45))*0.82;
      const NL=nodes[b],NC=nodes[b+1],NR=nodes[b+2];
      const AL=nodes[b+3],AC=nodes[b+4],AR=nodes[b+5];
      if(!AL) continue;
      [[NL,AL],[NC,AC,true],[NR,AR]].forEach(([a,b2,core])=>{
        const sv2=sv*(core?0.2:1);
        ctx.strokeStyle=scol(sv2); ctx.lineWidth=core?2.8:1.5;
        ctx.shadowColor=scol(sv2); ctx.shadowBlur=3+sv2*10;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b2.x,b2.y); ctx.stroke();
      });
      [[NL,NC],[NC,NR]].forEach(([a,b2])=>{
        ctx.strokeStyle=scol(sv*0.45); ctx.lineWidth=0.9; ctx.shadowBlur=2;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b2.x,b2.y); ctx.stroke();
      });
      ctx.strokeStyle='rgba(0,80,200,0.18)'; ctx.lineWidth=0.5; ctx.setLineDash([3,4]); ctx.shadowBlur=0;
      ctx.beginPath(); ctx.moveTo(NL.x,NL.y); ctx.lineTo(AR.x,AR.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(NR.x,NR.y); ctx.lineTo(AL.x,AL.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.shadowBlur=0;
    const ax=nodes[1].x;
    ctx.strokeStyle='rgba(255,80,0,0.7)'; ctx.lineWidth=2.5; ctx.shadowColor='rgba(255,80,0,0.9)'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.moveTo(ax,H-12); ctx.lineTo(ax,nodes[1].y+12); ctx.stroke();
    ctx.fillStyle='rgba(255,80,0,0.9)';
    ctx.beginPath(); ctx.moveTo(ax,H-20); ctx.lineTo(ax-7,H-10); ctx.lineTo(ax+7,H-10); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    t++; requestAnimationFrame(draw);
  })();
}

/* ═══════════════════════════════════════════════════════════
   SLIDERS
═══════════════════════════════════════════════════════════ */
function setupSliders() {
  [
    ['budgetSlider','budgetVal',v=>`$${v}M`],
    ['sustainSlider','sustainVal',v=>`${v}%`],
    ['densitySlider','densityVal',v=>`FAR ${(v/10).toFixed(1)}`],
    ['heightSlider','heightVal',v=>`${~~(v*3)}m`],
    ['greenSlider','greenVal',v=>`${v}%`],
    ['complexSlider','complexVal',v=>v>66?'High':v>33?'Medium':'Low'],
  ].forEach(([sid,vid,fn])=>{
    const sl=$(sid),vl=$(vid); if(!sl||!vl) return;
    sl.addEventListener('input',()=>vl.textContent=fn(+sl.value));
  });

  $$('.style-chip').forEach(c=>c.addEventListener('click',()=>{
    $$('.style-chip').forEach(x=>x.classList.remove('active')); c.classList.add('active');
  }));
  $$('.tag').forEach(t=>t.addEventListener('click',()=>{
    const inp=$('designPrompt'); if(inp){inp.value=t.dataset.prompt;inp.focus();}
  }));

  const sunSl=$('sunAngle'),sunLbl=$('sunLabel');
  if(sunSl&&sunLbl){
    sunSl.addEventListener('input',()=>{
      STATE.sunAngle=+sunSl.value;
      const h=Math.round(6+(STATE.sunAngle/100)*13);
      sunLbl.textContent=`${h>12?h-12:h}:00 ${h>=12?'PM':'AM'}`;
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   BUTTONS
═══════════════════════════════════════════════════════════ */
function setupButtons() {
  $('arToggle')?.addEventListener('click',()=>$('arOverlay')?.classList.add('visible'));
  $('arClose')?.addEventListener('click',()=>$('arOverlay')?.classList.remove('visible'));
  $('arOverlay')?.addEventListener('click',e=>{if(e.target===$('arOverlay'))$('arOverlay').classList.remove('visible');});

  const views={perspBtn:{x:28,y:35},frontBtn:{x:0,y:0},topBtn:{x:88,y:0}};
  Object.entries(views).forEach(([id,ang])=>$(id)?.addEventListener('click',()=>{
    $$('.toolbar-group .tool-btn').forEach(b=>b.classList.remove('active')); $(id)?.classList.add('active');
    STATE.designAngle.x=ang.x; STATE.designAngle.y=ang.y;
  }));

  $('explodeBtn')?.addEventListener('click',()=>{
    STATE.exploded=!STATE.exploded;
    $('explodeBtn')?.classList.toggle('active',STATE.exploded);
  });

  [['wireBtn','wireframe'],['solidBtn','solid'],['xrayBtn','xray']].forEach(([id,mode])=>
    $(id)?.addEventListener('click',()=>{
      [['wireBtn'],['solidBtn'],['xrayBtn']].forEach(([bid])=>$(bid)?.classList.remove('active'));
      $(id)?.classList.add('active'); STATE.renderMode=mode;
    })
  );

  $('assembleBtn')?.addEventListener('click',()=>{
    STATE.buildingParts.forEach((p,i)=>{p.entryY=-360-i*22;p.opacity=0;});
  });

  $('voiceBtn')?.addEventListener('click',()=>{
    STATE.isListening=!STATE.isListening;
    $('voiceBtn')?.classList.toggle('listening',STATE.isListening);
    if(STATE.isListening) setTimeout(()=>{
      const inp=$('designPrompt');
      if(inp) inp.value='A net-zero kinetic supertall with adaptive solar facade, vertical bio-gardens every 5th floor, sky terrace at level 35, and geothermal energy loop. Residential mixed-use with underground transit connection.';
      STATE.isListening=false; $('voiceBtn')?.classList.remove('listening');
    },2400);
  });
}

/* ═══════════════════════════════════════════════════════════
   AI GENERATION SEQUENCE
═══════════════════════════════════════════════════════════ */
function setupGenerateBtn() {
  $('generateBtn')?.addEventListener('click',()=>{if(!STATE.isGenerating)runGeneration();});
}

function runGeneration() {
  STATE.isGenerating=true;
  $('generateBtn')?.classList.add('running');
  const logEl=$('logStream'),statusEl=$('aiStatusText');
  const iterEl=$('iterVal'),confEl=$('confVal'),varEl=$('varVal');
  if(logEl) logEl.innerHTML='';

  const steps=[
    [0,   'info',   '▸ Parsing natural language design prompt…'],
    [500, 'info',   '▸ Geocoding site: New York 40.71°N, 74.00°W'],
    [1000,'info',   '▸ Loading climate data — Köppen Cfa humid subtropical'],
    [1500,'info',   '▸ Running generative massing optimization (48 seeds)'],
    [2100,'warn',   '▸ Wind pressure flag on NW facade — auto-adjusting'],
    [2700,'info',   '▸ Structural topology optimizer engaged'],
    [3300,'info',   '▸ LEED Platinum compliance sequence running…'],
    [3900,'info',   '▸ Photovoltaic facade layout computed'],
    [4500,'info',   '▸ Cost model: 3 budget envelopes generated'],
    [5100,'info',   '▸ Rendering 4 design variant previews…'],
    [5900,'success','✓ GENERATION COMPLETE — 4 Design Variants Ready'],
  ];

  ['PARSING','ANALYZING','OPTIMIZING','SIMULATING','FINALIZING'].forEach((s,i)=>
    setTimeout(()=>{if(statusEl)statusEl.textContent=s;},i*1200)
  );

  let iter=0,conf=0,vars=0;
  const ti=setInterval(()=>{iter+=~~(Math.random()*55)+8;if(iterEl)iterEl.textContent=iter.toLocaleString();},200);
  const tc=setInterval(()=>{conf=Math.min(97.8,conf+Math.random()*4.5);if(confEl)confEl.textContent=conf.toFixed(1)+'%';},280);
  const tv=setInterval(()=>{if(vars<4){vars++;if(varEl)varEl.textContent=vars;}},1500);

  steps.forEach(([delay,type,msg])=>setTimeout(()=>{
    if(!logEl) return;
    const d=document.createElement('div');
    d.className=`log-entry ${type}`; d.textContent=msg;
    logEl.appendChild(d); logEl.scrollTop=logEl.scrollHeight;
  },delay));

  setTimeout(()=>window.spawnBurst?.(window.innerWidth/2,window.innerHeight/2,90),1200);

  setTimeout(()=>{
    STATE.isGenerating=false;
    clearInterval(ti); clearInterval(tc); clearInterval(tv);
    $('generateBtn')?.classList.remove('running');
    if(statusEl) statusEl.textContent='COMPLETE';

    setTimeout(()=>{
      $$('.nav-link').forEach(l=>l.classList.toggle('active',l.dataset.section==='design'));
      if(STATE.assembleStarted){
        // Reset assembly for dramatic re-entry
        STATE.buildingParts.forEach((p,i)=>{p.entryY=-360-i*22;p.opacity=0;});
      }
      switchSection('design');
    },700);
  },6400);
}

/* ═══════════════════════════════════════════════════════════
   COMPARE MODAL
═══════════════════════════════════════════════════════════ */
function setupCompare() {
  $('compareBtn')?.addEventListener('click',()=>{
    $('compareModal')?.classList.add('visible');
    setTimeout(launchCompareCanvases,60);
  });
  $('closeCompare')?.addEventListener('click',()=>$('compareModal')?.classList.remove('visible'));
  $('compareModal')?.addEventListener('click',e=>{if(e.target===$('compareModal'))$('compareModal').classList.remove('visible');});
}

function launchCompareCanvases() {
  [['compareCanvasA',195,34,false],['compareCanvasB',275,22,true]].forEach(([id,hue,floors,twist])=>{
    const canvas=$(id); if(!canvas) return;
    const ctx=canvas.getContext('2d');
    const p=canvas.parentElement;
    canvas.width=p.getBoundingClientRect().width||420;
    canvas.height=p.getBoundingClientRect().height||400;
    let ang=0;
    (function loop(){
      if(!canvas.parentElement) return;
      const W=canvas.width,H=canvas.height;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='rgba(4,2,18,0.94)'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle=`hsla(${hue},70%,50%,0.07)`; ctx.lineWidth=0.5;
      for(let i=0;i<10;i++){
        ctx.beginPath(); ctx.moveTo(0,i*H/10); ctx.lineTo(W,i*H/10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i*W/10,0); ctx.lineTo(i*W/10,H); ctx.stroke();
      }
      const bw=W*0.27,bx=W/2-bw/2,bh=H*0.76,by=H-18;
      for(let f=0;f<floors;f++){
        const lv=f/floors,tw=twist?Math.sin(lv*Math.PI*3.5+ang*0.012)*20:0,fw=bw*(1-lv*0.15),fh=bh/floors;
        ctx.fillStyle=`hsla(${hue},42%,${13+lv*21}%,0.95)`;
        ctx.fillRect(bx+tw,by-(f+1)*fh,fw,fh-0.6);
        if(f%3===0){ctx.strokeStyle=`hsla(${hue},80%,60%,${0.09+lv*0.22})`; ctx.lineWidth=0.5; ctx.strokeRect(bx+tw,by-(f+1)*fh,fw,fh-0.6);}
      }
      const g=ctx.createLinearGradient(W/2,H,W/2,0);
      g.addColorStop(0,`hsla(${hue},80%,50%,0.12)`); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ang++; requestAnimationFrame(loop);
    })();
  });
}

/* ═══════════════════════════════════════════════════════════
   PARALLAX
═══════════════════════════════════════════════════════════ */
function setupParallax() {
  let tx=0,ty=0;
  document.addEventListener('mousemove',e=>{
    tx=(e.clientX/window.innerWidth-0.5)*2;
    ty=(e.clientY/window.innerHeight-0.5)*2;
  });
  // Only apply to info/stat cards, not canvas panels
  (function loop(){
    document.querySelectorAll('.info-card,.analysis-score,.metric-card,.cost-item,.material-card').forEach((el,i)=>{
      if(el.matches(':hover')) return;
      const d=0.5+(i%3)*0.25;
      el.style.transform=`translate(${tx*4*d}px,${ty*2.5*d}px)`;
    });
    requestAnimationFrame(loop);
  })();
}

/* ═══════════════════════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════════════════════ */
function setupTimeline() {
  $('timelineScrubber')?.addEventListener('input',function(){
    const v=+this.value;
    $$('.phase').forEach((p,i)=>p.classList.toggle('active',v>=(i+1)*25));
  });
}
