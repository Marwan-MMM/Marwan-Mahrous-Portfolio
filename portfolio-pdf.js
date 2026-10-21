/* ============================================================
   portfolio-pdf.js — "Download Portfolio" client-side generator.

   STRATEGY
   • jsPDF with vector text — the PDF is fully selectable/searchable,
     never a page screenshot.
   • 100% client-side: library (vendor/jspdf.umd.min.js) and brand
     fonts (assets/fonts/*.ttf) are bundled with the site and
     lazy-loaded on first click. No backend, GitHub Pages compatible.
   • Content source = the SAME pipeline the site renders from:
     MMM.state.projects (live Supabase → localStorage cache → data.js
     defaults) + MMM.I18N / SERVICES / STACK / EDU / EMAIL / SOCIALS.
     English edition (the site's primary language).
   • Errors at any stage (library, fonts, images) degrade gracefully —
     missing images become branded placeholders, font failures fall
     back to the PDF core fonts, and the visitor sees a toast.

   Output: Marwan_Mahrous_Portfolio.pdf  (A4, ~9 pages)
   ============================================================ */
(function () {
  'use strict';
  if (!window.MMM) return;

  /* ---------- brand tokens (mirror style.css :root) ---------- */
  var C = {
    bg:     [10, 11, 13],     // #0A0B0D
    bg2:    [15, 17, 19],     // #0F1113
    txt:    [233, 234, 228],  // #E9EAE4
    mut:    [148, 150, 145],
    dim:    [98, 100, 96],
    line:   [46, 50, 54],
    acc:    [199, 245, 66],   // #C7F542
    accInk: [16, 20, 2]       // #101402
  };
  var A4 = { w: 210, h: 297 };
  var M = 18;                       // side margin (mm)
  var CW = A4.w - M * 2;            // content width (174mm)
  var PDF_NAME = 'Marwan_Mahrous_Portfolio.pdf';

  var FONTS = [
    { family: 'SpaceGrotesk',  file: 'assets/fonts/SpaceGrotesk-Regular.ttf',  style: 'normal' },
    { family: 'SpaceGrotesk',  file: 'assets/fonts/SpaceGrotesk-Bold.ttf',     style: 'bold' },
    { family: 'JetBrainsMono', file: 'assets/fonts/JetBrainsMono-Regular.ttf', style: 'normal' }
  ];

  /* ---------- i18n helper (PDF text is always the EN edition) ---------- */
  function T(k) { return (MMM.I18N.en || {})[k] || k; }
  function strip(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]*>/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  }
  var pic = function (seed, w, h) {
    return 'https://picsum.photos/seed/' + seed + '/' + w + '/' + h + '.jpg';
  };

  /* ---------- lazy vendor + font loading ---------- */
  var libP = null;
  function loadLib() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'vendor/jspdf.umd.min.js';
      s.onload = res;
      s.onerror = function () { libP = null; rej(new Error('pdf library failed to load')); };
      document.head.appendChild(s);
    });
    return libP;
  }

  var fontsOk = false, fontP = null;
  function embedFonts(doc) {
    if (fontP) return fontP;
    fontP = Promise.all(FONTS.map(function (f) {
      return fetch(f.file).then(function (r) {
        if (!r.ok) throw new Error('font http ' + r.status);
        return r.arrayBuffer();
      }).then(function (buf) {
        var bytes = new Uint8Array(buf), bin = '';
        for (var i = 0; i < bytes.length; i += 8192)
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        doc.addFileToVFS(f.file, btoa(bin));
        doc.addFont(f.file, f.family, f.style);
      });
    })).then(function () { fontsOk = true; })
      .catch(function (e) { console.warn('[mmm] brand fonts unavailable, using core fonts:', e); fontsOk = false; });
    return fontP;
  }

  /* ---------- image pipeline (CORS-safe, JPEG, downscaled) ---------- */
  function fetchImage(url) {
    if (!url) return Promise.resolve(null);
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 9000);
    return fetch(url, { mode: 'cors', credentials: 'omit', signal: ctrl && ctrl.signal })
      .then(function (r) {
        if (!r.ok) throw new Error('img http ' + r.status); return r.blob();
      })
      .then(function (b) {
        return new Promise(function (res, rej) {
          var fr = new FileReader();
          fr.onload = function () { res(fr.result); };
          fr.onerror = rej;
          fr.readAsDataURL(b);
        });
      })
      .then(function (dataUrl) {
        return new Promise(function (res, rej) {
          var im = new Image();
          im.onload = function () { res(im); };
          im.onerror = rej;
          im.src = dataUrl;
        });
      })
      .then(function (im) {
        var sc = Math.min(1, 1400 / im.naturalWidth);
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(im.naturalWidth * sc));
        cv.height = Math.max(1, Math.round(im.naturalHeight * sc));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        return { data: cv.toDataURL('image/jpeg', 0.82), ratio: cv.height / cv.width };
      })
      .catch(function (e) {
        console.warn('[mmm] pdf image skipped:', url.slice(0, 80), e && e.message || e);
        return null;
      })
      .then(function (r) { if (timer) clearTimeout(timer); return r; });
  }

  /* ---------- drawing helpers ---------- */
  var SG = 'SpaceGrotesk', MONO = 'JetBrainsMono';

  function label(doc, y, s) {
    doc.setFont(MONO, 'normal'); doc.setFontSize(8);
    doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
    doc.text(s, M, y);
    return y + 8.5;
  }
  function head(doc, y, s, size) {
    doc.setFont(SG, 'bold'); doc.setFontSize(size || 26);
    doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
    doc.text(s, M, y);
    return y + (size || 26) * 0.42;
  }
  function para(doc, x, y, w, s, size, lh, col) {
    doc.setFont(SG, 'normal'); doc.setFontSize(size || 10);
    doc.setTextColor(col ? col[0] : C.mut[0], col ? col[1] : C.mut[1], col ? col[2] : C.mut[2]);
    var lines = doc.splitTextToSize(s, w);
    doc.text(lines, x, y);
    return y + lines.length * (lh || size * 0.52);
  }
  function hair(doc, y) {
    doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.2);
    doc.line(M, y, A4.w - M, y);
    return y + 6;
  }
  function framedPage(doc, section) {
    doc.addPage();
    doc.setFillColor(C.bg[0], C.bg[1], C.bg[2]);
    doc.rect(0, 0, A4.w, A4.h, 'F');
    doc.setFont(MONO, 'normal'); doc.setFontSize(7.5);
    doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
    doc.text('marwan.dev', M, 13.5);
    doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
    doc.text(section.toUpperCase(), A4.w - M, 13.5, { align: 'right' });
    doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.2);
    doc.line(M, 16.5, A4.w - M, 16.5);
    return 27;
  }
  function footers(doc) {
    var n = doc.getNumberOfPages();
    for (var i = 2; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.2);
      doc.line(M, A4.h - 13, A4.w - M, A4.h - 13);
      doc.setFont(MONO, 'normal'); doc.setFontSize(7);
      doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
      doc.text('© 2025 marwan m. mahrous', M, A4.h - 8.5);
      doc.text(('0' + i).slice(-2) + ' / ' + ('0' + n).slice(-2), A4.w - M, A4.h - 8.5, { align: 'right' });
    }
  }
  function chipRow(doc, y, items) {
    var fs = 7.5, padX = 2.6, boxH = 6, gap = 2, rowH = 8.4;
    doc.setFont(MONO, 'normal'); doc.setFontSize(fs);
    var cx = M, row = 0;
    items.forEach(function (t) {
      var w = doc.getTextWidth(t) + padX * 2;
      if (cx + w > A4.w - M) { cx = M; row++; }
      var ty = y + row * rowH;
      doc.setFillColor(C.bg2[0], C.bg2[1], C.bg2[2]);
      doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.25);
      doc.roundedRect(cx, ty, w, boxH, 1, 1, 'FD');
      doc.setTextColor(C.mut[0], C.mut[1], C.mut[2]);
      doc.text(t, cx + padX, ty + 3.9);
      cx += w + gap;
    });
    return y + (row + 1) * rowH;
  }
  function imageOrPlaceholder(doc, img, y, w, capText) {
    /* cap the image height so tall covers can't push body text into
       the footer zone; narrower images are centered */
    var fullH = img ? w * img.ratio : w * 0.5625;
    var h = Math.min(fullH, 130);
    var dw = img ? h / img.ratio : w;
    var x0 = M + (w - dw) / 2;
    doc.setFillColor(C.bg2[0], C.bg2[1], C.bg2[2]);
    doc.rect(x0, y, dw, h, 'F');
    if (img) {
      doc.addImage(img.data, 'JPEG', x0, y, dw, h);
    } else {
      doc.setDrawColor(C.acc[0], C.acc[1], C.acc[2]); doc.setLineWidth(0.5);
      doc.line(x0, y, x0 + dw, y);
      doc.setFont(MONO, 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
      doc.text(capText || 'screenshot — see the live version', x0 + 3, y + h / 2);
    }
    return y + h + 5;
  }
  function metaGrid(doc, y, rows) {
    var colW = CW / 2, lh = 10.6;
    rows.forEach(function (r, i) {
      var x = M + (i % 2) * colW, ty = y + Math.floor(i / 2) * lh;
      doc.setFont(MONO, 'normal'); doc.setFontSize(7);
      doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
      doc.text(r[0].toUpperCase(), x, ty);
      doc.setFont(SG, 'normal'); doc.setFontSize(9.5);
      doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
      doc.text(doc.splitTextToSize(r[1] || '—', colW - 4)[0], x, ty + 4.6);
    });
    return y + Math.ceil(rows.length / 2) * lh;
  }
  function dot(doc, x, y, col) {
    doc.setFillColor((col || C.acc)[0], (col || C.acc)[1], (col || C.acc)[2]);
    doc.circle(x, y, 1.1, 'F');
  }

  /* ============================================================ */
  MMM.generatePortfolioPDF = function () {
    return loadLib().then(function () {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      return embedFonts(doc).then(function () { return doc; });
    }).then(function (doc) {
      if (!fontsOk) { SG = 'helvetica'; MONO = 'courier'; }

      var E = MMM.I18N.en || {};
      /* the DB is the source of truth, but an empty table must never
         produce an empty portfolio — fall back to the built-in projects */
      var projects = (MMM.state.projects && MMM.state.projects.length
        ? MMM.state.projects : (MMM.PROJECTS || []))
        .filter(function (p) { return p && !p.hidden; });
      var socials = MMM.SOCIALS || [];
      var year = new Date().getFullYear();

      /* ============ 1. COVER ============ */
      doc.setFillColor(C.bg[0], C.bg[1], C.bg[2]);
      doc.rect(0, 0, A4.w, A4.h, 'F');
      /* subtle dot grid — the site's background texture */
      doc.setFillColor(32, 35, 38);
      for (var gx = 10; gx < A4.w; gx += 7.5)
        for (var gy = 10; gy < A4.h; gy += 7.5)
          doc.circle(gx, gy, 0.22, 'F');
      /* top bar */
      doc.setFont(MONO, 'normal'); doc.setFontSize(9);
      doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
      doc.text('marwan.dev', M, 16);
      doc.setFillColor(C.acc[0], C.acc[1], C.acc[2]);
      doc.rect(doc.getTextWidth('marwan.dev') + M + 1.2, 13.4, 1.4, 3.2, 'F');
      doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
      doc.text('PORTFOLIO / ' + year, A4.w - M, 16, { align: 'right' });
      doc.setDrawColor(C.line[0], C.line[1], C.line[2]); doc.setLineWidth(0.2);
      doc.line(M, 20.5, A4.w - M, 20.5);

      var y = 88;
      doc.setFont(MONO, 'normal'); doc.setFontSize(8.5);
      doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
      doc.text(strip(T('heroTopLeft')), M, y); y += 16;

      /* name — solid line + outline line, like the site h1 */
      doc.setFont(SG, 'bold'); doc.setFontSize(38);
      doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
      doc.text('MARWAN', M, y); y += 15;
      doc.setDrawColor(C.acc[0], C.acc[1], C.acc[2]); doc.setLineWidth(0.45);
      doc.text('M. MAHROUS', M, y, { renderingMode: 'stroke' }); y += 13;

      doc.setFont(MONO, 'normal'); doc.setFontSize(8.5);
      doc.setTextColor(C.mut[0], C.mut[1], C.mut[2]);
      doc.text('> building: ' + (T('typed') || []).join(' · '), M, y); y += 12;

      y = para(doc, M, y, 120, strip(T('heroDesc')), 10.5, 5.6, C.mut);
      y += 6;

      /* info rows */
      (T('infoRows') || []).forEach(function (r) {
        var k = strip(r[0]), v = strip(r[1]);
        doc.setFont(MONO, 'normal'); doc.setFontSize(7.5);
        doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
        doc.text(k.toUpperCase(), M, y);
        var vx = M + 34;
        if (/^open to opportunities/i.test(v)) { dot(doc, vx + 1, y - 1); vx += 5; }
        doc.setFont(SG, 'normal'); doc.setFontSize(9.5);
        doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
        doc.text(v, vx, y);
        y += 8.6;
      });

      /* bottom block */
      var by = A4.h - 30;
      doc.setFont(SG, 'normal'); doc.setFontSize(13);
      doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
      doc.textWithLink(MMM.EMAIL, M, by, { url: 'mailto:' + MMM.EMAIL });
      doc.setFont(MONO, 'normal'); doc.setFontSize(7.5);
      doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
      doc.text('ALEXANDRIA, EGYPT — REMOTE FRIENDLY', M, by + 6);
      doc.text('GENERATED FROM MARWAN.DEV — ' +
        new Date().toISOString().slice(0, 10), M, by + 11.5);

      /* ============ 2. PROFILE ============ */
      y = framedPage(doc, 'profile');
      y = label(doc, y, '// the short version');
      y = head(doc, y + 1, 'the short version', 24); y += 2;
      doc.setFont(SG, 'normal'); doc.setFontSize(13.5);
      doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
      var manLines = doc.splitTextToSize(strip(T('manifesto')), CW);
      doc.text(manLines, M, y);
      y += manLines.length * 7 + 8;

      y = hair(doc, y);
      var colW = (CW - 10) / 2, y2 = y;
      var yEnd = para(doc, M, y, colW, strip(T('aboutP1')), 9.5, 5, C.mut);
      yEnd = para(doc, M, yEnd + 3, colW, strip(T('aboutP2')), 9.5, 5, C.mut);

      doc.setFont(MONO, 'normal'); doc.setFontSize(8);
      doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
      doc.text(strip(T('eduLabel')), M + colW + 10, y);
      var ye = y + 8;
      (MMM.EDU || []).forEach(function (e2) {
        var item = e2.en || {};
        doc.setFont(MONO, 'normal'); doc.setFontSize(8.5);
        doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
        doc.text(String(item.v || e2.v || ''), M + colW + 10, ye);
        doc.setFont(SG, 'normal'); doc.setFontSize(9.5);
        doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
        doc.text(strip(item.l), M + colW + 10 + 14, ye);
        ye += 7.4;
      });
      dot(doc, M + colW + 10.8, ye + 2.5);
      doc.setFont(SG, 'normal'); doc.setFontSize(9);
      doc.setTextColor(C.mut[0], C.mut[1], C.mut[2]);
      doc.text(strip(T('nowText')), M + colW + 15, ye + 3);
      y = Math.max(yEnd, ye + 10);

      /* ============ 3. CAPABILITIES ============ */
      y = framedPage(doc, 'capabilities');
      y = label(doc, y, '// what i ship');
      y = head(doc, y + 1, 'what i ship', 24); y += 3;
      y = chipRow(doc, y, MMM.STACK || []);
      y += 6;
      (MMM.SERVICES || []).forEach(function (s, i) {
        var d = s.en || {};
        if (i > 0) y = hair(doc, y - 1);
        doc.setFont(MONO, 'normal'); doc.setFontSize(8.5);
        doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
        doc.text(('0' + (i + 1)).slice(-2), M, y);
        doc.setFont(SG, 'bold'); doc.setFontSize(13);
        doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
        doc.text(strip(d.name), M + 9, y);
        y += 6;
        doc.setFont(MONO, 'normal'); doc.setFontSize(7.5);
        doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
        doc.text(strip(d.tags), M + 9, y);
        y += 5.6;
        y = para(doc, M + 9, y, CW - 9, strip(d.desc), 9.5, 5, C.mut);
        y += 4.5;
      });

      /* ============ 4. PROJECTS — one page each ============
         The chain is SEEDED with the image-preload promise, so pages
         draw only after every cover has loaded (or degraded to a
         branded placeholder). A failed image never blocks the PDF. */
      var chain = Promise.all(projects.map(function (p) {
        return fetchImage(p.img || pic(p.seed || p.id, 1400, 800))
          .then(function (im) { p.__img = im; });
      }));
      projects.forEach(function (p, idx) {
        chain = chain.then(function () {
          var d = p.en || {};
          var py = framedPage(doc, '~/work/' + p.id);
          doc.setFont(MONO, 'normal'); doc.setFontSize(8);
          doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
          doc.text(('0' + (idx + 1)).slice(-2) + ' — ' + String(p.id || '').toUpperCase(), M, py);
          doc.setFont(MONO, 'normal'); doc.setFontSize(7.5);
          doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
          doc.text('SHIPPED ' + (p.year || ''), A4.w - M, py, { align: 'right' });
          py += 11;
          doc.setFont(SG, 'bold'); doc.setFontSize(23);
          doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
          doc.text(p.title || p.id, M, py); py += 9;

          py = metaGrid(doc, py, [
            ['type', strip(d.type)], ['year', p.year || ''],
            ['role', strip(d.role)], ['stack', strip(d.stack)]
          ]);
          py += 3;

          py = imageOrPlaceholder(doc, p.__img, py, CW,
            p.id + ' — screenshot — see the live version');
          py = para(doc, M, py, CW, strip(d.short), 10.5, 5.4, C.txt);
          py += 2;
          py = para(doc, M, py, CW, strip(d.p1), 9.5, 5, C.mut);
          py = para(doc, M, py + 2.5, CW, strip(d.p2), 9.5, 5, C.mut);

          if (p.demoUrl) {
            py = Math.min(py + 1, A4.h - 24);   /* never invade the footer */
            doc.setFont(MONO, 'normal'); doc.setFontSize(8.5);
            doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
            doc.textWithLink('live demo — ' + p.demoUrl, M, py, { url: p.demoUrl });
          }
        });
      });

      return chain.then(function () { return doc; });
    }).then(function (doc) {
      /* ============ LAST. CONTACT ============ */
      var y = framedPage(doc, 'contact');
      y = label(doc, y, '// contact');
      y = head(doc, y + 1, 'let\u2019s build together', 24); y += 4;
      y = para(doc, M, y, 130, strip(T('based')), 10, 5.4, C.mut);
      y += 8;

      doc.setFont(SG, 'normal'); doc.setFontSize(17);
      doc.setTextColor(C.acc[0], C.acc[1], C.acc[2]);
      doc.textWithLink(MMM.EMAIL, M, y, { url: 'mailto:' + MMM.EMAIL });
      y += 14;

      y = hair(doc, y);
      doc.setFont(MONO, 'normal'); doc.setFontSize(8);
      doc.setTextColor(C.dim[0], C.dim[1], C.dim[2]);
      doc.text('// elsewhere', M, y); y += 9;
      (MMM.SOCIALS || []).forEach(function (s) {
        dot(doc, M + 1.2, y - 1.2);
        doc.setFont(MONO, 'normal'); doc.setFontSize(9.5);
        doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
        doc.text(s.label, M + 6, y);
        doc.setTextColor(C.mut[0], C.mut[1], C.mut[2]);
        doc.textWithLink(s.url.replace(/^https?:\/\//, ''), M + 34, y, { url: s.url });
        y += 8.2;
      });
      y += 4; y = hair(doc, y - 5);

      dot(doc, M + 1.2, y + 1);
      doc.setFont(SG, 'normal'); doc.setFontSize(10);
      doc.setTextColor(C.txt[0], C.txt[1], C.txt[2]);
      doc.text('open to opportunities — full-time, freelance and collaborations', M + 6, y + 1);

      /* finalize */
      footers(doc);
      doc.setProperties({
        title: 'Marwan M. Mahrous — Portfolio',
        subject: 'Software Engineer Portfolio',
        author: 'Marwan M. Mahrous',
        keywords: 'portfolio, software engineer, full-stack, embedded, IoT',
        creator: 'marwan.dev'
      });
      doc.save(PDF_NAME);
    });
  };

  /* ============================================================
     Button wiring — busy / done / error states, i18n-aware.
     ============================================================ */
  function init() {
    var btn = document.getElementById('pdfBtn');
    if (!btn || btn.__pdfWired) return;
    btn.__pdfWired = true;
    var t = function (k) {
      var lang = (MMM.state && MMM.state.lang) || 'en';
      return (MMM.I18N[lang] && MMM.I18N[lang][k]) || MMM.I18N.en[k] || k;
    };
    btn.addEventListener('click', function () {
      if (btn.__busy) return;
      btn.__busy = true;
      var span = btn.querySelector('span[data-i18n]') || btn.querySelector('span');
      var prev = span ? span.textContent : '';
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      if (span) span.textContent = t('pdfBusy');
      Promise.resolve().then(MMM.generatePortfolioPDF).then(function () {
        MMM.showToast(t('pdfDone'));
      }).catch(function (e) {
        console.error('[mmm] PDF generation failed:', e);
        MMM.showToast(t('pdfError'));
      }).then(function () {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        if (span) span.textContent = prev;
        btn.__busy = false;
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
