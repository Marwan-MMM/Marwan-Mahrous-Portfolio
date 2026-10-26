/* ============================================================
   admin.js — project manager backed by Supabase.
   ── ACCESS ──────────────────────────────────────────────────
   • Type  admin  anywhere on the page (keyboard)
   • Open the site with  #admin  in the URL
   • Console:  MMM.admin.open()
   Auth uses Supabase Auth (the user you created in the
   dashboard). Every change is written to the database and is
   live for all visitors immediately.
   ============================================================ */
(function(){
  const S = MMM.state;
  let isOpen = false, authed = false, userEmail = '';
  let editingId = null, armedDelete = null, uploadSlot = null;
  let galleryItems = [];       /* [{url, path, cap}] — path '' for external urls */
  let pendingRemovePaths = []; /* storage paths removed in the form — deleted after a successful save */
  const deletingIds = new Set(); /* concurrent-delete guard */

  /* ---------- DOM (built once) ---------- */
  const root = document.createElement('div');
  root.className = 'admin';
  root.id = 'adminRoot';
  root.innerHTML = `
    <div class="a-gate" id="aGate" style="display:none">
      <h4>Admin access</h4>
      <p id="aGateNote">Sign in with your Supabase admin account.</p>
      <input type="email" id="aEmail" placeholder="email" autocomplete="username">
      <input type="password" id="aPass" placeholder="password" autocomplete="current-password">
      <div class="a-err" id="aErr"></div>
      <button class="a-btn a-btn-acc" id="aLogin">Sign in</button>
    </div>

    <div id="aPanel" style="display:none;flex-direction:column;flex:1;min-height:0">
      <div class="a-top">
        <div>
          <h4><b>MMM ADMIN</b> — project manager</h4>
          <div class="a-top-sub" id="aSub"></div>
        </div>
        <div class="a-tools">
          <button class="a-btn a-btn-acc" id="aAdd">+ new project</button>
          <button class="a-btn" id="aSeed">seed defaults</button>
          <button class="a-btn" id="aExport">backup json</button>
          <button class="a-btn" id="aImportBtn">restore</button>
          <button class="a-btn" id="aSync">reload db</button>
          <button class="a-btn a-btn-danger" id="aSignOut">sign out</button>
        </div>
      </div>
      <div class="a-list" id="aList"></div>
            <div class="a-foot">
        <span>live — connected to supabase. changes are public immediately.</span>
        <span style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
          <button class="a-btn" id="aExit">exit panel</button>
          <span>services / texts: edit js/data.js</span>
        </span>
      </div>
    </div>

    <div class="a-form" id="aForm">
      <div class="a-fhead"><span id="aFormTitle">new project</span>
        <button class="a-btn" id="aFormClose">cancel</button></div>
      <div class="a-fbody">
        <p class="a-sec">basics</p>
        <div class="a-grid">
          <div class="a-field"><label>id / slug *</label><input id="f_id" placeholder="my-project"></div>
          <div class="a-field"><label>year</label><input id="f_year" placeholder="2025"></div>
          <div class="a-field full"><label>title (english) *</label><input id="f_title"></div>
          <div class="a-field full"><label>title (arabic — optional)</label><input id="f_titleAr" dir="rtl"></div>
          <div class="a-field full"><label>image — url or upload</label>
            <div class="a-upload"><input id="f_img" placeholder="https://…"><button class="a-btn" type="button" data-up="img">upload</button></div></div>
          <div class="a-field full"><label>second image — url or upload</label>
            <div class="a-upload"><input id="f_img2" placeholder="https://…"><button class="a-btn" type="button" data-up="img2">upload</button></div></div>
          <div class="a-field full"><label>live demo url — optional (the button is hidden when empty)</label>
            <input id="f_demo" placeholder="https://your-live-demo.example.com"></div>
          <div class="a-field full"><label>image seed (placeholder fallback)</label><input id="f_seed" placeholder="auto from id"></div>
        </div>
        <p class="a-sec">gallery — extra screenshots (full-page ok)</p>
        <div class="a-gal" id="aGal"></div>
        <div class="a-gal-add">
          <input id="f_gal_url" placeholder="https://… paste an image url">
          <button class="a-btn" type="button" id="aGalAdd">+ url</button>
          <button class="a-btn" type="button" id="aGalUpload">upload images…</button>
        </div>
        <p class="a-note" style="margin-bottom:.6rem">Gallery images appear in the project window after the second image. Full-page screenshots are shown uncropped, top to bottom.</p>
        <p class="a-sec">english content</p>
        <div class="a-grid">
          <div class="a-field full"><label>category</label><input id="f_en_cat" placeholder="Web App — Full-stack"></div>
          <div class="a-field"><label>type</label><input id="f_en_type" placeholder="Client work"></div>
          <div class="a-field"><label>role</label><input id="f_en_role" placeholder="Full-stack"></div>
          <div class="a-field full"><label>stack (separate with ·)</label><input id="f_en_stack" placeholder="React · Node.js · PostgreSQL"></div>
          <div class="a-field full"><label>card short line</label><textarea id="f_en_short"></textarea></div>
          <div class="a-field full"><label>story — paragraph 1</label><textarea id="f_en_p1" rows="4"></textarea></div>
          <div class="a-field full"><label>story — paragraph 2 (results)</label><textarea id="f_en_p2" rows="4"></textarea></div>
        </div>
        <p class="a-sec">arabic content — optional</p>
        <p class="a-note" style="margin-bottom:.6rem">Empty fields fall back to English on the live site.</p>
        <div class="a-grid">
          <div class="a-field full"><label>الفئة</label><input id="f_ar_cat" dir="rtl"></div>
          <div class="a-field"><label>النوع</label><input id="f_ar_type" dir="rtl"></div>
          <div class="a-field"><label>الدور</label><input id="f_ar_role" dir="rtl"></div>
          <div class="a-field full"><label>التقنيات</label><input id="f_ar_stack" dir="rtl"></div>
          <div class="a-field full"><label>سطر البطاقة</label><textarea id="f_ar_short" dir="rtl"></textarea></div>
          <div class="a-field full"><label>القصة — فقرة ١</label><textarea id="f_ar_p1" rows="4" dir="rtl"></textarea></div>
          <div class="a-field full"><label>القصة — فقرة ٢</label><textarea id="f_ar_p2" rows="4" dir="rtl"></textarea></div>
        </div>
      </div>
      <div class="a-ffoot">
        <button class="a-btn a-btn-preview" id="aPreview">preview ↗</button>
        <button class="a-btn a-btn-acc" id="aSave">save project</button>
        <button class="a-btn" id="aCancel2">cancel</button>
      </div>
    </div>

    <input type="file" id="aFile" accept=".json,application/json" style="display:none">
    <input type="file" id="aImgFile" accept="image/*" style="display:none">
    <input type="file" id="aGalFile" accept="image/*" multiple style="display:none">
  `;
  document.body.appendChild(root);
  /* accepts both 'aLogin' and '#f_id' — without the '#', querySelector
     searches for a TAG name and returns null, which used to crash the
     whole panel at startup ("Cannot read properties of null") */
  const $ = id => root.querySelector(id.startsWith('#') ? id : '#' + id);

  /* ---------- auth ---------- */
  async function ensureSession(){
    if (!MMM.sb) { authed = false; return false; }
    try {
      const { data } = await MMM.sb.auth.getSession();
      authed = !!data.session;
      userEmail = (data.session && data.session.user && data.session.user.email) || '';
    } catch (e) { authed = false; }
    return authed;
  }
  if (MMM.sb) MMM.sb.auth.onAuthStateChange((_evt, session) => {
    authed = !!session;
    userEmail = (session && session.user && session.user.email) || '';
    if (isOpen) syncUI();
  });

  async function signIn(){
    if (!MMM.sb) { $('aErr').textContent = 'supabase not configured — edit js/data.js'; return; }
    $('aLogin').disabled = true;
    $('aErr').textContent = '';
    try {
      const { error } = await MMM.sb.auth.signInWithPassword({
        email: $('aEmail').value.trim(), password: $('aPass').value
      });
      if (error) { $('aErr').textContent = error.message; return; }
      await ensureSession();
      syncUI();
      await refreshFromDb(true);
      MMM.showToast('welcome back — admin mode');
    } finally { $('aLogin').disabled = false; $('aPass').value = ''; }
  }
  async function signOut(){
    try { await MMM.sb.auth.signOut(); } catch (e) {}
    authed = false; userEmail = '';
    syncUI();
    MMM.showToast('signed out');
  }

  /* ---------- database ops ---------- */
  async function refreshFromDb(silent){
    if (!MMM.sb) return false;
    try {
      const { data, error } = await MMM.sb.from('projects')
        .select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      S.projects = (data || []).map(MMM.rowToProject);
      S.source = 'supabase';
      MMM.cacheAndRender();
      renderList();
      return true;
    } catch (e) {
      if (!silent) MMM.showToast('db error: ' + (e.message || 'fetch failed'));
      return false;
    }
  }
  async function reindex(){
    const rows = S.projects.map((p, i) => ({ id: p.id, sort_order: i }));
    if (!rows.length) return;
    const { error } = await MMM.sb.from('projects').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
  async function seedDefaults(){
    try {
      const rows = MMM.PROJECTS.map((p, i) => MMM.projectToRow(p, i));
      const { error } = await MMM.sb.from('projects').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      await refreshFromDb(true);
      MMM.showToast('starter projects seeded into the database');
    } catch (e) { MMM.showToast('seed failed: ' + (e.message || '')); }
  }
  async function toggleHidden(id){
    const p = S.projects.find(x => x.id === id); if (!p) return;
    try {
      const { error } = await MMM.sb.from('projects').update({ hidden: !p.hidden }).eq('id', id);
      if (error) throw error;
      p.hidden = !p.hidden;
      MMM.cacheAndRender(); renderList();
      MMM.showToast(p.hidden ? 'unpublished — hidden from visitors' : 'published — live for visitors');
    } catch (e) { MMM.showToast('db error: ' + (e.message || '')); }
  }

  /* ---------- storage cleanup helpers ----------
     Storage and PostgreSQL cannot share a transaction, so deletion runs
     DATABASE-FIRST (the old bug was: files gone, row still live) and file
     cleanup happens afterwards. Any file that fails to be removed is queued
     in localStorage and retried on the next admin sign-in — no orphans are
     ever lost track of. Paths always come from the project record itself. */
  const CLEAN_KEY = 'mmm.storage.cleanup.v1';

  function mediaPathFromUrl(u){
    if (!u) return '';
    const m = String(u).match(/\/storage\/v1\/object\/(?:public|authenticated)\/media\/([^?#]+)/);
    if (!m) return '';
    let p;
    try { p = decodeURIComponent(m[1]); } catch (e) { p = m[1]; }
    /* trust check: only paths inside our own bucket, never arbitrary input */
    if (!p || p.startsWith('/') || p.includes('..')) return '';
    return p;
  }
  function storagePathsFromRow(row){
    const paths = new Set();
    const addUrl = u => { const p = mediaPathFromUrl(u); if (p) paths.add(p); };
    addUrl(row.img); addUrl(row.img2);
    (Array.isArray(row.gallery) ? row.gallery : []).forEach(g => {
      if (!g) return;
      if (g.path) {
        const safe = !String(g.path).startsWith('/') && !String(g.path).includes('..');
        if (safe) paths.add(g.path);
      }
      addUrl(g.url);
    });
    return [...paths];
  }
  function queueCleanup(paths){
    if (!paths.length) return;
    try {
      const cur = JSON.parse(localStorage.getItem(CLEAN_KEY) || '[]');
      localStorage.setItem(CLEAN_KEY, JSON.stringify([...new Set([...cur, ...paths])]));
    } catch (e) {}
  }
  async function cleanupStorageFiles(paths){
    if (!paths.length || !MMM.sb) return;
    try {
      const { error } = await MMM.sb.storage.from('media').remove(paths);
      if (error) throw error;
    } catch (e) {
      queueCleanup(paths); /* retried automatically on the next admin sign-in */
      MMM.showToast('warning: some storage files could not be removed — retry is automatic');
      console.warn('[mmm] storage cleanup failed:', e);
    }
  }
  async function flushPendingCleanup(){
    if (!MMM.sb) return;
    let q = [];
    try { q = JSON.parse(localStorage.getItem(CLEAN_KEY) || '[]'); } catch (e) {}
    if (!Array.isArray(q) || !q.length) return;
    try {
      const { error } = await MMM.sb.storage.from('media').remove(q);
      if (error) throw error;
      localStorage.setItem(CLEAN_KEY, '[]');
      MMM.showToast('cleaned ' + q.length + ' leftover file(s) from storage');
    } catch (e) { /* keep the queue — retried next sign-in */ }
  }

  async function deleteProject(id){
    if (deletingIds.has(id)) return; /* prevents concurrent duplicate deletes */
    deletingIds.add(id);
    try {
      /* 1. load the row first — storage paths must come from the trusted
            record, never from client-supplied arbitrary paths */
      const { data: rows, error: eFetch } = await MMM.sb.from('projects')
        .select('*').eq('id', id);
      if (eFetch) throw eFetch;

      if (!rows || !rows.length) {
        /* already gone — deletion is idempotent / double-click safe */
        S.projects = S.projects.filter(x => x.id !== id);
        MMM.cacheAndRender(); renderList();
        MMM.showToast('project already deleted');
        return;
      }
      const row = rows[0];
      const paths = storagePathsFromRow(row);

      /* 2. delete the DATABASE ROW first — and VERIFY it really happened.
            Without a DELETE policy in RLS, supabase-js returns NO error but
            deletes 0 rows and the project would silently stay public. */
      const { data: delRows, error: eDel } = await MMM.sb.from('projects')
        .delete().eq('id', id).select('id');
      if (eDel) throw eDel;
      if (!delRows || delRows.length === 0) {
        throw new Error('the database refused the delete (0 rows affected) — run supabase-setup.sql to install the admin DELETE policy');
      }

      /* 3. refresh admin state + public site immediately */
      S.projects = S.projects.filter(x => x.id !== id);
      MMM.cacheAndRender(); renderList();
      MMM.showToast('project deleted — live');

      /* 4. then remove this project's files from storage (retryable) */
      await cleanupStorageFiles(paths);
    } catch (e) {
      MMM.showToast('delete failed: ' + (e.message || 'unknown error'));
    } finally {
      deletingIds.delete(id);
    }
  }
  async function move(id, dir){
    const i = S.projects.findIndex(x => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= S.projects.length) return;
    [S.projects[i], S.projects[j]] = [S.projects[j], S.projects[i]];
    try {
      await reindex();
      MMM.cacheAndRender(); renderList();
    } catch (e) { MMM.showToast('reorder failed: ' + (e.message || '')); }
  }

  /* ---------- editor form ---------- */
  function openForm(p){
    editingId = p ? p.id : null;
    $('aFormTitle').textContent = p ? 'edit — ' + p.id : 'new project';
    const v = (sel, val) => { $(sel).value = val || ''; };
    v('#f_id', p && p.id); v('#f_title', p && p.title); v('#f_titleAr', p && p.titleAr);
    v('#f_year', p ? p.year : new Date().getFullYear());
    v('#f_seed', p && p.seed); v('#f_img', p && p.img); v('#f_img2', p && p.img2);
    v('#f_demo', p && p.demoUrl);
    galleryItems = (p && Array.isArray(p.gallery))
      ? p.gallery.map(g => ({ url: g.url || '', path: g.path || '', cap: g.cap || '' }))
      : [];
    pendingRemovePaths = [];
    renderGal();
    const en = (p && p.en) || {}, ar = (p && p.ar) || {};
    ['cat','type','role','stack','short','p1','p2'].forEach(k => {
      v('#f_en_' + k, en[k]); v('#f_ar_' + k, ar[k]);
    });
    $('aForm').classList.add('open');
    $('aForm').querySelector('input').focus();
  }
  function closeForm(){
    $('aForm').classList.remove('open'); editingId = null;
    galleryItems = []; pendingRemovePaths = [];
  }
  function slugify(s){
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  }
  function grab(prefix){
    const o = {};
    ['cat','type','role','stack','short','p1','p2'].forEach(k => {
      const val = $(prefix + k).value.trim();
      if (val) o[k] = val;
    });
    return o;
  }
  /* the form is the single source of truth — used by BOTH save and preview,
     so the preview always matches what will be saved, unsaved edits included */
  function collectFormProject(){
    const title = $('#f_title').value.trim();
    if (!title) { MMM.showToast('title is required'); return null; }
    const id = slugify($('f_id').value || title);
    if (S.projects.some(p => p.id === id && p.id !== editingId)) {
      MMM.showToast('id already used — pick another'); return null;
    }
    const cur = editingId ? S.projects.find(p => p.id === editingId) : null;
    const ar = grab('#f_ar_');
    const proj = {
      id, title,
      titleAr: $('f_titleAr').value.trim(),
      year: $('f_year').value.trim() || String(new Date().getFullYear()),
      seed: $('f_seed').value.trim() || id,
      img:  $('f_img').value.trim(),
      img2: $('f_img2').value.trim(),
      demoUrl: $('f_demo').value.trim(),
      gallery: galleryItems.filter(g => g.url),
      /* publication state is not a form field:
         new projects start as drafts — publishing is an explicit action */
      hidden: cur ? cur.hidden : true,
      en: grab('#f_en_')
    };
    if (Object.keys(ar).length) proj.ar = ar;
    return proj;
  }
  async function flushRemovedGalleryFiles(){
    if (!pendingRemovePaths.length) return;
    const paths = pendingRemovePaths.slice();
    pendingRemovePaths = [];
    await cleanupStorageFiles(paths); /* queues anything that fails */
  }
  async function saveForm(){
    const proj = collectFormProject();
    if (!proj) return;

    try {
      if (editingId) {
        const cur = S.projects.find(p => p.id === editingId);
        const { error } = await MMM.sb.from('projects')
          .update(MMM.projectToRow(proj, cur ? cur.sort_order : 0))
          .eq('id', editingId);
        if (error) throw error;
        const i = S.projects.findIndex(p => p.id === editingId);
        S.projects[i] = Object.assign(proj, { sort_order: cur ? cur.sort_order : 0 });
        MMM.showToast('project updated — live');
      } else {
        const next = S.projects.reduce((m, p) => Math.max(m, p.sort_order || 0), -1) + 1;
        const { error } = await MMM.sb.from('projects').insert(MMM.projectToRow(proj, next));
        if (error) throw error;
        proj.sort_order = next;
        S.projects.push(proj);
        MMM.showToast('draft saved — press “publish” in the list to make it public');
      }
      /* storage files of gallery items removed in this edit session are only
         deleted AFTER the save succeeded — cancelling never loses files */
      await flushRemovedGalleryFiles();
      closeForm();
      MMM.cacheAndRender(); renderList();
    } catch (e) {
      MMM.showToast('db error: ' + (e.message || 'save failed'));
    }
  }

  /* ---------- image uploads (supabase storage) ----------
     Returns { url, path } so callers can remember the storage path for
     later cleanup when the image is removed again. */
  async function uploadImage(file, slot){
    const base = slugify($('f_id').value) || 'untitled';
    const ext = ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')) || 'jpg';
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const path = `projects/${base}-${slot}-${unique}.${ext}`;
    const { error } = await MMM.sb.storage.from('media')
      .upload(path, file, { upsert: false, cacheControl: '3600' });
    if (error) throw error;
    const { data } = MMM.sb.storage.from('media').getPublicUrl(path);
    return { url: data.publicUrl, path };
  }
  root.querySelectorAll('[data-up]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (!MMM.sb) { MMM.showToast('supabase not configured'); return; }
      uploadSlot = btn.dataset.up;
      $('aImgFile').click();
    }));
  $('aImgFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !uploadSlot) return;
    if (!file.type.startsWith('image/')) { MMM.showToast('pick an image file'); return; }
    if (file.size > 15 * 1024 * 1024) { MMM.showToast('image too large (max 15 MB)'); return; }
    MMM.showToast('uploading…');
    try {
      const res = await uploadImage(file, uploadSlot);
      $('f_' + uploadSlot).value = res.url;
      MMM.showToast('image uploaded — url filled in');
    } catch (err) { MMM.showToast('upload failed: ' + (err.message || '')); }
  });

  /* ---------- gallery manager — extra screenshots, no fixed limit ---------- */
  function renderGal(){
    const box = $('aGal');
    if (!galleryItems.length){
      box.innerHTML = '<p class="a-note">no gallery images yet — full-page screenshots are welcome.</p>';
      return;
    }
    box.innerHTML = galleryItems.map((g, i) => `
      <div class="a-gal-row">
        <img class="a-gal-thumb" src="${g.url}" alt="" loading="lazy">
        <input class="a-gal-cap" data-gcap="${i}" placeholder="caption (optional)" value="${String(g.cap || '').replace(/"/g, '&quot;')}">
        <div class="a-gal-acts">
          <button class="a-btn" type="button" data-g="up" data-i="${i}" title="move up">↑</button>
          <button class="a-btn" type="button" data-g="down" data-i="${i}" title="move down">↓</button>
          <button class="a-btn a-btn-danger" type="button" data-g="rm" data-i="${i}" title="remove">✕</button>
        </div>
      </div>`).join('');
  }
  $('aGal').addEventListener('click', e => {
    const btn = e.target.closest('[data-g]');
    if (!btn) return;
    const i = +btn.dataset.i;
    if (btn.dataset.g === 'up' && i > 0) {
      [galleryItems[i - 1], galleryItems[i]] = [galleryItems[i], galleryItems[i - 1]];
    } else if (btn.dataset.g === 'down' && i < galleryItems.length - 1) {
      [galleryItems[i + 1], galleryItems[i]] = [galleryItems[i], galleryItems[i + 1]];
    } else if (btn.dataset.g === 'rm') {
      const [gone] = galleryItems.splice(i, 1);
      /* uploaded file is removed from storage only after a successful save */
      if (gone && gone.path) pendingRemovePaths.push(gone.path);
    }
    renderGal();
  });
  $('aGal').addEventListener('input', e => {
    const inp = e.target.closest('[data-gcap]');
    if (inp && galleryItems[+inp.dataset.gcap]) galleryItems[+inp.dataset.gcap].cap = inp.value;
  });
  $('aGalAdd').addEventListener('click', () => {
    const url = $('f_gal_url').value.trim();
    if (!url) { MMM.showToast('paste an image url first'); return; }
    galleryItems.push({ url, path: '', cap: '' });
    $('f_gal_url').value = '';
    renderGal();
  });
  $('aGalUpload').addEventListener('click', () => {
    if (!MMM.sb) { MMM.showToast('supabase not configured'); return; }
    $('aGalFile').click();
  });
  $('aGalFile').addEventListener('change', async e => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length || !MMM.sb) return;
    const tooBig = files.filter(f => f.size > 15 * 1024 * 1024);
    const ok = files.filter(f => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024);
    if (tooBig.length) MMM.showToast(tooBig.length + ' file(s) skipped — larger than 15 MB');
    if (!ok.length) return;
    $('aGalUpload').classList.add('a-uploading');
    let done = 0, failed = 0;
    for (const file of ok) {
      try {
        MMM.showToast(`uploading gallery ${done + failed + 1}/${ok.length}…`);
        const res = await uploadImage(file, 'g');
        galleryItems.push({ url: res.url, path: res.path, cap: '' });
        done++;
      } catch (err) { failed++; console.warn('[mmm] gallery upload failed:', err); }
    }
    $('aGalUpload').classList.remove('a-uploading');
    renderGal();
    MMM.showToast(failed ? `gallery: ${done} uploaded, ${failed} failed` : `gallery: ${done} image(s) uploaded`);
  });

  /* ---------- backup / restore ---------- */
  function exportJSON(){
    const data = { version: 2, exportedAt: new Date().toISOString(), projects: S.projects };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mmm-projects-backup.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    MMM.showToast('backup downloaded');
  }
  function importJSON(file){
    const r = new FileReader();
    r.onload = async () => {
      try {
        const j = JSON.parse(r.result);
        if (!Array.isArray(j.projects)) throw new Error('bad file shape');
        const incoming = j.projects;
        const keep = new Set(incoming.map(p => p.id));
        const stale = S.projects.map(p => p.id).filter(id => !keep.has(id));
        if (stale.length) {
          /* collect storage paths from the DB records themselves, delete the
             rows first, verify, then clean up their files (same safe order
             as deleteProject) */
          const { data: staleRows } = await MMM.sb.from('projects')
            .select('*').in('id', stale);
          const { data: delRows, error: eDel } = await MMM.sb.from('projects')
            .delete().in('id', stale).select('id');
          if (eDel) throw eDel;
          if (delRows && delRows.length) {
            const gone = (staleRows || []).filter(r => delRows.some(d => d.id === r.id));
            await cleanupStorageFiles(gone.flatMap(storagePathsFromRow));
          }
        }
        const { error } = await MMM.sb.from('projects')
          .upsert(incoming.map((p, i) => MMM.projectToRow(p, i)), { onConflict: 'id' });
        if (error) throw error;
        await refreshFromDb(true);
        MMM.showToast('restored ' + incoming.length + ' projects — live');
      } catch (e) { MMM.showToast('restore failed: ' + (e.message || 'invalid file')); }
    };
    r.readAsText(file);
  }

  /* ---------- list rendering ---------- */
  function renderList(){
    if (!isOpen || !authed) return;
    const list = S.projects;
    const hiddenN = list.filter(p => p.hidden).length;
    $('aSub').textContent =
      `${list.length} project${list.length === 1 ? '' : 's'} · ${hiddenN} hidden — signed in as ${userEmail}`;
    if (!list.length) {
      $('aList').innerHTML = '<p class="a-empty">Database is empty — click “seed defaults” to load your starter projects, or “+ new project”.</p>';
      return;
    }
    $('aList').innerHTML = list.map((p, i) => `
      <div class="a-row${p.hidden ? ' off' : ''}">
        <div class="t">
          <b>${String(i + 1).padStart(2, '0')}. ${p.title}${p.titleAr ? `<i>${p.titleAr}</i>` : ''}</b>
          <span>${p.id} · ${p.year || '—'}</span>
        </div>
        <span class="a-st${p.hidden ? ' hid' : ''}"><span class="dot"></span>${p.hidden ? 'hidden' : 'visible'}</span>
        <div class="a-acts">
          <button class="a-btn" data-act="up"    data-id="${p.id}" title="move up">↑</button>
          <button class="a-btn" data-act="down"  data-id="${p.id}" title="move down">↓</button>
          <button class="a-btn" data-act="edit"  data-id="${p.id}">edit</button>
          <button class="a-btn" data-act="toggle" data-id="${p.id}">${p.hidden ? 'publish' : 'unpublish'}</button>
          <button class="a-btn a-btn-danger${armedDelete === p.id ? ' arm' : ''}" data-act="del" data-id="${p.id}">${armedDelete === p.id ? 'sure?' : 'delete'}</button>
        </div>
      </div>`).join('');
  }

  /* ---------- open / close ---------- */
  function syncUI(){
    if (authed) {
      $('aGate').style.display = 'none';
      $('aPanel').style.display = 'flex';
      renderList();
    } else {
      $('aPanel').style.display = 'none';
      $('aGate').style.display = 'block';
      if (!MMM.sb) {
        $('aGateNote').textContent = 'Supabase is not configured — set SUPABASE.url and SUPABASE.anonKey in js/data.js.';
        $('aLogin').disabled = true;
      } else {
        $('aGateNote').textContent = 'Sign in with your Supabase admin account.';
        $('aLogin').disabled = false;
      }
    }
  }
  async function openAdmin(){
    if (isOpen) return;
    isOpen = true;
    root.classList.add('open');
    MMM.lockScroll(true);
    $('aErr').textContent = '';
    await ensureSession();
    syncUI();
    if (authed) {
      refreshFromDb(true);
      flushPendingCleanup(); /* retry any storage files left from a failed delete */
    }
  }
  function closeAdmin(){
    if (!isOpen) return;
    isOpen = false;
    closeForm();
    root.classList.remove('open');
    if (!modalOpenState() && !menuOpenState()) MMM.lockScroll(false);
    if (location.hash === '#admin')
      history.replaceState('', '', location.pathname + location.search);
  }
  const modalOpenState = () => document.getElementById('modal').classList.contains('open');
  const menuOpenState  = () => document.body.classList.contains('menu-open');
  MMM.admin = { open: openAdmin, close: closeAdmin, get isOpen(){ return isOpen; }, renderList };

  /* ---------- preview — real public modal, in-memory, never publishes ----------
   * The form is the source of truth (unsaved edits included). The admin panel
   * hides while the REAL project modal renders the project; closing the modal
   * restores the editor exactly as it was. No DB write, no state change. */
  let previewReturn = false;
  function previewForm(){
    const proj = collectFormProject();
    if (!proj) return;
    previewReturn = true;
    MMM.onPreviewClosed = () => {
      MMM.onPreviewClosed = null;
      if (!previewReturn) return;
      previewReturn = false;
      root.style.display = '';
      isOpen = true;
      MMM.lockScroll(true); /* the modal close released it — re-lock for the panel */
    };
    root.style.display = 'none'; /* let the real site modal take the stage */
    isOpen = false;              /* lets app.js handle Escape → close modal  */
    MMM.openProjectPreview(proj);
  }

  /* ---------- wiring ---------- */
  $('aLogin').addEventListener('click', signIn);
  $('aPass').addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });
  $('aEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('aPass').focus(); });
  $('aSignOut').addEventListener('click', signOut);
  $('aAdd').addEventListener('click', () => openForm(null));
  $('aFormClose').addEventListener('click', closeForm);
  $('aCancel2').addEventListener('click', closeForm);
  $('aSave').addEventListener('click', saveForm);
  $('aPreview').addEventListener('click', previewForm);
  $('aSeed').addEventListener('click', seedDefaults);
  $('aExport').addEventListener('click', exportJSON);
  $('aImportBtn').addEventListener('click', () => $('aFile').click());
  $('aFile').addEventListener('change', e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; });
  $('aSync').addEventListener('click', async () => { if (await refreshFromDb()) MMM.showToast('reloaded from database'); });
  $('aExit').addEventListener('click', closeAdmin);

  $('aList').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit')   openForm(S.projects.find(p => p.id === id));
    if (btn.dataset.act === 'toggle') toggleHidden(id);
    if (btn.dataset.act === 'up')     move(id, -1);
    if (btn.dataset.act === 'down')   move(id, 1);
    if (btn.dataset.act === 'del') {
      if (armedDelete !== id) {
        armedDelete = id; renderList();
        setTimeout(() => { if (armedDelete === id) { armedDelete = null; renderList(); } }, 3000);
      } else {
        armedDelete = null;
        deleteProject(id);
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !isOpen) return;
    if ($('aForm').classList.contains('open')) { closeForm(); return; }
    closeAdmin();
  });

  /* ---------- secret access ---------- */
  let buf = '';
  document.addEventListener('keydown', e => {
    /* e.key can be undefined on synthesized / IME events — guard first */
    if (!e.key || e.key.length !== 1) return;
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    buf = (buf + e.key.toLowerCase()).slice(-5);
    if (buf === 'admin') { buf = ''; openAdmin(); }
  });
  function checkHash(){ if (location.hash === '#admin') openAdmin(); }
  window.addEventListener('hashchange', checkHash);
  checkHash();
})();