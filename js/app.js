/**
 * app.js
 * MDS Explorer — Main Application Logic
 * Handles: navigation, CSV upload, 2D/3D rendering, playground, compare
 */

// ══ PALETTE ══
const PALETTE = ['#1E6DFF','#7C3AED','#EF4444','#F59E0B','#00C2CB','#22C55E','#EC4899','#0EA5E9'];

// ══ APP STATE ══
const App = {
  preset: 'csv',
  dims: 2,
  metric: true,
  galaxy: false,
  autoRotate: false,
  addMode: false,
  running: false,
  labels: [],
  matrix: [],
  groups: [],
  groupNames: [],
  coords: [],
  manualPoints: [],
  csvLoaded: false
};

// ══ THREE.JS STATE ══
let scene3, cam3, ren3, pts3Group;
let drag3 = { active: false, px: 0, py: 0 };
let vel3 = { x: 0, y: 0 };
let raf3 = null;

// ══ INIT ══
window.addEventListener('DOMContentLoaded', () => {
  setupCursor();
  setupBgCanvas();
  setupNavigation();
  startHomeDemo();
  startLearnDemo();
});

// ══ CURSOR (no-op in light theme — kept for compatibility) ══
function setupCursor() {
  const c = document.getElementById('cursor');
  const d = document.getElementById('cursorDot');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  document.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    d.style.left = tx + 'px'; d.style.top = ty + 'px';
  });
  (function loop() {
    cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
    c.style.left = cx + 'px'; c.style.top = cy + 'px';
    requestAnimationFrame(loop);
  })();
}

// ══ BACKGROUND CANVAS (hidden in light theme) ══
function setupBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  function makeParticle() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * 0.3, vy: (Math.random() - .5) * 0.3,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.3 + 0.05,
      c: Math.random() < 0.6 ? '30,109,255' : '124,58,237'
    };
  }
  for (let i = 0; i < 90; i++) particles.push(makeParticle());
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++)
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(30,109,255,${0.08 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ══ NAVIGATION ══
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      goTo(link.dataset.page);
    });
  });
}

function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pg = document.getElementById(page);
  if (pg) pg.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
}

// ══ HOME DEMO ANIMATION ══
function startHomeDemo() {
  const canvas = document.getElementById('homeDemo');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() {
    W = canvas.width = canvas.offsetWidth || 320;
    H = canvas.height = canvas.offsetHeight || 240;
  }
  resize();
  window.addEventListener('resize', resize);

  const pts = Array.from({ length: 14 }, () => ({
    x: Math.random(), y: Math.random(),
    tx: Math.random(), ty: Math.random(),
    c: PALETTE[Math.floor(Math.random() * 5)]
  }));
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.008;
    const lerp = (0.5 - 0.5 * Math.cos(t * Math.PI));

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const ax = (pts[i].x * (1 - lerp) + pts[i].tx * lerp) * W;
        const ay = (pts[i].y * (1 - lerp) + pts[i].ty * lerp) * H;
        const bx = (pts[j].x * (1 - lerp) + pts[j].tx * lerp) * W;
        const by = (pts[j].y * (1 - lerp) + pts[j].ty * lerp) * H;
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist < 80) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(99,179,255,${0.18 * (1 - dist / 80)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      const x = (p.x * (1 - lerp) + p.tx * lerp) * W;
      const y = (p.y * (1 - lerp) + p.ty * lerp) * H;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = p.c + '55'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (t > 2) { t = 0; pts.forEach(p => { p.x = p.tx; p.y = p.ty; p.tx = Math.random(); p.ty = Math.random(); }); }
    requestAnimationFrame(draw);
  }
  draw();
}

// ══ LEARN DEMO ══
function startLearnDemo() {
  const canvas = document.getElementById('learnDemo');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const n = 8;
  const clusters = [
    { cx: 0.25, cy: 0.35, r: 0.12, c: '#1E6DFF' },
    { cx: 0.75, cy: 0.35, r: 0.12, c: '#7C3AED' },
    { cx: 0.5,  cy: 0.75, r: 0.12, c: '#22C55E' }
  ];
  const pts = Array.from({ length: n * 3 }, (_, i) => {
    const cl = clusters[Math.floor(i / n)];
    return {
      sx: Math.random(), sy: Math.random(),
      tx: cl.cx + (Math.random() - 0.5) * cl.r * 2,
      ty: cl.cy + (Math.random() - 0.5) * cl.r * 2,
      c: cl.c
    };
  });

  let phase = 0, t = 0;
  const stepEls = [
    document.getElementById('lstep0'),
    document.getElementById('lstep1'),
    document.getElementById('lstep2')
  ];

  function setStep(s) {
    stepEls.forEach((el, i) => el && el.classList.toggle('active', i === s));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.012;
    let lerp = 0;
    if (phase === 0) { lerp = 0; if (t > 1.5) { phase = 1; t = 0; setStep(1); } }
    else if (phase === 1) { lerp = Math.min(t / 2.5, 1); if (t > 2.8) { phase = 2; t = 0; setStep(2); } }
    else if (phase === 2) { lerp = 1; if (t > 2.0) { phase = 0; t = 0; setStep(0); pts.forEach(p => { p.sx = p.tx; p.tx = Math.random(); p.sy = p.ty; p.ty = clusters[Math.floor(Math.random() * 3)].cx + (Math.random() - 0.5) * 0.12; }); } }

    const eased = lerp < 0.5 ? 2 * lerp * lerp : -1 + (4 - 2 * lerp) * lerp;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const ax = (pts[i].sx + (pts[i].tx - pts[i].sx) * eased) * W;
        const ay = (pts[i].sy + (pts[i].ty - pts[i].sy) * eased) * H;
        const bx = (pts[j].sx + (pts[j].tx - pts[j].sx) * eased) * W;
        const by = (pts[j].sy + (pts[j].ty - pts[j].sy) * eased) * H;
        const d = Math.hypot(ax - bx, ay - by);
        if (d < 60) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(30,109,255,${0.12 * (1 - d / 60)})`;
          ctx.lineWidth = 1; ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      const x = (p.sx + (p.tx - p.sx) * eased) * W;
      const y = (p.sy + (p.ty - p.sy) * eased) * H;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = p.c + '44'; ctx.lineWidth = 2; ctx.stroke();
    }
    requestAnimationFrame(draw);
  }
  setStep(0);
  draw();
}

// ══ FAQ TOGGLE ══
function toggleFaq(el) {
  el.closest('.faq-item').classList.toggle('open');
}

// ══ CSV UPLOAD ══
function triggerCSV() {
  document.getElementById('csvInput').click();
}

function handleCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => parseCSV(e.target.result, file.name);
  reader.readAsText(file);
}

function parseCSV(text, filename) {
  const statusEl = document.getElementById('csvStatus');
  try {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('File must have at least 2 rows.');

    // Detect header row
    const firstRow = lines[0].split(',').map(s => s.trim());
    let headerRow, dataLines;
    const isHeader = isNaN(parseFloat(firstRow[1])) || firstRow[0] === '';
    if (isHeader) {
      headerRow = firstRow.slice(1);
      dataLines = lines.slice(1);
    } else {
      headerRow = firstRow.map((_, i) => 'Item ' + (i + 1));
      dataLines = lines;
    }

    const labels = [], matrix = [];
    for (const line of dataLines) {
      const parts = line.split(',').map(s => s.trim());
      if (isHeader) {
        labels.push(parts[0]);
        matrix.push(parts.slice(1).map(Number));
      } else {
        labels.push('Item ' + (labels.length + 1));
        matrix.push(parts.map(Number));
      }
    }

    const n = labels.length;
    if (matrix.some(r => r.length !== n)) throw new Error('Matrix is not square.');
    if (matrix.some(r => r.some(isNaN))) throw new Error('Non-numeric values detected.');

    App.labels = labels;
    App.matrix = matrix;
    App.groups = labels.map(() => 0);
    App.groupNames = ['Uploaded Data'];
    App.csvLoaded = true;
    App.coords = [];
    App.manualPoints = [];

    statusEl.textContent = `✓ Loaded: ${filename} (${n}×${n} matrix)`;
    statusEl.className = 'csv-status ok';
    runMDS();
  } catch (err) {
    statusEl.textContent = '✗ ' + err.message;
    statusEl.className = 'csv-status err';
  }
}

// ══ MANUAL MATRIX INPUT ══
function loadManualMatrix() {
  const raw = document.getElementById('manualMatrix').value.trim();
  const labelRaw = document.getElementById('manualLabels').value.trim();
  try {
    const rows = raw.split('\n').map(r => r.split(/[\s,]+/).map(Number));
    const n = rows.length;
    if (rows.some(r => r.length !== n)) throw new Error('Not a square matrix.');
    if (rows.some(r => r.some(isNaN))) throw new Error('Invalid numbers.');

    const labels = labelRaw
      ? labelRaw.split(',').map(s => s.trim()).slice(0, n)
      : Array.from({ length: n }, (_, i) => 'P' + (i + 1));
    while (labels.length < n) labels.push('P' + (labels.length + 1));

    App.labels = labels;
    App.matrix = rows;
    App.groups = labels.map(() => 0);
    App.groupNames = ['Manual Input'];
    App.csvLoaded = true;
    App.coords = [];
    App.manualPoints = [];

    document.getElementById('csvStatus').textContent = `✓ Manual matrix loaded (${n}×${n})`;
    document.getElementById('csvStatus').className = 'csv-status ok';
    runMDS();
  } catch (err) {
    document.getElementById('csvStatus').textContent = '✗ ' + err.message;
    document.getElementById('csvStatus').className = 'csv-status err';
  }
}

// ══ PLAYGROUND CONTROLS ══
function setDims(d, btn) {
  App.dims = d;
  document.querySelectorAll('#btn2D,#btn3D').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ibDim').textContent = d + 'D';
  updateVizTitle();
  runMDS();
}

function setMetric(m, btn) {
  App.metric = m;
  document.querySelectorAll('#btnMetric,#btnNonMetric').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ibAlgo').textContent = m ? 'Metric' : 'Non-Metric';
  document.getElementById('algoInfo').innerHTML = `<p>${m
    ? 'Metric MDS preserves actual distance magnitudes in the output layout.'
    : 'Non-Metric MDS preserves only the rank ordering of distances using isotonic regression.'
  }</p>`;
  updateVizTitle();
  runMDS();
}

function toggleGalaxy() {
  App.galaxy = document.getElementById('galaxyToggle').checked;
  if (App.dims === 3) render3D();
}

function toggleRotate() {
  App.autoRotate = document.getElementById('rotateToggle').checked;
}

function toggleAddMode() {
  App.addMode = !App.addMode;
  const btn = document.getElementById('addModeBtn');
  btn.classList.toggle('active', App.addMode);
  document.getElementById('addOverlay').style.display = App.addMode ? 'flex' : 'none';
}

function clearManual() {
  App.manualPoints = [];
  runMDS();
}

// ══ CORE MDS RUN ══
async function runMDS() {
  if (App.running) return;
  if (!App.csvLoaded && App.labels.length === 0) {
    document.getElementById('vizTitle').textContent = 'Upload a CSV file to begin';
    return;
  }
  App.running = true;

  const allLabels = [...App.labels, ...App.manualPoints.map(p => p.label)];
  const fullMatrix = buildFullMatrix();
  const n = allLabels.length;
  document.getElementById('ibPoints').textContent = n;

  const maxIter = parseInt(document.getElementById('iterSlider').value);
  const speed = parseInt(document.getElementById('speedSlider').value);
  const delay = Math.max(1, (11 - speed) * 6);

  App.coords = Array.from({ length: n }, () =>
    App.dims === 2
      ? [Math.random() * 4 - 2, Math.random() * 4 - 2]
      : [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2]
  );
  renderCurrent();

  let iters = 0;
  await MDSEngine.run(fullMatrix, App.dims, App.metric, maxIter, async (coords, stress, iter) => {
    App.coords = coords;
    iters = iter;
    updateStress(stress);
    renderCurrent();
    await new Promise(r => setTimeout(r, delay));
  });

  document.getElementById('ibIter').textContent = iters;
  App.running = false;
}

function buildFullMatrix() {
  const n = App.labels.length, m = App.manualPoints.length, total = n + m;
  const full = Array.from({ length: total }, (_, i) =>
    Array.from({ length: total }, (_, j) => {
      if (i < n && j < n) return App.matrix[i][j];
      if (i === j) return 0;
      return Math.random() * 4 + 3;
    })
  );
  for (let i = 0; i < total; i++)
    for (let j = i + 1; j < total; j++)
      full[j][i] = full[i][j];
  return full;
}

function renderCurrent() {
  App.dims === 2 ? render2D() : render3D();
}

// ══ 2D RENDERING ══
function render2D() {
  if (!App.coords.length) return;
  const allLabels = [...App.labels, ...App.manualPoints.map(p => p.label)];
  const allGroups = [...App.groups, ...App.manualPoints.map(() => PALETTE.length - 1)];
  const n = allLabels.length;
  const groupMap = {};
  for (let i = 0; i < n; i++) {
    const g = allGroups[i];
    if (!groupMap[g]) groupMap[g] = { x: [], y: [], text: [], idx: [] };
    groupMap[g].x.push(App.coords[i][0]);
    groupMap[g].y.push(App.coords[i][1]);
    groupMap[g].text.push(allLabels[i]);
    groupMap[g].idx.push(i);
  }

  const traces = Object.entries(groupMap).map(([g, d]) => ({
    type: 'scatter', mode: 'markers+text',
    x: d.x, y: d.y, text: d.text,
    textposition: 'top center',
    textfont: { family: 'Plus Jakarta Sans', size: 11, color: '#0F1733' },
    marker: {
      color: PALETTE[parseInt(g) % PALETTE.length],
      size: 14, line: { color: '#fff', width: 2 }, symbol: 'circle'
    },
    name: App.groupNames[parseInt(g)] || 'Group ' + g,
    hovertemplate: '<b style="color:#1E6DFF">%{text}</b><br>x: %{x:.3f}<br>y: %{y:.3f}<extra></extra>'
  }));

  const layout = {
    paper_bgcolor: '#F7F9FF', plot_bgcolor: '#F7F9FF',
    font: { family: 'JetBrains Mono', color: '#4B5C8A', size: 10 },
    xaxis: { showgrid: true, gridcolor: 'rgba(30,60,180,0.07)', zeroline: false, showticklabels: false, showline: false },
    yaxis: { showgrid: true, gridcolor: 'rgba(30,60,180,0.07)', zeroline: false, showticklabels: false, showline: false },
    margin: { l: 20, r: 20, t: 20, b: 20 },
    legend: { bgcolor: 'rgba(255,255,255,0.95)', bordercolor: 'rgba(30,60,180,0.1)', borderwidth: 1, font: { size: 10 } },
    hovermode: 'closest', dragmode: 'pan'
  };

  const el = document.getElementById('plot2d');
  Plotly.react(el, traces, layout, { responsive: true, displayModeBar: false, scrollZoom: true });

  el.on('plotly_click', data => {
    if (!data.points.length) return;
    if (App.addMode) {
      const label = document.getElementById('newLabel').value.trim() || 'P' + (App.manualPoints.length + 1);
      App.manualPoints.push({ label, x: data.points[0].x, y: data.points[0].y });
      document.getElementById('newLabel').value = '';
      document.getElementById('ibPoints').textContent = App.labels.length + App.manualPoints.length;
      runMDS();
      return;
    }
    const name = data.points[0].text;
    const idx = [...App.labels, ...App.manualPoints.map(p => p.label)].indexOf(name);
    showSelectedInfo(idx);
  });

  el.on('plotly_hover', data => {
    if (!data.points.length) return;
    const idx = [...App.labels, ...App.manualPoints.map(p => p.label)].indexOf(data.points[0].text);
    showSelectedInfo(idx);
  });

  updateLegend();
}

// ══ 3D RENDERING ══
function render3D() {
  if (!App.coords.length || App.coords[0].length < 3) return;
  const container = document.getElementById('vizBox');
  const canvas = document.getElementById('plot3d');
  const W = container.clientWidth, H = container.clientHeight;

  if (!scene3) {
    scene3 = new THREE.Scene();
    cam3 = new THREE.PerspectiveCamera(55, W / H, 0.01, 100);
    cam3.position.set(0, 0, 6);
    ren3 = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    ren3.setClearColor(0xF0F4FF, 1);
    setup3DEvents(canvas);
  }

  ren3.setSize(W, H);
  cam3.aspect = W / H;
  cam3.updateProjectionMatrix();
  while (scene3.children.length) scene3.remove(scene3.children[0]);

  if (App.galaxy) {
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(3000);
    for (let i = 0; i < 3000; i++) sp[i] = (Math.random() - .5) * 30;
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene3.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.025, transparent: true, opacity: 0.4 })));
  }

  scene3.add(new THREE.GridHelper(8, 12, 0xDDE4F7, 0xDDE4F7));
  const allLabels = [...App.labels, ...App.manualPoints.map(p => p.label)];
  const allGroups = [...App.groups, ...App.manualPoints.map(() => 0)];
  pts3Group = new THREE.Group();

  App.coords.forEach((c, i) => {
    const col = new THREE.Color(PALETTE[allGroups[i] % PALETTE.length]);
    const geo = new THREE.SphereGeometry(0.1, 16, 16);
    const mat = new THREE.MeshPhongMaterial({ color: col, shininess: 80 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c[0] * 1.6, c[1] * 1.6, c[2] * 1.6);
    const rg = new THREE.TorusGeometry(0.13, 0.012, 8, 32);
    const rm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 });
    mesh.add(new THREE.Mesh(rg, rm));
    pts3Group.add(mesh);
  });

  scene3.add(pts3Group);
  scene3.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dl = new THREE.DirectionalLight(0x00f5d4, 1.2);
  dl.position.set(5, 5, 5);
  scene3.add(dl);
  const dl2 = new THREE.DirectionalLight(0x7b61ff, 0.6);
  dl2.position.set(-5, -5, 3);
  scene3.add(dl2);

  if (raf3) cancelAnimationFrame(raf3);
  (function loop() {
    raf3 = requestAnimationFrame(loop);
    if (App.autoRotate && scene3) scene3.rotation.y += 0.006;
    if (!drag3.active) {
      vel3.x *= 0.93; vel3.y *= 0.93;
      if (scene3) { scene3.rotation.x += vel3.x; scene3.rotation.y += vel3.y; }
    }
    ren3.render(scene3, cam3);
  })();
}

function setup3DEvents(canvas) {
  canvas.addEventListener('mousedown', e => {
    drag3 = { active: true, px: e.clientX, py: e.clientY };
    vel3 = { x: 0, y: 0 };
  });
  window.addEventListener('mouseup', () => { drag3.active = false; });
  window.addEventListener('mousemove', e => {
    if (!drag3.active || !scene3) return;
    const dx = (e.clientX - drag3.px) * 0.007;
    const dy = (e.clientY - drag3.py) * 0.007;
    scene3.rotation.y += dx; scene3.rotation.x += dy;
    vel3 = { x: dy * 0.25, y: dx * 0.25 };
    drag3.px = e.clientX; drag3.py = e.clientY;
  });
  canvas.addEventListener('wheel', e => {
    if (!cam3) return;
    cam3.position.z += e.deltaY * 0.012;
    cam3.position.z = Math.max(2, Math.min(14, cam3.position.z));
  });
}

// ══ STRESS DISPLAY ══
function updateStress(s) {
  const pct = Math.min(s * 150, 100);
  document.getElementById('stressFill').style.width = pct + '%';
  document.getElementById('stressNum').textContent = s.toFixed(4);
}

// ══ SELECTED POINT INFO ══
function showSelectedInfo(idx) {
  if (idx < 0) return;
  const allLabels = [...App.labels, ...App.manualPoints.map(p => p.label)];
  const label = allLabels[idx];
  const coord = App.coords[idx];
  document.getElementById('selCard').innerHTML = `
    <div class="sel-name">${label}</div>
    <div class="sel-meta">Index: ${idx}<br>
    ${coord ? `x: ${coord[0].toFixed(3)}, y: ${coord[1].toFixed(3)}${App.dims === 3 ? `, z: ${coord[2].toFixed(3)}` : ''}` : ''}
    </div>`;
  if (App.coords.length > 1) {
    const dists = allLabels.map((l, i) => {
      if (i === idx) return { l, d: Infinity };
      const c1 = App.coords[idx], c2 = App.coords[i];
      const d = Math.sqrt(c1.reduce((s, v, k) => s + (v - (c2[k] || 0)) ** 2, 0));
      return { l, d };
    }).filter(x => x.d < Infinity).sort((a, b) => a.d - b.d).slice(0, 4);
    document.getElementById('nbrList').innerHTML = dists
      .map(({ l, d }) => `<li><span>${l}</span><span class="nbr-dist">${d.toFixed(3)}</span></li>`)
      .join('');
  }
}

// ══ LEGEND ══
function updateLegend() {
  document.getElementById('legendBox').innerHTML = App.groupNames
    .map((n, i) => `<div class="legend-item"><div class="legend-chip" style="background:${PALETTE[i]}"></div><span>${n}</span></div>`)
    .join('');
}

// ══ VIZ TITLE ══
function updateVizTitle() {
  const lbl = App.labels.length ? App.labels.length + ' items' : 'No Data';
  document.getElementById('vizTitle').textContent = `${App.dims}D ${App.metric ? 'Metric' : 'Non-Metric'} MDS — ${lbl}`;
}

// ══ RESET ══
function resetViz() {
  App.manualPoints = [];
  App.coords = [];
  runMDS();
}

// ══ EXPORT IMAGE ══
function exportImg() {
  if (App.dims === 2) {
    Plotly.downloadImage('plot2d', { format: 'png', filename: 'mds-visualization', width: 1400, height: 900 });
  } else {
    const c = document.getElementById('plot3d');
    const a = document.createElement('a');
    a.download = 'mds-3d.png';
    a.href = c.toDataURL();
    a.click();
  }
}

// ══ COMPARE PAGE ══
async function runCompareFromUpload() {
  if (!App.csvLoaded && App.labels.length === 0) {
    alert('Please upload a CSV file in the Playground first.');
    return;
  }
  const matrix = App.matrix;
  const fakeData = { items: App.labels, groups: App.groups, groupNames: App.groupNames };
  const [resM, resNM] = await Promise.all([
    MDSEngine.run(matrix, 2, true, 120),
    MDSEngine.run(matrix, 2, false, 120)
  ]);
  renderComparePlot('cmpMetric', fakeData, resM.coords);
  renderComparePlot('cmpNonMetric', fakeData, resNM.coords);
  document.getElementById('cmpStressM').textContent = resM.stress.toFixed(4);
  document.getElementById('cmpStressNM').textContent = resNM.stress.toFixed(4);
}

function renderComparePlot(containerId, data, coords) {
  const el = document.getElementById(containerId);
  const traces = data.items.map((item, i) => ({
    type: 'scatter', mode: 'markers+text',
    x: [coords[i][0]], y: [coords[i][1]], text: [item],
    textposition: 'top center',
    textfont: { family: 'Plus Jakarta Sans', size: 10, color: '#0F1733' },
    marker: { color: PALETTE[data.groups[i] % PALETTE.length], size: 12, line: { color: '#fff', width: 2 } },
    name: data.groupNames[data.groups[i]] || '',
    showlegend: false,
    hovertemplate: '<b>%{text}</b><extra></extra>'
  }));
  Plotly.react(el, traces, {
    paper_bgcolor: '#F0F4FF', plot_bgcolor: '#F0F4FF',
    font: { family: 'JetBrains Mono', color: '#4B5C8A', size: 9 },
    xaxis: { showgrid: true, gridcolor: 'rgba(30,60,180,0.07)', zeroline: false, showticklabels: false },
    yaxis: { showgrid: true, gridcolor: 'rgba(30,60,180,0.07)', zeroline: false, showticklabels: false },
    margin: { l: 16, r: 16, t: 16, b: 16 }, hovermode: 'closest'
  }, { responsive: true, displayModeBar: false });
}

// ══ GLOBAL KEYBOARD SHORTCUTS ══
window.addEventListener('resize', () => {
  if (App.dims === 2 && App.coords.length) render2D();
  if (App.dims === 3 && ren3) {
    const c = document.getElementById('vizBox');
    ren3.setSize(c.clientWidth, c.clientHeight);
    cam3.aspect = c.clientWidth / c.clientHeight;
    cam3.updateProjectionMatrix();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'r' || e.key === 'R') runMDS();
  if (e.key === 'Escape') {
    App.addMode = false;
    document.getElementById('addModeBtn').classList.remove('active');
    document.getElementById('addOverlay').style.display = 'none';
  }
});
