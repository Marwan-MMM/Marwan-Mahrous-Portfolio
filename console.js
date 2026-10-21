/* ============================================================
   console.js — controller for admin.html (MMM Console).
   Auth + projects via Supabase. Data model matches data.js/app.js:
   projects(id, title, title_ar, year, seed, img, img2, hidden,
            sort_order, en jsonb, ar jsonb) + Storage bucket 'media'.
   ============================================================ */
(function(){
'use strict';

const $   = id => document.getElementById(id);
const qsa = s => [...document.querySelectorAll(s)];
const cfg = (window.MMM && MMM.SUPABASE) || {};
const CONFIGURED = !!(window.supabase && cfg.url && cfg.anonKey &&
  !String(cfg.url).includes('YOUR-PROJECT') && !String(cfg.anonKey).includes('YOUR-ANON-KEY'));

const BUCKET = 'media';
let sb = null, user = null;
let projects = [], editingId = null, armedDelete = null, armedTimer = null;
let uploadSlot = null, pvFellBack = false, toastTimer;

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
const pic = (seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}.jpg`;

const rowToProject = r => ({
  id: r.id, title: r.title, titleAr: r.title_ar || '', year: r.year || '',
  seed: r.seed || r.id, img: r.img || '', img2: r.img2 || '',
  hidden: !!r.hidden, sort_order: r.sort_order || 0, en: r.en || {}, ar: r.ar || {}
});
const projectToRow = (p, sortOrder) => ({
  id: p.id, title: p.title, title_ar: p.titleAr || '', year: String(p.year || ''),
  seed: p.seed || p.id, img: p.img || '', img2: p.img2 || '',
  hidden: !!p.hidden, sort_order: sortOrder || 0, en: p.en || {}, ar: p.ar || {}
});

function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.style.opacity = '1'; t.style.visibility = 'visible';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; t.style.visibility = 'hidden'; }, 2600);
}
function setStatus(state, msg){
  $('dbDot').className = 'tb-dot' + (state === 'ok' ? ' ok' : state === 'warn' ? ' warn' : state === 'err' ? ' err' : '');
  $('dbStatus').textContent = msg;
}
function needAuth(){
  if (!sb || $('app').hidden){ toast('sign in first'); return true; }
  return false;
}

/* ---------- auth ---------- */
async function signIn(){
  if (!sb) return;
  const email = $('gEmail').value.trim(), pass = $('gPass').value;
  $('gErr').textContent = '';
  if (!email || !pass){ $('gErr').textContent = 'enter your email and password.'; return; }
  $('gLogin').disabled = true; $('gLogin').textContent = 'signing in…';
  try{
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    $('gPass').value = '';
    await enterApp(data.user);
  }catch(e){
    $('gErr').textContent = e.message || 'sign-in failed.';
    setStatus('err', 'auth failed');
  }finally{
    $('gLogin').disabled = false; $('gLogin').textContent = 'sign in →';
  }
}
async function signOut(){
  try{ await sb.auth.signOut(); }catch(e){}
  exitToGate();
}
function enterApp(u){
  user = u;
  $('gate').hidden = true;
  $('app').hidden = false;
  loadProjects();
}
function exitToGate(){
  user = null; projects = []; editingId = null;
  $('app').hidden = true;
  $('gate').hidden = false;
  $('edForm').hidden = true; $('edEmpty').hidden = false;
  setStatus('', 'connecting…');
}

/* ---------- data ---------- */
async function loadProjects(){
  if (!sb) return;
  setStatus('', 'loading…');
  try{
    const { data, error } = await sb.from('projects')
      .select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    projects = (data || []).map(rowToProject);
    setStatus('ok', `live — ${projects.length} project${projects.length === 1 ? '' : 's'} — ${user ? user.email : ''}`);
  }catch(e){
    projects = [];
    setStatus('warn', 'db error — run supabase-schema.sql');
    toast('db error: ' + (e.message || 'fetch failed'));
  }
  renderStats(); renderList();
}
async function seedDefaults(){
  if (needAuth()) return;
  try{
    const rows = ((window.MMM && MMM.PROJECTS) || []).map((p, i) => projectToRow(Object.assign({}, p), i));
    if (!rows.length){ toast('no defaults found in data.js'); return; }
    const { error } = await sb.from('projects').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
    await loadProjects();
    toast('starter projects seeded — live');
  }catch(e){ toast('seed failed: ' + (e.message || '')); }
}
async function toggleHidden(id){
  const p = projects.find(x => x.id === id); if (!p) return;
  try{
    const { error } = await sb.from('projects').update({ hidden: !p.hidden }).eq('id', id);
    if (error) throw error;
    p.hidden = !p.hidden;
    renderStats(); renderList();
    toast(p.hidden ? 'project hidden — live' : 'project visible — live');
  }catch(e){ toast('db error: ' + (e.message || '')); }
}
async function move(id, dir){
  const i = projects.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= projects.length) return;
  const a = projects[i], b = projects[j];
  try{
    const { error } = await sb.from('projects')
      .upsert([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }],
              { onConflict: 'id' });
    if (error) throw error;
    [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
    [projects[i], projects[j]] = [projects[j], projects[i]];
    renderList();
  }catch(e){ toast('reorder failed: ' + (e.message || '')); }
}
async function deleteProject(id){
  const p = projects.find(x => x.id === id); if (!p) return;
  try{
    const paths = [p.img, p.img2].map(u => (String(u || '').match(/\/media\/(.+)$/) || [])[1]).filter(Boolean);
    if (paths.length){ try{ await sb.storage.from(BUCKET).remove(paths); }catch(_){ /* best effort */ } }
    const { error } = await sb.from('projects').delete().eq('id', id);
    if (error) throw error;
    projects = projects.filter(x => x.id !== id);
    if (editingId === id){ editingId = null; $('edForm').hidden = true; $('edEmpty').hidden = false; }
    renderStats(); renderList();
    toast('project deleted — live');
  }catch(e){ toast('delete failed: ' + (e.message || '')); }
}

/* ---------- rendering ---------- */
function renderStats(){
  const vis = projects.filter(p => !p.hidden).length;
  const hid = projects.length - vis;
  const yrs = projects.map(p => parseInt(p.year, 10)).filter(y => !isNaN(y));
  const span = yrs.length ? `${Math.min(...yrs)}–${Math.max(...yrs)}` : '—';
  $('stats').innerHTML = `
    <div class="stat"><b>${String(projects.length).padStart(2, '0')}</b><span>projects</span></div>
    <div class="stat"><b>${String(vis).padStart(2, '0')}<em>/${String(projects.length).padStart(2, '0')}</em></b><span>visible</span></div>
    <div class="stat"><b>${hid}</b><span>hidden</span></div>
    <div class="stat"><b>${esc(span)}</b><span>year span</span></div>`;
}
function renderList(){
  const q = $('search').value.trim().toLowerCase();
  const rows = projects.filter(p => !q || (p.id + ' ' + p.title + ' ' + (p.titleAr || '')).toLowerCase().includes(q));
  $('plist').innerHTML = rows.length ? rows.map(p => `
    <div class="prow${p.hidden ? ' off' : ''}${editingId === p.id ? ' active' : ''}" data-id="${esc(p.id)}">
      <div class="t"><b>${esc(p.title)}${p.titleAr ? `<i>${esc(p.titleAr)}</i>` : ''}</b><span>${esc(p.id)} · ${esc(p.year || '—')}</span></div>
      <span class="st${p.hidden ? ' hid' : ''}"><span class="d"></span>${p.hidden ? 'hidden' : 'visible'}</span>
      <div class="acts">
        <button class="btn" data-act="up" title="move up">↑</button>
        <button class="btn" data-act="down" title="move down">↓</button>
        <button class="btn" data-act="toggle">${p.hidden ? 'show' : 'hide'}</button>
        <button class="btn btn-danger${armedDelete === p.id ? ' arm' : ''}" data-act="del">${armedDelete === p.id ? 'sure?' : 'delete'}</button>
      </div>
    </div>`).join('')
    : '<p class="pempty">no projects here yet —<br>use “seed defaults” or “+ new”.</p>';
}

/* ---------- editor ---------- */
function grabFields(prefix){
  const o = {};
  ['cat','type','role','stack','short','p1','p2'].forEach(k => {
    const v = $(prefix + k).value.trim();
    if (v) o[k] = v;
  });
  return o;
}
function collectForm(){
  return {
    id: $('e_id').value.trim(),
    title: $('e_title').value.trim(),
    titleAr: $('e_titleAr').value.trim(),
    year: $('e_year').value.trim(),
    seed: $('e_seed').value.trim(),
    img: $('e_img').value.trim(),
    img2: $('e_img2').value.trim(),
    hidden: editingId ? ((projects.find(x => x.id === editingId) || {}).hidden || false) : false,
    en: grabFields('e_en_'),
    ar: grabFields('e_ar_')
  };
}
function openEditor(p){
  editingId = p ? p.id : null;
  $('edEmpty').hidden = true; $('edForm').hidden = false;
  $('edHeading').textContent = p ? 'edit — ' + p.id : 'new project';
  $('eDelete').hidden = !p;
  const v = (id, val) => { $(id).value = val || ''; };
  v('e_id', p && p.id); v('e_title', p && p.title); v('e_titleAr', p && p.titleAr);
  v('e_year', p ? p.year : String(new Date().getFullYear()));
  v('e_seed', p && p.seed); v('e_img', p && p.img); v('e_img2', p && p.img2);
  const en = (p && p.en) || {}, ar = (p && p.ar) || {};
  ['cat','type','role','stack','short','p1','p2'].forEach(k => { v('e_en_' + k, en[k]); v('e_ar_' + k, ar[k]); });
  updateThumb('img'); updateThumb('img2');
  updatePreview();
}
function closeEditor(){
  editingId = null;
  $('edForm').hidden = true; $('edEmpty').hidden = false;
  renderList();
}
function updateThumb(slot){
  const img = $('thumb_' + slot), val = $('e_' + slot).value.trim();
  if (val){ img.src = val; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
}
function updatePreview(){
  const p = collectForm();
  pvFellBack = false;
  $('pv_id').textContent = '~/work/' + (p.id || '…');
  $('pv_year').textContent = p.year || '';
  $('pv_title').textContent = p.title || '—';
  $('pv_short').textContent = p.en.short || '';
  $('pv_img').src = p.img || pic(p.seed || p.id || 'mmm', 800, 450);
  $('pv_chips').innerHTML = (p.en.stack || '').split('·')
    .map(s => s.trim()).filter(Boolean).map(c => `<span>${esc(c)}</span>`).join('');
}
async function saveProject(){
  if (needAuth()) return;
  const p = collectForm();
  if (!p.title){ toast('title is required'); return; }
  p.id = slugify(p.id || p.title);
  if (!p.seed) p.seed = p.id;
  if (projects.some(x => x.id === p.id && x.id !== editingId)){
    toast('id already used — pick another'); return;
  }
  try{
    if (editingId){
      const cur = projects.find(x => x.id === editingId);
      const { error } = await sb.from('projects')
        .update(projectToRow(p, cur.sort_order)).eq('id', editingId);
      if (error) throw error;
      Object.assign(cur, p, { sort_order: cur.sort_order });
      editingId = p.id;
      toast('project updated — live');
    }else{
      const next = projects.reduce((m, x) => Math.max(m, x.sort_order || 0), -1) + 1;
      const { error } = await sb.from('projects').insert(projectToRow(p, next));
      if (error) throw error;
      p.sort_order = next; projects.push(p);
      editingId = p.id;
      toast('project added — live');
    }
    renderStats(); renderList();
    openEditor(projects.find(x => x.id === editingId));
  }catch(e){ toast('save failed: ' + (e.message || '')); }
}

/* ---------- uploads ---------- */
qsa('[data-up]').forEach(btn => btn.addEventListener('click', () => {
  if (needAuth()) return;
  uploadSlot = btn.dataset.up;
  $('imgFile').click();
}));
 $('imgFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !uploadSlot || needAuth()) return;
  if (!file.type.startsWith('image/')){ toast('pick an image file'); return; }
  if (file.size > 8 * 1024 * 1024){ toast('image too large (max 8 MB)'); return; }
  toast('uploading…');
  try{
    const base = slugify($('e_id').value) || 'untitled';
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `projects/${base}-${uploadSlot}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) throw error;
    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    $('e_' + uploadSlot).value = data.publicUrl;
    updateThumb(uploadSlot); updatePreview();
    toast('image uploaded — url filled in');
  }catch(err){ toast('upload failed: ' + (err.message || '')); }
});

/* ---------- backup / restore ---------- */
function exportJSON(){
  const blob = new Blob(
    [JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), projects }, null, 2)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mmm-projects-backup.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('backup downloaded');
}
function importJSON(file){
  const r = new FileReader();
  r.onload = async () => {
    if (needAuth()) return;
    try{
      const j = JSON.parse(r.result);
      if (!j || !Array.isArray(j.projects)) throw new Error('unexpected file shape');
      const rows = j.projects.map((p, i) => projectToRow({
        id: p.id, title: p.title,
        titleAr: p.titleAr ?? p.title_ar ?? '',
        year: p.year, seed: p.seed, img: p.img, img2: p.img2,
        hidden: !!p.hidden, en: p.en || {}, ar: p.ar || {}
      }, i));
      const { error } = await sb.from('projects').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      await loadProjects();
      toast('restored ' + rows.length + ' projects — live');
    }catch(e){ toast('restore failed: ' + (e.message || 'invalid file')); }
  };
  r.readAsText(file);
}

/* ---------- wiring ---------- */
 $('gLogin').addEventListener('click', signIn);
 $('gPass').addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });
 $('btnSignOut').addEventListener('click', signOut);
 $('btnSync').addEventListener('click', async () => { await loadProjects(); toast('reloaded from database'); });
 $('btnSeed').addEventListener('click', seedDefaults);
 $('btnBackup').addEventListener('click', exportJSON);
 $('btnRestore').addEventListener('click', () => $('restoreFile').click());
 $('restoreFile').addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; });
 $('search').addEventListener('input', renderList);
 $('btnAdd').addEventListener('click', () => { if (!needAuth()) openEditor(null); });
 $('plist').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  const row = e.target.closest('.prow');
  if (!row) return;
  const id = row.dataset.id;
  if (btn){
    const act = btn.dataset.act;
    if (act === 'up') return move(id, -1);
    if (act === 'down') return move(id, 1);
    if (act === 'toggle') return toggleHidden(id);
    if (act === 'del'){
      if (armedDelete !== id){
        armedDelete = id; renderList();
        clearTimeout(armedTimer);
        armedTimer = setTimeout(() => { armedDelete = null; renderList(); }, 3000);
      }else{
        armedDelete = null; clearTimeout(armedTimer);
        deleteProject(id);
      }
      return;
    }
  }
  openEditor(projects.find(p => p.id === id));
});
 $('edForm').addEventListener('input', e => {
  if (e.target.id === 'e_img') updateThumb('img');
  if (e.target.id === 'e_img2') updateThumb('img2');
  updatePreview();
});
 $('eSave').addEventListener('click', saveProject);
 $('eCancel').addEventListener('click', closeEditor);
 $('eDelete').addEventListener('click', async () => {
  if (!editingId) return;
  const b = $('eDelete');
  if (!b.classList.contains('arm')){
    b.classList.add('arm'); b.textContent = 'sure? delete';
    setTimeout(() => { b.classList.remove('arm'); b.textContent = 'delete'; }, 3000);
    return;
  }
  b.classList.remove('arm'); b.textContent = 'delete';
  await deleteProject(editingId);
});
 $('pv_img').addEventListener('error', () => {
  if (pvFellBack) return;
  pvFellBack = true;
  $('pv_img').src = pic($('e_seed').value.trim() || $('e_id').value.trim() || 'mmm', 800, 450);
});

/* ---------- boot ---------- */
async function boot(){
  $('vNum').textContent = (window.MMM && MMM.VERSION) || '2.0';
  if (!CONFIGURED){
    $('gateSub').textContent = 'Supabase is not configured — set SUPABASE.url and SUPABASE.anonKey in data.js.';
    $('gLogin').disabled = true;
    setStatus('err', 'not configured');
    return;
  }
  sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  sb.auth.onAuthStateChange((_evt, session) => {
    if (session && $('app').hidden) enterApp(session.user);
    else if (!session && !$('app').hidden) exitToGate();
  });
  try{
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (data.session) enterApp(data.session.user);
  }catch(e){
    setStatus('warn', 'auth check failed');
  }
}
boot();
})();