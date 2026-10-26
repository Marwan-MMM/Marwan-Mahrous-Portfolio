/* ============================================================
   data.js — ALL site content lives here.
   This is the only file you need to edit for day-to-day changes.
   (Projects can also be managed from the secret admin panel —
   see js/admin.js — and published via Export.)
   ============================================================ */

window.MMM = {

  /* ---------- Site config ---------- */
  VERSION: '2.0.0',
  EMAIL: 'Marwan.moh.mahrous@gmail.com',

  /* ---------- Supabase ----------
     Dashboard → Settings → API:
       • Project URL     → SUPABASE.url
       • anon public key → SUPABASE.anonKey
     The anon key is safe to expose — Row Level Security does the
     real protection. NEVER put the service_role key in frontend code. */
  SUPABASE: {
    url:     'https://gsfhvsnfjftcipezhxjg.supabase.co',
    anonKey: 'sb_publishable_ePjIIAuwYosm14HnOIzIRQ_vUycY_sq'
  },

  /* localStorage key for the offline snapshot of the database */
  KEYS: { cache: 'mmm.cache.v2' },

  /* ---------- Stack marquee ---------- */
  STACK: ['TypeScript','React','Node.js','Python','C / C++','PostgreSQL','Docker','GraphQL','ESP32','Rust'],

  /* ---------- UI strings (en / ar) ---------- */
  I18N: {
    en: {
      docTitle: 'Marwan M. Mahrous — Software Engineer',
      docDesc: 'Marwan M. Mahrous — software engineer & computer engineering graduate building web platforms, APIs and embedded systems.',
      navWork: 'work', navAbout: 'about', navCap: 'capabilities', navContact: 'contact',
      heroTopLeft: '// marwan m. mahrous — software engineer',
      typedPrefix: '> building:\u00A0',
      typed: ['web platforms', 'robust APIs', 'embedded systems', 'mobile apps'],
      heroDesc: 'I design, build and ship software end to end — web platforms, APIs and embedded systems that are fast, reliable and made to last.',
      heroCta: 'view work', heroCta2: 'get in touch',
      infoRows: [
        ['location', 'Alexandria, Egypt — remote friendly'],
        ['degree', 'B.Sc. Computer Engineering'],
        ['status', '<span class="dot"></span>open to opportunities'],
        ['focus', 'web · APIs · embedded · mobile']
      ],
      workPath: '~/work', workRight: '05 projects — 2022/2025',
      workTitleHtml: 'selected <span class="o">work</span>',
      shipped: 'shipped',
      aboutPath: '~/about', aboutRight: 'Alexandria — remote friendly',
      aboutTitleHtml: 'the short <span class="o">version</span>',
      manifesto: 'I\u2019m a software engineer who treats code as *craft. Computer engineering taught me the whole stack — from silicon to screen — and I bring every layer of it to everything I build.',
      workLabel: '// how i work',
      aboutP1: 'No account managers, no handoffs — you talk directly to the person writing the code. Architecture, implementation, deployment and the iteration that follows: one continuous process.',
      aboutP2: 'Fresh out of engineering school. Old-school about quality.',
      eduLabel: '// education & highlights',
      nowText: 'currently deep-diving: distributed systems',
      capPath: '~/capabilities', capRight: '04 disciplines',
      capTitleHtml: 'what i <span class="o">ship</span>',
      contactPath: '~/contact', contactRight: 'open to work — 2025',
      contactTitleHtml: 'let\u2019s build <span class="o">together</span>',
      socLabel: '// elsewhere', mapLabel: '// index', infoLabel: '// info',
      based: 'Based in Alexandria — open to remote work and relocation.',
      timeLabel: 'local time',
      copyright: '© 2025 marwan m. mahrous',
      credit: 'designed & coded by me',
      top: 'top', close: 'close', avail: 'open to work',
      mType: 'type', mYear: 'year', mRole: 'role', mStack: 'stack',
      mNext: 'next project', mDemo: 'live demo',
      lbHint: 'scroll — full image, never cropped',
      toast: 'email copied — talk soon.',
      pdfCta: 'download portfolio', pdfBusy: 'generating pdf…',
      pdfDone: 'portfolio pdf downloaded — talk soon.',
      pdfError: 'couldn’t generate the pdf — please try again.'
    },
    ar: {
      docTitle: 'مروان م. مهروس — مهندس برمجيات',
      docDesc: 'مروان م. مهروس — مهندس برمجيات وخريج هندسة حاسوب، أبني منصات ويب وواجهات برمجية وأنظمة مدمجة.',
      navWork: 'الأعمال', navAbout: 'عنّي', navCap: 'الخدمات', navContact: 'تواصل',
      heroTopLeft: '// مروان م. مهروس — مهندس برمجيات',
      typedPrefix: 'أبني:\u00A0',
      typed: ['منصات ويب', 'واجهات برمجية قوية', 'أنظمة مدمجة', 'تطبيقات موبايل'],
      heroDesc: 'أصمم وأطوّر وأطلق البرمجيات من البداية للنهاية — منصات ويب وواجهات برمجية وأنظمة مدمجة سريعة وموثوقة ومبنية لتدوم.',
      heroCta: 'شاهد الأعمال', heroCta2: 'تواصل معي',
      infoRows: [
        ['الموقع', 'القاهرة، مصر — عن بُعد'],
        ['الدرجة', 'بكالوريوس هندسة الحاسوب'],
        ['الحالة', '<span class="dot"></span>متاح لفرص جديدة'],
        ['التركيز', 'ويب · واجهات · مدمجة · موبايل']
      ],
      workPath: '~/work', workRight: '٠٥ مشاريع — ٢٠٢٢/٢٠٢٥',
      workTitleHtml: 'أعمال <span class="o">مختارة</span>',
      shipped: 'أُطلق',
      aboutPath: '~/about', aboutRight: 'القاهرة — عن بُعد',
      aboutTitleHtml: 'النسخة <span class="o">المختصرة</span>',
      manifesto: 'أنا مهندس برمجيات يتعامل مع الشيفرة بوصفها *حرفةً. علّمتني هندسة الحاسوب الصورة كاملة — من العتاد إلى الشاشة — وأوظّف كل طبقة من طبقاتها في كل ما أبنيه.',
      workLabel: '// كيف أعمل',
      aboutP1: 'لا مديرين حسابات ولا تسليم بين أقسام — تتحدث مباشرة مع من يكتب الشيفرة. المعمارية، التنفيذ، النشر، ثم التحسين المستمر: عملية واحدة متصلة.',
      aboutP2: 'خريج حديث، بمعايير جودة راسخة.',
      eduLabel: '// التعليم والإنجازات',
      nowText: 'حاليًا: أتعمّق في الأنظمة الموزعة',
      capPath: '~/capabilities', capRight: '٠٤ تخصصات',
      capTitleHtml: 'ما <span class="o">أقدّمه</span>',
      contactPath: '~/contact', contactRight: 'متاح للعمل — ٢٠٢٥',
      contactTitleHtml: 'لنبنِ <span class="o">معًا</span>',
      socLabel: '// حساباتي', mapLabel: '// الفهرس', infoLabel: '// معلومات',
      based: 'أقيم في القاهرة — متاح للعمل عن بُعد أو الانتقال.',
      timeLabel: 'التوقيت المحلي',
      copyright: '© ٢٠٢٥ مروان م. مهروس',
      credit: 'التصميم والبرمجة — بنفسي',
      top: 'للأعلى', close: 'إغلاق', avail: 'متاح للعمل',
      mType: 'النوع', mYear: 'السنة', mRole: 'الدور', mStack: 'التقنيات',
      mNext: 'المشروع التالي', mDemo: 'زيارة النسخة الحية',
      lbHint: 'مرّر لأسفل — الصورة كاملة بلا اقتصاص',
      toast: 'تم نسخ البريد — أراك قريبًا.',
      pdfCta: 'تحميل البورتفوليو', pdfBusy: 'جارٍ إنشاء ملف PDF…',
      pdfDone: 'تم تنزيل ملف البورتفوليو بنجاح.',
      pdfError: 'تعذّر إنشاء ملف PDF — حاول مرة أخرى.'
    }
  },

  /* ---------- Social profiles (contact section + PDF export) ---------- */
  SOCIALS: [
    { label: 'GitHub',   url: 'https://github.com/marwanmahrous' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/marwan-mahrous-elsetouhy/' },
    { label: 'Whatsapp',        url: 'https://wa.me/201111077515' }
  ],

  /* ---------- Default projects ----------
     Fields: id (unique slug), title, titleAr (optional), year,
     seed (picsum placeholder), img / img2 (optional real image URLs —
     override the seed when filled), hidden (admin toggle),
     en / ar content (ar is optional — site falls back to English).
     These are the seed defaults; the admin panel & data/projects.json
     can override them at runtime. */
  PROJECTS: [
    {
      id: 'taskflow', title: 'Taskflow', titleAr: '', year: '2024', seed: 'mmm-taskflow', img: '', img2: '', hidden: false,
      en: {
        cat: 'Product Platform — Full-stack', type: 'Personal project',
        role: 'Design, Frontend & Backend', stack: 'React · Node.js · PostgreSQL · WebSockets',
        short: 'Realtime team boards with offline-first sync — built from the database schema to the last easing curve.',
        p1: 'A team productivity platform born from my own frustration with bloated tools. Real-time boards, offline-first sync and a keyboard-first interface — built end to end.',
        p2: 'Shipped as a self-hostable open-source stack: around 2,000 users, 800+ GitHub stars, and a sync engine that survives flaky café Wi-Fi without dropping a single keystroke.'
      },
      ar: {
        cat: 'منصة إنتاجية — تطوير متكامل', type: 'مشروع شخصي',
        role: 'التصميم والواجهات والخلفية', stack: 'React · Node.js · PostgreSQL · WebSockets',
        short: 'لوحات فرق لحظية مع مزامنة تعمل دون اتصال — من مخطط قاعدة البيانات إلى آخر تفصيلة.',
        p1: 'منصة إنتاجية للفرق وُلدت من إحباطي من الأدوات المتضخمة. لوحات لحظية، ومزامنة تعمل حتى دون اتصال، وواجهة صديقة للوحة المفاتيح — مبنية من البداية إلى النهاية.',
        p2: 'أُطلقت كمجموعة مفتوحة المصدر قابلة للاستضافة الذاتية: نحو ٢٠٠٠ مستخدم، وأكثر من ٨٠٠ نجمة على GitHub، ومحرك مزامنة يصمد أمام أسوأ الشبكات.'
      }
    },
    {
      id: 'meshkat', title: 'Meshkat', titleAr: 'مشكاة', year: '2024', seed: 'mmm-meshkat', img: '', img2: '', hidden: false,
      en: {
        cat: 'Arabic NLP Toolkit — Open Source', type: 'Open source',
        role: 'Creator & maintainer', stack: 'Python · PyTorch · FastAPI',
        short: 'Open-source Arabic NLP toolkit: dialect detection, root-aware search and text normalization.',
        p1: 'Arabic is nearly half the internet\u2019s language and a fraction of its NLP tooling. Meshkat is my answer: a toolkit for dialect detection, root-aware search and text normalization.',
        p2: 'Adopted by two university research groups for text-mining papers, and its normalization module now cleans millions of posts a day inside a media-monitoring pipeline.'
      },
      ar: {
        cat: 'عدة معالجة لغة عربية — مفتوحة المصدر', type: 'مفتوح المصدر',
        role: 'المنشئ والمشرف', stack: 'Python · PyTorch · FastAPI',
        short: 'عدة مفتوحة المصدر لمعالجة العربية: كشف اللهجات، بحث بالجذور، وتطبيع النصوص.',
        p1: 'العربية تكاد تكون نصف لغة الإنترنت وجزءًا ضئيلًا من أدوات معالجتها. مشكاة هي إجابتي: مجموعة أدوات لكشف اللهجات والبحث بالجذور وتطبيع النصوص.',
        p2: 'تبنّتها مجموعتان بحثيتان جامعيتان في أوراق تنقيب النصوص، ووحدة التطبيع فيها تنظّف اليوم ملايين المنشورات يوميًا.'
      }
    },
    {
      id: 'fleetiq', title: 'FleetIQ', titleAr: '', year: '2023', seed: 'mmm-fleetiq', img: '', img2: '', hidden: false,
      en: {
        cat: 'IoT Fleet Tracking — Hardware & Software', type: 'Freelance',
        role: 'Embedded & Backend', stack: 'C++ · ESP32 · MQTT · Node.js',
        short: 'Custom ESP32 trackers and a live map for a 40-vehicle delivery fleet.',
        p1: 'A local delivery company wanted to see its fleet the way air-traffic control sees planes. I built the whole chain: custom ESP32 trackers, an MQTT backbone, and a live map with geofencing.',
        p2: 'Forty vehicles online within a month. Route optimization cut fuel costs by 15%, and the client hasn\u2019t lost a single van to theft since launch.'
      },
      ar: {
        cat: 'تتبع أسطول IoT — عتاد وبرمجيات', type: 'عمل حر',
        role: 'الأنظمة المدمجة والخلفية', stack: 'C++ · ESP32 · MQTT · Node.js',
        short: 'متتبعات ESP32 مخصصة وخريطة حية لأسطول توصيل من ٤٠ مركبة.',
        p1: 'أرادت شركة توصيل محلية أن ترى أسطولها كما ترى مراقبة الحركة الجوية الطائرات. بنيت السلسلة كاملة: متتبعات مخصصة وشبكة MQTT وخريطة حية مع تنبيهات.',
        p2: 'أربعون مركبة متصلة خلال شهر. ووفّر تحسين المسارات ١٥٪ من تكاليف الوقود، ولم تُفقد أي مركبة بالسرقة منذ الإطلاق.'
      }
    },
    {
      id: 'vendora', title: 'Vendora', titleAr: '', year: '2023', seed: 'mmm-vendora', img: '', img2: '', hidden: false,
      en: {
        cat: 'E-commerce Storefront — Freelance', type: 'Client work',
        role: 'Full-stack development', stack: 'Next.js · Node.js · PostgreSQL',
        short: 'Editorial storefront for a family business — perfect Lighthouse scores, zero drama.',
        p1: 'A family business moving from market stalls to online orders. I built a storefront that treats their products like editorial content — big photography, honest copy — with a simple orders dashboard.',
        p2: 'Perfect Lighthouse scores across the board, the first mobile order within hours of launch, and a back office so simple the owner runs it solo.'
      },
      ar: {
        cat: 'متجر إلكتروني — عمل حر', type: 'عمل لعميل',
        role: 'تطوير متكامل', stack: 'Next.js · Node.js · PostgreSQL',
        short: 'متجر بأسلوب تحريري لعمل عائلي — أداء مثالي بلا تعقيد.',
        p1: 'أسرة تجارية تنتقل من السوق إلى طلبات الإنترنت. بنيت متجرًا يتعامل مع منتجاتهم كمحتوى تحريري — صور كبيرة ووصف صادق — مع لوحة طلبات بسيطة.',
        p2: 'درجات مثالية في Lighthouse على كل المؤشرات، وأول طلب من الهاتف خلال ساعات، ولوحة تحكم يديرها صاحبها بمفرده.'
      }
    },
    {
      id: 'algoviz', title: 'AlgoViz', titleAr: '', year: '2022', seed: 'mmm-algoviz', img: '', img2: '', hidden: false,
      en: {
        cat: 'Algorithm Visualizer — Side Project', type: 'Side project',
        role: 'Everything', stack: 'TypeScript · Canvas · Web Audio',
        short: 'Sorting and graph algorithms you scrub like video — with a soft synth tick on every comparison.',
        p1: 'Studying for coding interviews, I kept wishing algorithms textbooks moved. So I built what I wanted: algorithms you scrub through step by step, with complexity overlays and sound.',
        p2: '1.2k GitHub stars, adopted by study groups at three universities, and still the project interviewers ask about the most.'
      },
      ar: {
        cat: 'مُصوِّر خوارزميات — مشروع جانبي', type: 'مشروع جانبي',
        role: 'كل شيء', stack: 'TypeScript · Canvas · Web Audio',
        short: 'خوارزميات فرز ورسوم تتصفحها كالفيديو — مع نغمة خفيفة مع كل مقارنة.',
        p1: 'أثناء التحضير لمقابلات البرمجة، تمنّيت لو تتحرك خوارزميات الكتب. فبنيت ما أردته: خوارزميات تتصفحها خطوة بخطوة، مع مؤشرات تعقيد وصوت.',
        p2: 'أكثر من ١٢٠٠ نجمة على GitHub، وتتبناها مجموعات دراسية في ثلاث جامعات، وما زال الأكثر سؤالًا عنه في المقابلات.'
      }
    }
  ],

  /* ---------- Capabilities ---------- */
  SERVICES: [
    { en: { name: 'Full-Stack Development', tags: 'React · Next.js · Node.js · TypeScript · PostgreSQL',
        desc: 'From pixel to database and back. Complete web products — responsive frontends, sturdy APIs and everything in between — with performance and accessibility treated as features, not afterthoughts.' },
      ar: { name: 'تطوير الويب المتكامل', tags: 'React · Next.js · Node.js · TypeScript · PostgreSQL',
        desc: 'من البكسل إلى قاعدة البيانات وعودةً. منتجات ويب كاملة — واجهات متجاوبة وواجهات برمجية متينة وكل ما بينهما — معاملة الأداء وإمكانية الوصول كميزتين أساسيتين.' } },
    { en: { name: 'Backend & APIs', tags: 'Node.js · Python · REST · GraphQL · Redis · Docker',
        desc: 'Systems that stay calm under load. Clean REST and realtime APIs, data models that won\u2019t fight you later, and real care for caching, queues and test coverage.' },
      ar: { name: 'الأنظمة الخلفية وواجهات البرمجة', tags: 'Node.js · Python · REST · GraphQL · Redis · Docker',
        desc: 'أنظمة تحافظ على هدوئها تحت الضغط. واجهات نظيفة، ونماذج بيانات لن تقاومك لاحقًا، وعناية حقيقية بالتخزين المؤقت وقوائم الانتظار والاختبارات.' } },
    { en: { name: 'Embedded & IoT', tags: 'C/C++ · ESP32 · MQTT · RTOS · Sensors',
        desc: 'Where the computer-engineering degree earns its keep. Firmware, sensors and microcontrollers that talk to live dashboards — from breadboard prototype to production hardware.' },
      ar: { name: 'الأنظمة المدمجة وإنترنت الأشياء', tags: 'C/C++ · ESP32 · MQTT · RTOS · Sensors',
        desc: 'هنا تؤتي درجة هندسة الحاسوب ثمارها. برمجيات ثابتة وحساسات ومتحكمات تتحدث مع لوحات تحكم لحظية — من نموذج أولي إلى عتاد إنتاجي.' } },
    { en: { name: 'Mobile Apps', tags: 'React Native · Flutter · Offline-first · Push',
        desc: 'Cross-platform apps that don\u2019t feel cross-platform. One codebase, a native-grade feel, and the same obsession with detail I bring to the web.' },
      ar: { name: 'تطبيقات الموبايل', tags: 'React Native · Flutter · Offline-first · Push',
        desc: 'تطبيقات متعددة المنصات لا تُشعرك أنها كذلك. قاعدة شيفرة واحدة بإحساس أصيل، وبنفس هوس التفاصيل الذي أحضره إلى الويب.' } }
  ],

  /* ---------- Education & highlights (swap in your real data) ---------- */
  EDU: [
    { v: '2024', en: { l: 'B.Sc. Computer Engineering' },        ar: { l: 'بكالوريوس هندسة الحاسوب' } },
    { v: '2024', en: { l: 'Graduation Project — Excellent' },    ar: { l: 'مشروع التخرج — امتياز' } },
    { v: '2023', en: { l: 'ICPC Regional Contestant' },          ar: { l: 'مشارك في ICPC الإقليمية' } },
    { v: '500+', en: { l: 'LeetCode problems solved' },          ar: { l: 'مسائل محلولة على LeetCode' } }
  ]
};