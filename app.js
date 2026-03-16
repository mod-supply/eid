/* ═══════════════════════════════════════
   مولد المعايدات — App Logic
   ═══════════════════════════════════════ */

/* ── Template configuration ──────────────────────────────────────────
   src   : path to template image
   fb    : CSS fallback class if image fails to load
   label : displayed name
   text  : canvas text placement
     x, y  → 0–1 fraction of canvas width/height
     fs    → base font size at 1080px wide
     color → hex or rgba
──────────────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 1, src: 'des/te1.jpg', fb: 'tf1', label: 'قالب ١',
    text: { x: 0.5, y: 0.82, fs: 40, color: '#993b2e' }
  },
  {
    id: 2, src: 'des/te2.jpg', fb: 'tf2', label: 'قالب ٢',
    text: { x: 0.5, y: 0.82, fs: 40, color: '#fcf8ec' }
  },
  {
    id: 3, src: 'des/te3.jpg', fb: 'tf3', label: 'قالب ٣',
    text: { x: 0.5, y: 0.82, fs: 40, color: '#993b2e' }
  }
];

/* Canvas output dimensions (9:16) */
const CANVAS_W = 1080;
const CANVAS_H = 1920;

/* Step metadata */
const STEP_META = [
  { num: 1, label: 'القالب'  },
  { num: 2, label: 'الاسم'   },
  { num: 3, label: 'المعاينة' }
];

/* ── State ── */
let selectedTemplate = null;
let generatedDataUrl = null;
let currentStep = 1;

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  buildStepBar();
  buildTemplateThumbs();
  bindEvents();
});

/* ═══════════════════════════════════════
   BUILD: Step indicator bar
═══════════════════════════════════════ */
function buildStepBar() {
  const bar = document.getElementById('steps-bar');

  STEP_META.forEach((s, i) => {
    /* Node */
    const node = document.createElement('div');
    node.className = 'step-node' + (i === 0 ? ' active' : '');
    node.id = `sn${s.num}`;
    node.innerHTML = `
      <div class="step-circle">
        <span class="num">${s.num}</span>
        <svg viewBox="0 0 12 12">
          <polyline points="2,6 5,9 10,3"/>
        </svg>
      </div>
      <span class="step-label">${s.label}</span>
    `;
    bar.appendChild(node);

    /* Connector line between nodes */
    if (i < STEP_META.length - 1) {
      const line = document.createElement('div');
      line.className = 'step-line';
      line.id = `sl${s.num}`;
      bar.appendChild(line);
    }
  });
}

/* ═══════════════════════════════════════
   BUILD: Template thumbnails
═══════════════════════════════════════ */
function buildTemplateThumbs() {
  const row = document.getElementById('tmpl-row');

  TEMPLATES.forEach(t => {
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.dataset.id = t.id;

    /* Template image */
    const img = document.createElement('img');
    img.src = t.src;
    img.alt = t.label;
    img.onerror = () => {
      img.style.display = 'none';
      const fb = document.createElement('div');
      fb.className = `thumb-fb ${t.fb}`;
      thumb.insertBefore(fb, thumb.firstChild);
    };

    /* Check icon */
    const chk = document.createElement('div');
    chk.className = 'chk';
    chk.innerHTML = `
      <svg viewBox="0 0 12 12">
        <polyline points="2,6 5,9 10,3"/>
      </svg>
    `;

    thumb.appendChild(img);
    thumb.appendChild(chk);
    thumb.addEventListener('click', () => pickTemplate(t, thumb));
    row.appendChild(thumb);
  });
}

/* ═══════════════════════════════════════
   BIND: Event listeners
═══════════════════════════════════════ */
function bindEvents() {
  /* Step 1 → next */
  document.getElementById('s1-next').addEventListener('click', () => goStep(2));

  /* Step 2 → generate */
  document.getElementById('s2-next').addEventListener('click', generate);

  /* Name input → enable/disable button */
  document.getElementById('name-inp').addEventListener('input', () => {
    const hasValue = document.getElementById('name-inp').value.trim().length > 0;
    document.getElementById('s2-next').disabled = !hasValue;
  });

  /* Badge "تغيير" → back to step 1 */
  document.getElementById('badge-change').addEventListener('click', () => goStep(1));

  /* Download */
  document.getElementById('btn-download').addEventListener('click', downloadCard);

  /* Restart */
  document.getElementById('btn-restart').addEventListener('click', restart);
}

/* ═══════════════════════════════════════
   STEP 1: Pick template
═══════════════════════════════════════ */
function pickTemplate(t, thumbEl) {
  selectedTemplate = t;
  document.querySelectorAll('.thumb').forEach(x => x.classList.remove('sel'));
  thumbEl.classList.add('sel');
  document.getElementById('s1-next').disabled = false;
}

/* ═══════════════════════════════════════
   STEP NAVIGATION
═══════════════════════════════════════ */
function goStep(n) {
  /* Hide current panel */
  document.getElementById(`sp${currentStep}`).classList.remove('active');

  /* Update step indicator nodes */
  for (let i = 1; i <= 3; i++) {
    const node = document.getElementById(`sn${i}`);
    node.classList.remove('active', 'done');
    if (i < n)       node.classList.add('done');
    else if (i === n) node.classList.add('active');

    if (i < 3) {
      const line = document.getElementById(`sl${i}`);
      line.classList.toggle('done', i < n);
    }
  }

  /* Step-specific setup */
  if (n === 1) {
    document.getElementById('s2-next').disabled = true;
  }

  if (n === 2 && selectedTemplate) {
    populateBadge();
    document.getElementById('name-inp').value = '';
    document.getElementById('s2-next').disabled = true;
    setTimeout(() => document.getElementById('name-inp').focus(), 320);
  }

  /* Show new panel */
  currentStep = n;
  document.getElementById(`sp${n}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Populate the mini badge in step 2 ── */
function populateBadge() {
  if (!selectedTemplate) return;

  const thumbWrap = document.getElementById('badge-thumb');
  thumbWrap.innerHTML = '';

  const img = document.createElement('img');
  img.src = selectedTemplate.src;
  img.alt = selectedTemplate.label;
  img.onerror = () => {
    img.style.display = 'none';
    const fb = document.createElement('div');
    fb.className = `sel-badge-fb ${selectedTemplate.fb}`;
    fb.style.cssText = 'width:100%;height:100%;border-radius:5px;';
    thumbWrap.appendChild(fb);
  };

  thumbWrap.appendChild(img);
  document.getElementById('badge-label').textContent = selectedTemplate.label;
}

/* ═══════════════════════════════════════
   GENERATE: Render card on canvas
═══════════════════════════════════════ */
async function generate() {
  const name = document.getElementById('name-inp').value.trim();
  if (!name) {
    shake(document.getElementById('name-inp'));
    document.getElementById('name-inp').focus();
    return;
  }

  const btn = document.getElementById('s2-next');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const canvas = document.getElementById('cvs');
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');

    /* Draw template image (or fallback gradient) */
    let templateImg = null;
    try { templateImg = await loadImage(selectedTemplate.src); } catch (_) {}

    if (templateImg) {
      ctx.drawImage(templateImg, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      drawFallbackGradient(ctx, selectedTemplate.fb);
    }

    /* Draw name text */
    drawName(ctx, name, selectedTemplate.text);

    /* Export to data URL */
    generatedDataUrl = canvas.toDataURL('image/png');
    trackEvent('generate', selectedTemplate, name);

    /* Transition to step 3 */
    goStep(3);
    setTimeout(() => {
      const pvImg = document.getElementById('pv-img');
      pvImg.src = generatedDataUrl;
      pvImg.onload = () => pvImg.classList.add('vis');
    }, 60);

  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ── Draw name — fixed 30px, no shadow, no stroke ── */
function drawName(ctx, name, cfg) {
  ctx.save();
  ctx.font         = `900 ${cfg.fs}px Cairo, sans-serif`;
  ctx.fillStyle    = cfg.color;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction    = 'rtl';
  ctx.fillText(name, cfg.x * CANVAS_W, cfg.y * CANVAS_H);
  ctx.restore();
}

/* ── Fallback gradient background ── */
function drawFallbackGradient(ctx, fb) {
  const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  if (fb === 'tf2') {
    g.addColorStop(0, '#6B3320');
    g.addColorStop(1, '#2E1006');
  } else if (fb === 'tf3') {
    g.addColorStop(0,   '#D4A87A');
    g.addColorStop(0.6, '#9C6040');
    g.addColorStop(1,   '#4A1E0A');
  } else {
    g.addColorStop(0, '#C8956A');
    g.addColorStop(1, '#6B3320');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

/* ═══════════════════════════════════════
   DOWNLOAD
═══════════════════════════════════════ */
function downloadCard() {
  if (!generatedDataUrl) return;
  const name = document.getElementById('name-inp').value.trim() || 'بطاقة';
  const a = document.createElement('a');
  a.href = generatedDataUrl;
  a.download = `معايدة-${name}.png`;
  a.click();
}
trackEvent(
  'download',
  selectedTemplate,
  document.getElementById('name-inp').value
);

/* ═══════════════════════════════════════
   RESTART
═══════════════════════════════════════ */
function restart() {
  selectedTemplate = null;
  generatedDataUrl = null;

  document.querySelectorAll('.thumb').forEach(x => x.classList.remove('sel'));
  document.getElementById('s1-next').disabled = true;
  document.getElementById('pv-img').classList.remove('vis');
  document.getElementById('pv-img').src = '';

  goStep(1);
}

/* ═══════════════════════════════════════
   UTILITIES
═══════════════════════════════════════ */

/** Load an image and return a Promise<HTMLImageElement> */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Shake animation on invalid input */
function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight; // force reflow
  el.style.animation = 'shk 0.35s ease';
}
