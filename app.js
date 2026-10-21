/* ============================================================
   app.js — site logic: data loading, i18n, rendering, motion.
   Depends on: js/data.js (window.MMM), GSAP, ScrollTrigger, Lenis.
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

const qs  = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ================= shared state ================= */
MMM.state = { lang: null, projects: [], view: [], source: 'defaults' };
let menuOpen = false, modalOpen = false, swapping = false, lenis = null, current = 0;

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const PLUS  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arNum = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const pTitle = p => (MMM.state.lang === 'ar' && p.titleAr) ? p.titleAr : p.title;
const pic = (seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}.jpg`;

/* per-language content with graceful en fallback (field by field) */
function projLoc(p){
  const en = p.en || {};
  if (MMM.state.lang !== 'ar' || !p.ar) return en;
  const m = Object.assign({}, en);
  for (const k in p.ar) if (p.ar[k]) m[k] = p.ar[k];
  return m;
}

/* ================= supabase ================= */
function initSupabase(){
  const cfg = MMM.SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.anonKey ||
      cfg.url.includes('YOUR-PROJECT') || cfg.anonKey.includes('YOUR-ANON-KEY')) {
    console.warn('[mmm] Supabase not configured — using cached data / defaults');
    return null;
  }
  try { return supabase.createClient(cfg.url, cfg.anonKey); }
  catch (e) { console.warn('[mmm] Supabase init failed:', e); return null; }
}
MMM.sb = initSupabase();

/* row <-> project mappers (DB columns are snake_case) */
MMM.rowToProject = r => ({
  id: r.id, title: r.title, titleAr: r.title_ar || '',
  year: r.year || '', seed: r.seed || r.id, img: r.img || '', img2: r.img2 || '',
  demoUrl: r.demo_url || '',
  gallery: Array.isArray(r.gallery) ? r.gallery : [],
  hidden: !!r.hidden, sort_order: r.sort_order || 0,
  en: r.en || {}, ar: r.ar || {}
});
MMM.projectToRow = (p, sortOrder) => ({
  id: p.id, title: p.title, title_ar: p.titleAr || '',
  year: String(p.year || ''), seed: p.seed || p.id,
  img: p.img || '', img2: p.img2 || '',
  demo_url: p.demoUrl || '',
  gallery: Array.isArray(p.gallery) ? p.gallery : [],
  hidden: !!p.hidden, sort_order: sortOrder || 0,
  en: p.en || {}, ar: p.ar || {}
});

/* ================= project data pipeline =================
   1. Supabase (live database — source of truth for everyone)
   2. localStorage snapshot (last successful fetch — offline fallback)
   3. built-in defaults from js/data.js                          */
async function fetchFromSupabase(){
  if (!MMM.sb) return null;
  try {
    /* public site: only rows that are not hidden. RLS enforces this
       server-side as well — this filter is defense in depth. */
    const { data, error } = await MMM.sb
      .from('projects').select('*').eq('hidden', false)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []).map(MMM.rowToProject);
  } catch (e) {
    console.warn('[mmm] Supabase fetch failed:', e.message || e);
    return null;
  }
}
function persistCache(){
  try {
    localStorage.setItem(MMM.KEYS.cache, JSON.stringify({
      version: 2, savedAt: new Date().toISOString(), projects: MMM.state.projects
    }));
  } catch (e) {}
}
async function loadProjects(){
  let list = null, source = 'defaults';
  list = await fetchFromSupabase();
  if (list) {
    /* the database answered — it is the single source of truth, even when
       it returns ZERO rows. Falling back to the localStorage snapshot here
       is what kept deleted projects visible on the public site. */
    source = 'supabase';
  } else {
    try {
      const j = JSON.parse(localStorage.getItem(MMM.KEYS.cache) || 'null');
      if (j && Array.isArray(j.projects) && j.projects.length) { list = j.projects; source = 'cache'; }
    } catch (e) {}
  }
  if (!list) list = MMM.PROJECTS.map(p => Object.assign({}, p));
  MMM.state.projects = list;
  MMM.state.source = source;
  if (source === 'supabase') persistCache();
}
MMM.cacheAndRender = () => { persistCache(); MMM.rerenderProjects(); };
/* ================= rendering ================= */
function renderHero(){
  const ar = MMM.state.lang === 'ar';
  const l1 = ar ? 'مروان' : 'MARWAN';
  const l2 = ar ? 'م. مهروس' : 'M. MAHROUS';
  const el = qs('#heroName');
  el.innerHTML =
    `<span class="hline"><span class="hline-in">${l1}</span></span>` +
    `<span class="hline outline"><span class="hline-in">${l2}</span></span>`;
  el.setAttribute('aria-label', ar ? 'مروان م. مهروس' : 'Marwan M. Mahrous');
}

function renderInfo(){
  qs('#infoTable').innerHTML = MMM.I18N[MMM.state.lang].infoRows
    .map(([k, v]) => `<div class="info-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
}

function renderMarquee(){
  const item = MMM.STACK.map(s => `<span class="mq-item"><i>//</i>${s}</span>`).join('');
  qs('#mqTrack').innerHTML = item + item;
}

function renderWork(){
  const t = MMM.I18N[MMM.state.lang];
  MMM.state.view = MMM.state.projects.filter(p => p && !p.hidden);
  qs('#workGrid').innerHTML = MMM.state.view.map((p, i) => {
    const d = projLoc(p);
    const chips = (d.stack || '').split('·').map(s => s.trim()).filter(Boolean).slice(0, 4)
      .map(c => `<span class="chip">${c}</span>`).join('');
    return `<article class="card" data-index="${i}" tabindex="0" role="button" aria-label="${p.title}">
      <div class="card-top"><span>${String(i + 1).padStart(2, '0')} — ${p.id}</span>
        <span class="st"><span class="dot"></span>${p.year} · ${t.shipped}</span></div>
      <div class="card-img" data-shot="thumb"><img loading="lazy" src="${p.img || pic(p.seed || p.id, 800, 450)}" alt="${esc(p.title)}"></div>
      <div class="card-body">
        <h3 class="card-title"><span>${pTitle(p)}</span>${ARROW}</h3>
        <p class="card-desc">${d.short || ''}</p>
        <div class="card-tags">${chips}</div>
      </div></article>`;
  }).join('') || '<p class="work-empty">no published projects yet — check back soon.</p>';
  initReveals();
}

function updateWorkCount(){
  const vis = MMM.state.view.length ? MMM.state.view : MMM.state.projects.filter(p => !p.hidden);
  const yrs = vis.map(p => +p.year).filter(y => !isNaN(y));
  const min = yrs.length ? Math.min(...yrs) : '----';
  const max = yrs.length ? Math.max(...yrs) : '----';
  const txt = `${String(vis.length).padStart(2, '0')} ${MMM.state.lang === 'ar' ? 'مشاريع' : 'projects'} — ${min}/${max}`;
  qs('#workCount').textContent = MMM.state.lang === 'ar' ? arNum(txt) : txt;
}

function renderServices(){
  qs('#servicesAcc').innerHTML = MMM.SERVICES.map((s, i) => {
    const d = s[MMM.state.lang] || s.en;
    const chips = (d.tags || '').split('·').map(c => `<span class="chip">${c.trim()}</span>`).join('');
    return `<div class="acc-item${i === 0 ? ' open' : ''}">
      <button class="acc-head" aria-expanded="${i === 0}">
        <span class="acc-idx">0${i + 1}</span>
        <span class="acc-name">${d.name}</span>
        <span class="acc-ico">${PLUS}</span>
      </button>
      <div class="acc-body"><div><div class="acc-cont">
        <p class="copy">${d.desc}</p>
        <div class="acc-tags">${chips}</div>
      </div></div></div></div>`;
  }).join('');
}

function renderEdu(){
  qs('#eduList').innerHTML = MMM.EDU.map(r => {
    const d = r[MMM.state.lang] || r.en;
    return `<div class="kv-row"><span>${d.l}</span><span class="mono">${r.v}</span></div>`;
  }).join('');
}

let manifestoST = null;
function renderManifesto(){
  const mp = qs('#manifesto');
  mp.innerHTML = MMM.I18N[MMM.state.lang].manifesto.trim().split(/\s+/).map(w => {
    const acc = w.startsWith('*');
    return `<span class="w${acc ? ' acc' : ''}">${w.replace(/\*/g, '')}</span>`;
  }).join(' ');
  if (manifestoST) { manifestoST.kill(); manifestoST = null; }
  if (!reduced) {
    manifestoST = gsap.fromTo(mp.querySelectorAll('.w'), { opacity: .13 },
      { opacity: 1, stagger: .06, ease: 'none',
        scrollTrigger: { trigger: mp, start: 'top 80%', end: 'bottom 55%', scrub: .4 } });
  }
}

/* ================= i18n ================= */
function applyLang(){
  const t = MMM.I18N[MMM.state.lang];
  document.documentElement.lang = MMM.state.lang;
  document.documentElement.dir = MMM.state.lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t.docTitle;
  qs('#metaDesc').content = t.docDesc;
  qsa('[data-i18n]').forEach(el => { const v = t[el.dataset.i18n]; if (v != null) el.textContent = v; });
  qsa('[data-i18n-html]').forEach(el => { const v = t[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  qsa('[data-lang-btn]').forEach(b => b.textContent = MMM.state.lang === 'ar' ? 'EN' : 'عربي');
  renderHero(); renderInfo(); renderMarquee(); renderWork();
  renderServices(); renderEdu(); renderManifesto();
  updateWorkCount();
  qs('#typedPrefix').textContent = t.typedPrefix;
  refreshProg();
}

function setLang(next){
  if (next === MMM.state.lang || swapping) return;
  swapping = true;
  if (modalOpen) closeModal();
  const doSwap = () => {
    MMM.state.lang = next;
    try { localStorage.setItem('mmm-lang', next); } catch (e) {}
    applyLang();
    startTyping();
    gsap.delayedCall(.06, () => ScrollTrigger.refresh());
    swapping = false;
  };
  if (reduced) { doSwap(); return; }
  gsap.to('main', { opacity: 0, duration: .22, ease: 'power2.in', onComplete: () => {
    doSwap();
    gsap.to('main', { opacity: 1, duration: .4, ease: 'power2.out' });
  }});
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lang-btn]');
  if (b) setLang(MMM.state.lang === 'ar' ? 'en' : 'ar');
});

/* ================= smooth scroll + header + progress ================= */
if (!reduced) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // released after boot
}
const header = qs('#siteHeader');
function refreshProg(){
  let p = 0;
  if (lenis) p = lenis.progress || 0;
  else {
    const h = document.documentElement.scrollHeight - innerHeight;
    p = h > 0 ? (window.scrollY || 0) / h : 0;
  }
  const el = qs('#stProg'); if (el) el.textContent = Math.round(p * 100) + '%';
}
function onScroll(y){ header.classList.toggle('scrolled', y > 24); }
if (lenis) lenis.on('scroll', e => { onScroll(e.scroll); refreshProg(); });
else window.addEventListener('scroll', () => { onScroll(window.scrollY); refreshProg(); }, { passive: true });

/* scroll lock used by modal / menu / admin */
MMM.lockScroll = lock => {
  if (!lenis) return;
  if (lock) lenis.stop();
  else if (!modalOpen && !menuOpen) lenis.start();
};

/* ================= typed role cycler ================= */
let typeTimer = null;
function startTyping(){
  clearTimeout(typeTimer);
  const el = qs('#typedText');
  const words = MMM.I18N[MMM.state.lang].typed;
  if (reduced) { el.textContent = words[0]; return; }
  let idx = 0, ci = 0, del = false;
  (function step(){
    const word = words[idx];
    el.textContent = word.slice(0, ci);
    if (!del) {
      ci++;
      if (ci > word.length) { del = true; typeTimer = setTimeout(step, 1800); return; }
    } else {
      ci--;
      if (ci <= 0) { del = false; ci = 0; idx = (idx + 1) % words.length; }
    }
    typeTimer = setTimeout(step, del ? 30 : 62);
  })();
}

/* ================= boot preloader + hero intro ================= */
const BOOT = [
  'marwan@Alexandria:~$ whoami',
  'marwan-m-mahrous — software engineer',
  'marwan@Alexandria:~$ make deploy --lang=en,ar',
  '[██████████] 100% — build ready, launching'
];
const wait = ms => new Promise(r => setTimeout(r, ms));

function heroIntro(){
  gsap.timeline({ delay: .2 })
    .to('.hline-in', { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: .1 })
    .to(['.hero-top', '.hero-desc', '.hero-ctas'], { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .08 }, '-=.55')
    .to('.info-row', { autoAlpha: 1, y: 0, duration: .6, stagger: .06, ease: 'power2.out' }, '-=.6');
}
async function boot(){
  const box = qs('#bootLines');
  for (const line of BOOT) {
    const el = document.createElement('div');
    el.className = 'bl';
    box.appendChild(el);
    for (const ch of line) { el.textContent += ch; await wait(13); }
    await wait(130);
  }
  await wait(260);
  gsap.to('#preloader', { yPercent: -100, duration: .75, ease: 'power4.inOut' });
  heroIntro();
  gsap.delayedCall(.35, () => lenis && lenis.start());
  gsap.delayedCall(1, () => qs('#preloader').style.display = 'none');
}

/* ================= project modal ================= */
/* gallery — extra images (full-page screenshots welcome, never cropped) */
function renderGallery(p){
  const g = qs('#mGallery');
  const items = (Array.isArray(p.gallery) ? p.gallery : []).filter(it => it && it.url);
  if (!items.length){ g.hidden = true; g.innerHTML = ''; return; }
  g.hidden = false;
  g.innerHTML = items.map(it => {
    const cap = it.cap || '';
    return '<figure data-shot="full"><img loading="lazy" src="' + esc(it.url) + '" alt="' + esc((p.title || '') + ' — screenshot') + '">' +
      (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
  }).join('');
}

function fillModal(i, override){
  const p = override || MMM.state.view[i], d = projLoc(p);
  if (!p) return;
  qs('#mPath').textContent = '~/work/' + p.id;
  qs('#mCat').textContent = '// ' + (d.cat || '');
  qs('#mTitle').textContent = pTitle(p);
  qs('#mType').textContent = d.type || '—';
  qs('#mYear').textContent = p.year || '—';
  qs('#mRole').textContent = d.role || '—';
  qs('#mStack').textContent = d.stack || '—';
  qs('#mP1').textContent = d.p1 || '';
  qs('#mP2').textContent = d.p2 || '';
  const i1 = qs('#mImg1'), i2 = qs('#mImg2');
  i1.src = p.img  || pic(p.seed || p.id, 1400, 800);        i1.alt = p.title;
  i2.src = p.img2 || pic((p.seed || p.id) + '-b', 1400, 800); i2.alt = p.title + ' detail';
  /* live demo button — shown ONLY when a real URL is configured */
  const demo = qs('#mDemo');
  if (p.demoUrl) {
    demo.href = p.demoUrl;
    demo.hidden = false;
    qs('#mDemoLabel').textContent = (MMM.I18N[MMM.state.lang] || {}).mDemo || 'live demo';
  } else {
    demo.hidden = true;
    demo.removeAttribute('href');
  }
  renderGallery(p);
  if (!override) {
    const n = MMM.state.view.length;
    const np = n ? MMM.state.view[(i + 1) % n] : null;
    if (np) qs('#mNextName').textContent = pTitle(np);
  }
}
function openModal(i, override){
  current = i; fillModal(i, override);
  modalOpen = true;
  qs('#modal').classList.add('open');
  qs('#modal').setAttribute('aria-hidden', 'false');
  /* a single previewed project has no "next" sibling */
  qs('#mNext').style.display = override ? 'none' : '';
  qs('#mScroll').scrollTop = 0;
  MMM.lockScroll(true);
  if (!reduced) gsap.fromTo('.m-win', { y: 26, autoAlpha: 0, scale: .985 },
    { y: 0, autoAlpha: 1, scale: 1, duration: .5, ease: 'power3.out' });
}
function closeModal(){
  if (!modalOpen) return;
  modalOpen = false;
  const done = () => {
    qs('#modal').classList.remove('open');
    qs('#modal').setAttribute('aria-hidden', 'true');
    qs('#mNext').style.display = '';
  };
  if (reduced) done();
  else gsap.to('.m-win', { y: 20, autoAlpha: 0, duration: .3, ease: 'power2.in', onComplete: done });
  MMM.lockScroll(false);
  /* admin preview support — restores the editor after an unsaved-changes preview */
  if (typeof MMM.onPreviewClosed === 'function') MMM.onPreviewClosed();
}
qs('#workGrid').addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (card) openModal(+card.dataset.index);
});
qs('#workGrid').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.card');
  if (card) { e.preventDefault(); openModal(+card.dataset.index); }
});
qs('#mClose').addEventListener('click', closeModal);
qs('#mBackdrop').addEventListener('click', closeModal);
qs('#mNext').addEventListener('click', () => {
  const next = (current + 1) % MMM.state.view.length;
  gsap.to('#mScroll', { opacity: 0, duration: .2, onComplete: () => {
    current = next; fillModal(next); qs('#mScroll').scrollTop = 0;
    gsap.to('#mScroll', { opacity: 1, duration: .3 });
  }});
});

/* ================= lightbox — full-image viewer =================
   Click any image inside the project modal to inspect the complete,
   uncropped original — including extremely tall full-page screenshots. */
const lb = qs('#lightbox'), lbImg = qs('#lbImg');
let lbOpen = false;
function openLightbox(src, alt){
  if (!src) return;
  lbImg.src = src; lbImg.alt = alt || '';
  lbOpen = true;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  qs('#lbScroll').scrollTop = 0;
  MMM.lockScroll(true);
}
function closeLightbox(){
  if (!lbOpen) return;
  lbOpen = false;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  lbImg.removeAttribute('src');
  MMM.lockScroll(false); /* no-op while the modal or menu is still open */
}
qs('#mImg1').addEventListener('click', () => openLightbox(qs('#mImg1').src, qs('#mImg1').alt));
qs('#mImg2').addEventListener('click', () => openLightbox(qs('#mImg2').src, qs('#mImg2').alt));
qs('#mGallery').addEventListener('click', e => {
  const img = e.target.closest('img');
  if (img) openLightbox(img.src, img.alt);
});
qs('#lbClose').addEventListener('click', closeLightbox);
qs('#lbBackdrop').addEventListener('click', closeLightbox);

/* ================= mobile menu ================= */
const burger = qs('#burger');
function toggleMenu(force){
  menuOpen = force !== undefined ? force : !menuOpen;
  document.body.classList.toggle('menu-open', menuOpen);
  burger.setAttribute('aria-expanded', menuOpen);
  MMM.lockScroll(!menuOpen ? false : true);
  if (!menuOpen && modalOpen) MMM.lockScroll(true);
}
burger.addEventListener('click', () => toggleMenu());

/* ================= anchors ================= */
function goTo(target){
  if (lenis) lenis.scrollTo(target, { duration: 1.3, easing: t => 1 - Math.pow(1 - t, 4) });
  else target.scrollIntoView({ behavior: 'smooth' });
}
qsa('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  if (menuOpen) { toggleMenu(false); setTimeout(() => goTo(t), 480); }
  else goTo(t);
}));
const goHome = () => lenis ? lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' });
qs('#stHome').addEventListener('click', goHome);
qs('#toTop').addEventListener('click', goHome);

/* ================= accordion ================= */
qs('#servicesAcc').addEventListener('click', e => {
  const head = e.target.closest('.acc-head');
  if (!head) return;
  const item = head.closest('.acc-item');
  const wasOpen = item.classList.contains('open');
  qsa('#servicesAcc .acc-item').forEach(o => {
    o.classList.remove('open');
    o.querySelector('.acc-head').setAttribute('aria-expanded', 'false');
  });
  if (!wasOpen) { item.classList.add('open'); head.setAttribute('aria-expanded', 'true'); }
});

/* ================= scroll reveals ================= */
const revealed = new WeakSet();
function revealEl(el, y, start){
  if (revealed.has(el)) return;
  revealed.add(el);
  gsap.fromTo(el, { y, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start, once: true } });
}
function initReveals(){
  if (reduced) return;
  qsa('[data-reveal]').forEach(el => revealEl(el, 30, 'top 88%'));
  qsa('.card').forEach(el => revealEl(el, 40, 'top 92%'));
}

/* ================= Cairo clock ================= */
function tick(){
  const s = new Intl.DateTimeFormat('en-GB',
    { hour12: false, timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(new Date());
  qsa('.js-clock').forEach(el => el.textContent = 'CAI ' + s);
}

/* ================= toast + copy email ================= */
const toast = qs('#toast');
let toastTimer;
MMM.showToast = msg => {
  toast.textContent = msg;
  gsap.to(toast, { autoAlpha: 1, y: 0, duration: .35, ease: 'power3.out', overwrite: true, startAt: { y: 12 } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => gsap.to(toast, { autoAlpha: 0, y: 8, duration: .3 }), 2400);
};
qs('#copyEmail').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(MMM.EMAIL); }
  catch (_) {
    const ta = document.createElement('textarea');
    ta.value = MMM.EMAIL; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  MMM.showToast(MMM.I18N[MMM.state.lang].toast);
});

/* ================= admin hooks ================= */
MMM.rerenderProjects = () => { renderWork(); updateWorkCount(); ScrollTrigger.refresh(); };
MMM.reloadProjects = async () => { await loadProjects(); MMM.rerenderProjects(); };
/* preview — renders a project object through the REAL public modal.
   Used by the admin panel; purely client-side, never writes to the DB,
   never changes published/hidden state, works for unsaved form values. */
MMM.openProjectPreview = p => { closeLightbox(); openModal(0, p); };

/* ================= escape key (admin takes priority) ================= */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (MMM.admin && MMM.admin.isOpen) return; // admin.js handles it
  if (lbOpen) { closeLightbox(); return; }
  if (modalOpen) closeModal();
  else if (menuOpen) toggleMenu(false);
});

/* ================= init ================= */
(async function init(){
  MMM.state.lang = localStorage.getItem('mmm-lang') || ((navigator.language || '').indexOf('ar') === 0 ? 'ar' : 'en');
  await loadProjects();
  applyLang();
  startTyping();
  tick(); setInterval(tick, 1000);
  if (MMM.admin && MMM.admin.renderList) MMM.admin.renderList(); // admin may already be open via #admin

  if (reduced) {
    qs('#preloader').style.display = 'none';
  } else {
    gsap.set('.hline-in', { yPercent: 115 });
    gsap.set(['.hero-top', '.hero-desc', '.hero-ctas'], { autoAlpha: 0, y: 18 });
    gsap.set('.info-row', { autoAlpha: 0, y: 14 });
    boot();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();