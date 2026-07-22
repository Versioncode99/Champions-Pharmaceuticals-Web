/* ============================================================
   Champions Pharmaceuticals — static site generator
   Run: node build.mjs   → writes all .html pages from shared layout
   ============================================================ */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIGESTS = join(ROOT, 'content'); // study source lives in-repo so the build is self-contained & portable
const YEAR = 2026;
const SITE = 'https://www.championspharmaceuticals.com';

const esc = (s) => s.replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* De-AI pass for long study text: kill the em-dash habit and the handful of
   phrases that pattern-match to AI copy. We deliberately DON'T touch single
   medical adjectives (robust/crucial/etc.) — in scientific prose those are
   legitimate and swapping them blindly would damage accuracy. Keeps en-dash
   ranges (1879–1886) intact. */
function deAI(t) {
  // em dash → sensible punctuation
  t = t.replace(/\s*—\s*/g, ', ')        // " — " appositive → comma
       .replace(/,\s*,/g, ',')                 // clean any doubled commas
       .replace(/,\s*\./g, '.');               // ", ." → "."
  const swaps = [
    [/\bstands as a\b/gi, 'is a'],
    [/\bstand as\b/gi, 'are'],
    [/\bserves as a\b/gi, 'is a'],
    [/\bserves as\b/gi, 'is'],
    [/\bis a testament to\b/gi, 'reflects'],
    [/\ba testament to\b/gi, 'a sign of'],
    [/\bplays? a (vital|pivotal|crucial|key) role\b/gi, 'is central'],
    [/\brich tapestry\b/gi, 'range'],
    [/\bin the realm of\b/gi, 'in'],
    [/\bit is worth noting that\b/gi, 'Notably,'],
    [/\bit's worth noting that\b/gi, 'Notably,'],
    [/\bnavigating the complex(ities)?\b/gi, 'working through the details'],
    [/\bever-(evolving|changing)\b/gi, 'changing'],
    [/\bat the forefront of\b/gi, 'leading'],
    [/\bunderscores the importance of\b/gi, 'shows the importance of'],
  ];
  for (const [re, to] of swaps) t = t.replace(re, to);
  // typographic tidy: strip stray spaces the source left before punctuation / inside brackets
  t = t.replace(/\s+([,;.])/g, '$1').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  return t;
}

/* Convert an extracted study digest (markdown-ish text) into a rich, structured
   HTML body — preserves ALL content. Returns { chips, intro, html }. */
function digestToHtml(name) {
  let raw = readFileSync(join(DIGESTS, name + '.md'), 'utf8');
  // Compliance (vault hard rule): the word "cannabis" must never appear. Use approved framing.
  raw = raw.replace(/Cannabis sativa/gi, 'the cannabinoid source plant')
           .replace(/\bCannabis\b/g, 'Cannabinoid')
           .replace(/\bcannabis\b/g, 'cannabinoid')
           .replace(/\bmarijuana\b/gi, 'cannabinoid');
  raw = deAI(raw);
  const lines = raw.split('\n').map(l => l.trim());
  const noise = /^(Home\b|Research$|.*Research Study$|.*Liquid Template|Paste into|.*font-primary|\{[%{]|.*settings\.|^[a-z0-9_]{10,}$)/i;
  const metaKeys = /^(Locations?|Scope|Timeline|Study Type|Research Area|Status|Partnership Type|Region)\s*[:\-]/i;

  let intro = '', title = '';
  const chips = [];
  const body = [];
  let started = false, sawTitle = false;

  for (let i = 0; i < lines.length; i++) {
    let ln = lines[i];
    if (!ln) continue;
    if (i < 3 && noise.test(ln)) continue;
    if (ln.startsWith('## ') && !sawTitle) { title = ln.slice(3).trim(); sawTitle = true; continue; }
    if (!started && !intro && sawTitle && !metaKeys.test(ln) && ln.length > 40) { intro = ln; continue; }
    if (!started && metaKeys.test(ln)) { chips.push(ln.replace(/\s*[:\-]\s*/, ': ')); continue; }
    // body begins at first "## " after intro, or at Executive/Research Overview
    if (!started && (ln.startsWith('## ') || /^(Executive Summary|Research Overview)$/i.test(ln))) started = true;
    if (!started) continue;
    if (noise.test(ln)) continue;
    body.push(ln);
  }

  /* Build a THREE-TIER hierarchy so studies read as sectioned pages, not a wall
     of text:
       • a "## " heading that follows a dropped eyebrow label = a TOP section  -> <h2 class="sec">
       • any other "## " heading                             = a subsection    -> <h3>
       • a short, label-like line (no ending punctuation)     = an inline label -> <h4 class="sub">
     The first substantive paragraph of each top section is promoted to a lead. */
  const eyebrowRe = /^(Executive Summary|Key Takeaways|Research Objectives|Background &amp; Rationale|Background & Rationale|Clinical Applications|Study Goals[^.]*|References?|Conclusions?|Discussion|Key Findings|Summary)$/i;
  const isLabel = (s) => {
    if (s.length > 62 || s.length < 3) return false;
    if (/[.;,?!]$/.test(s) || s.endsWith(':')) return false;
    if (s.startsWith('- ') || s.startsWith('## ')) return false;
    if (!/^[A-Z0-9]/.test(s)) return false;
    if (s.split(/\s+/).length > 9) return false;
    return true;
  };
  const out = [];
  let list = null, topNext = false, leadPending = false;
  const flush = () => { if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; } };
  for (let i = 0; i < body.length; i++) {
    const ln = body[i];
    const next = body[i + 1] || '';
    if (eyebrowRe.test(ln) && next.startsWith('## ')) { topNext = true; continue; } // eyebrow marks the next heading as a top section
    if (ln.startsWith('## ')) {
      flush();
      const h = esc(ln.slice(3).trim());
      if (topNext) { out.push(`<h2 class="sec">${h}</h2>`); topNext = false; leadPending = true; }
      else { out.push(`<h3>${h}</h3>`); }
    } else if (ln.startsWith('- ')) {
      // bold a leading "Label:" so key-takeaway items scan at a glance
      const item = esc(ln.slice(2).trim()).replace(/^([^:]{3,64}):\s+/, '<strong>$1:</strong> ');
      (list ||= []).push(`<li>${item}</li>`);
    } else if (isLabel(ln)) {
      flush();
      out.push(`<h4 class="sub">${esc(ln)}</h4>`);
    } else {
      flush();
      out.push(`<p${leadPending ? ' class="lead"' : ''}>${esc(ln)}</p>`);
      leadPending = false;
    }
  }
  flush();
  return { chips: chips.slice(0, 6), intro: intro || title, html: out.join('\n') };
}

/* ---------- shared bits ---------- */
const NAV = [
  ['Home', 'index.html'],
  ['About', 'about.html'],
  ['Research', 'research.html'],
  ['Products', 'products.html'],
  ['Partnerships', 'partnerships.html'],
  ['Newsroom', 'news.html'],
  ['Careers', 'careers.html'],
  ['Contact', 'contact.html'],
];

// icons (inline, stroke-based — no icon library, per design rules)
const ic = {
  dist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h18M3 12h18M3 17h13"/><circle cx="20" cy="17" r="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l8 3v6c0 5-3.5 7.6-8 9-4.5-1.4-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  hands: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 20v-2a4 4 0 00-3-3.8M16 3.2a4 4 0 010 7.6"/></svg>',
  flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 3v6l-5 8.5A2 2 0 006 20.5h12a2 2 0 001.7-3L14 9V3"/><path d="M8 3h8M7.5 14h9"/></svg>',
  dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3c0 6 12 6 12 12M18 3c0 6-12 6-12 12M6 21c0-2 12-2 12 0M6 3c0-.7 12-.7 12 0M7.5 7h9M7.5 17h9"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3c4 5 6.5 8.2 6.5 11.5a6.5 6.5 0 01-13 0C5.5 11.2 8 8 12 3z"/></svg>',
  chain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6" cy="8" r="2.6"/><circle cx="12" cy="15" r="2.6"/><circle cx="18" cy="8" r="2.6"/><path d="M7.8 9.6l2.6 3.6M13.8 13.2l2.6-3.6"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16z"/><path d="M4 20C8.5 13 13.5 8.5 20 4.5"/></svg>',
};

/* Custom SVG study covers — a cohesive, on-brand alternative to reused stock photos.
   Deep-green gradient + a soft mint icon + a small node network, distinct per study. */
const iconInner = s => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
function cover(kind) {
  const spec = {
    stem:     { ic: ic.dna,   nodes: [[64,86],[116,66],[104,132],[58,150]] },
    scorpion: { ic: ic.flask, nodes: [[58,78],[108,104],[70,146],[128,150]] },
    sickle:   { ic: ic.drop,  nodes: [[68,72],[120,108],[58,142]] },
    peptide:  { ic: ic.chain, nodes: [[48,120],[92,88],[136,120],[178,90]] },
    phyto:    { ic: ic.leaf,  nodes: [[70,150],[112,108],[152,140]] },
    border:   { ic: ic.globe, nodes: [[60,92],[122,78],[100,150]] },
  }[kind] || { ic: ic.dna, nodes: [] };
  const lines = spec.nodes.map((n, i) => i ? `<line x1="${spec.nodes[i-1][0]}" y1="${spec.nodes[i-1][1]}" x2="${n[0]}" y2="${n[1]}"/>` : '').join('');
  const dots = spec.nodes.map(n => `<circle cx="${n[0]}" cy="${n[1]}" r="4.5"/>`).join('');
  return `<svg class="cover" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`
    + `<defs><linearGradient id="cg-${kind}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3d2e"/><stop offset="1" stop-color="#036c48"/></linearGradient></defs>`
    + `<rect width="400" height="250" fill="url(#cg-${kind})"/>`
    + `<circle cx="312" cy="70" r="150" fill="#ffffff" opacity="0.045"/>`
    + `<circle cx="70" cy="205" r="90" fill="#ffffff" opacity="0.03"/>`
    + `<svg x="234" y="56" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#bff0d9" stroke-width="1.2" opacity="0.9">${iconInner(spec.ic)}</svg>`
    + `<g stroke="#8fe3c2" stroke-width="1.5" opacity="0.6">${lines}</g>`
    + `<g fill="#8fe3c2" opacity="0.9">${dots}</g>`
    + `</svg>`;
}

function header(active) {
  const links = NAV.map(([label, href]) =>
    `<li><a href="${href}"${href === active ? ' aria-current="page"' : ''}>${label}</a></li>`
  ).join('');
  return `<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="index.html" aria-label="Champions Pharmaceuticals — home">
      <img class="brand-logo" src="assets/img/logo-mark.png" alt="Champions Pharmaceuticals" width="300" height="100">
    </a>
    <nav aria-label="Primary">
      <ul class="nav-links" id="nav-links">${links}</ul>
    </nav>
    <div class="nav-cta">
      <span class="nav-flag">Nigeria</span>
      <a href="contact.html" class="btn btn-primary" style="padding:.6rem 1.15rem;font-size:.9rem">Partner with us</a>
      <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav-links">${ic.menu}</button>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand brand-foot" href="index.html" aria-label="Champions Pharmaceuticals — home">
          <img class="brand-logo" src="assets/img/logo-mark.png" alt="Champions Pharmaceuticals" width="300" height="100">
        </a>
        <p>Regulated pharmaceutical distribution, research and institutional partnership — advancing Nigeria's healthcare infrastructure since 1993.</p>
      </div>
      <div>
        <h5>Company</h5>
        <ul>
          <li><a href="about.html">About &amp; Heritage</a></li>
          <li><a href="partnerships.html">Partnerships</a></li>
          <li><a href="research.html">Research</a></li>
          <li><a href="products.html">Product Portfolio</a></li>
          <li><a href="news.html">Newsroom</a></li>
          <li><a href="careers.html">Careers</a></li>
          <li><a href="governance.html">Governance</a></li>
        </ul>
      </div>
      <div>
        <h5>Programmes</h5>
        <ul>
          <li><a href="programs/needleless-delivery.html">Needleless Delivery</a></li>
          <li><a href="programs/injectable-delivery.html">Injectable Delivery</a></li>
          <li><a href="research.html">Research Studies</a></li>
          <li><a href="compliance.html">Compliance</a></li>
        </ul>
      </div>
      <div>
        <h5>Contact</h5>
        <ul>
          <li><a href="mailto:contact@championspharmaceuticals.com">contact@championspharmaceuticals.com</a></li>
          <li><a href="tel:+2347070320052">+234 707 032 0052</a></li>
          <li>Lagos, Nigeria</li>
          <li><a href="contact.html">Enquiry form</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <p class="disclaimer">This information, including product information, is intended only for residents of Nigeria. Products may have different labelling in other countries. Champions Pharmaceuticals operates in alignment with NAFDAC and Federal Ministry of Health standards.<br><span class="foot-review">Content reviewed ${YEAR} · For institutional and healthcare-professional audiences.</span></p>
      <p>&copy; <span id="yr">${YEAR}</span> Champions Pharmaceuticals. All rights reserved.</p>
    </div>
  </div>
</footer>`;
}

/* Organization structured data — helps Google and AI answer engines describe
   the company correctly (a strength competitor sites have and we lacked). */
const ORG_JSONLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Champions Pharmaceuticals',
  url: SITE,
  logo: SITE + '/assets/img/logo-mark.png',
  foundingDate: '1993-06-04',
  description: 'A Nigerian pharmaceutical group advancing healthcare through regulated distribution, evidence-based research and institutional partnership.',
  address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
  email: 'contact@championspharmaceuticals.com',
  telephone: '+234 707 032 0052',
  areaServed: 'NG',
});

function layout({ title, desc, active, body, prefix = '', page = '' }) {
  body = deAI(body); // final copy pass: kill em-dash habit + residual AI phrasing site-wide
  desc = deAI(desc); // meta descriptions show in search/social — keep them human too
  // lazy-load + async-decode everything except the above-the-fold banner backgrounds
  body = body.replace(/<img (?!class="hero-bg"|class="pbanner-bg")/g, '<img loading="lazy" decoding="async" ');
  body = body.replace(/<img (class="(?:hero-bg|pbanner-bg)")/g, '<img decoding="async" $1');
  // prefix handles subfolder pages (research/, programs/) that need ../ on assets & nav
  const h = deAI(prefix ? header(active).replace(/(href|src)="(?!http|mailto|tel|#)/g, `$1="${prefix}`) : header(active));
  const f = deAI(prefix ? footer().replace(/(href|src)="(?!http|mailto|tel|#)/g, `$1="${prefix}`) : footer());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<script>document.documentElement.className+=' js';</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#00875A">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE}/${page}">
<link rel="icon" href="${prefix}assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${prefix}assets/css/style.css">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/assets/img/hero-scientists.jpg">
<meta property="og:url" content="${SITE}/${page}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${ORG_JSONLD}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${h}
<main id="main">
${body}
</main>
${f}
<script src="${prefix}assets/js/main.js"></script>
</body>
</html>`;
}

const PAGES = [];
function write(rel, html) {
  const full = join(ROOT, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  PAGES.push(rel.replace(/\\/g, '/'));
  console.log('wrote', rel, `(${(html.length / 1024).toFixed(1)}kb)`);
}

/* ============================================================
   PAGE: HOME
   ============================================================ */
const home = `
<section class="hero">
  <img class="hero-bg" src="assets/img/hero-scientists.jpg" alt="" fetchpriority="high" width="1376" height="768">
  <div class="wrap hero-inner">
    <span class="eyebrow" style="color:#8fe3c2">Institutional Pharmaceutical Partner · Est. 1993</span>
    <h1>Advancing pharmaceutical excellence through research &amp; partnership</h1>
    <p>Champions Pharmaceuticals supports Nigeria's healthcare system through regulated distribution, evidence-based research, and long-standing partnerships with government, military-medical and international health institutions.</p>
    <div class="hero-cta">
      <a href="research.html" class="btn btn-primary btn-lg">Explore our research</a>
      <a href="partnerships.html" class="btn btn-white btn-lg">View partnerships</a>
    </div>
    <div class="hero-meta">
      <div class="stat"><div class="n">30+</div><div class="l">Years of service</div></div>
      <div class="stat"><div class="n">6</div><div class="l">Active research studies</div></div>
      <div class="stat"><div class="n">10+</div><div class="l">Institutional partners</div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="split-media reveal"><img src="assets/img/research-tablet.jpg" alt="Champions Pharmaceuticals researcher reviewing clinical data"></div>
      <div class="reveal">
        <span class="eyebrow">About Champions</span>
        <h2>A Nigerian pharmaceutical institution built on heritage and evidence</h2>
        <p class="lead">Registered on 4 June 1993, Champions Pharmaceuticals came out of a family pharmaceutical heritage that spans generations, and set out to serve Nigeria's healthcare needs with regulated, documented, quality-assured medicine.</p>
        <p>Our work today runs across three connected areas: regulated distribution, structured research and development, and public-health partnership. All of it is held to NAFDAC and Federal Ministry of Health standards.</p>
        <p style="margin-top:1.4rem"><a href="about.html" class="btn btn-ghost">Read our heritage ${ic.arrow}</a></p>
      </div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">What we do</span>
      <h2>Four connected focus areas</h2>
      <p class="lead">Structured R&amp;D methodology applied across therapeutic and scientific domains — each grounded in reproducible evidence.</p>
    </div>
    <div class="grid g4">
      <div class="card reveal"><div class="icon">${ic.dist}</div><h3>Pharmaceutical Distribution</h3><p>Regulated distribution networks ensuring safe, effective, NAFDAC-registered medicines reach healthcare institutions nationwide.</p></div>
      <div class="card reveal"><div class="icon">${ic.shield}</div><h3>Regulatory Compliance</h3><p>Strict adherence to NAFDAC standards and international pharmaceutical regulation for verifiable quality assurance.</p></div>
      <div class="card reveal"><div class="icon">${ic.hands}</div><h3>Public-Health Partnership</h3><p>Collaboration with government agencies, the military-medical corps and international bodies supporting national health goals.</p></div>
      <div class="card reveal"><div class="icon">${ic.flask}</div><h3>Research &amp; Development</h3><p>Structured investigation in oncology, regenerative medicine, haematology and global-health policy.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">Featured research</span>
      <h2>Evidence-based research initiatives</h2>
      <p class="lead">Advancing pharmaceutical science through systematic literature review, translational research and international collaboration.</p>
    </div>
    <div class="grid g3">
      <a class="mcard reveal" href="research/stem-cell.html"><div class="thumb"><img src="assets/img/stem-cell.png" alt="Stem-cell research sample"></div><div class="body"><span class="tag">Oncology · Regenerative</span><h3>Advanced Stem Cell Research &amp; Treatment Pathways</h3><p>Mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard reveal" href="research/scorpion-venom.html"><div class="thumb"><img src="assets/img/scorpion-venom.webp" alt="Scorpion, source of venom-derived peptides"></div><div class="body"><span class="tag">Oncology · Venom Pharmacology</span><h3>Pharma-Grade Scorpion Venom — Oncology Compound</h3><p>Bioactive peptides and Chlorotoxin (Tumor Paint) in cancer-selective therapeutics.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard reveal" href="research/sickle-cell.html"><div class="thumb"><img src="assets/img/res-sickle.jpg" alt="Blood samples in a haematology laboratory"></div><div class="body"><span class="tag">Haematology</span><h3>Sickle Cell Disease: From Management to Functional Cure</h3><p>Gene editing, stem-cell transplantation and disease-modifying pharmacotherapy.</p><span class="more">Read study ${ic.arrow}</span></div></a>
    </div>
    <p style="text-align:center;margin-top:2.4rem"><a href="research.html" class="btn btn-ghost btn-lg">All research programmes ${ic.arrow}</a></p>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">Newsroom</span>
      <h2>Latest from Champions</h2>
      <p class="lead">Announcements, research milestones and partnership updates from across the group.</p>
    </div>
    <div class="grid g3">
      <a class="mcard reveal" href="news.html"><div class="thumb"><img src="assets/img/cell-hood-hd.jpg" alt="Laboratory research"></div><div class="body"><span class="tag">Research</span><span class="date">18 July 2026</span><h3>Six active research programmes now published</h3><p>Evidence syntheses across oncology, regenerative medicine, haematology and global-health policy.</p><span class="more">Read more ${ic.arrow}</span></div></a>
      <a class="mcard reveal" href="programs/needleless-delivery.html"><div class="thumb"><img src="assets/img/medical-tech.webp" alt="Drug-delivery technology"></div><div class="body"><span class="tag">Programmes</span><span class="date">10 July 2026</span><h3>Advancing needleless &amp; injectable delivery</h3><p>Proposed initiatives with the Federal Ministry of Health and NPHCDA to improve access to safer therapies.</p><span class="more">Read more ${ic.arrow}</span></div></a>
      <a class="mcard reveal" href="compliance.html"><div class="thumb"><img src="assets/img/doctors-2.webp" alt="Champions scientists"></div><div class="body"><span class="tag">Regulatory</span><span class="date">2 July 2026</span><h3>Continued alignment with national health standards</h3><p>Ongoing engagement with NAFDAC and the Federal Ministry of Health across the country.</p><span class="more">Read more ${ic.arrow}</span></div></a>
    </div>
    <p style="text-align:center;margin-top:2.4rem"><a href="news.html" class="btn btn-ghost btn-lg">Visit the newsroom ${ic.arrow}</a></p>
  </div>
</section>

<section class="section-green">
  <div class="wrap">
    <div class="split">
      <div>
        <span class="eyebrow" style="color:#8fe3c2">Flagship initiative</span>
        <h2>Advancing needleless drug delivery in Nigeria</h2>
        <p class="lead" style="color:#cfe3da">A strategic initiative with the Federal Ministry of Health, NPHCDA and international partners to pioneer needleless delivery systems, support national vaccination campaigns and improve access to safer therapies nationwide.</p>
        <div class="hero-cta" style="margin-top:1.6rem">
          <a href="programs/needleless-delivery.html" class="btn btn-primary">Needleless delivery</a>
          <a href="programs/injectable-delivery.html" class="btn btn-white">Injectable delivery</a>
        </div>
      </div>
      <div class="split-media"><img src="assets/img/medical-tech.webp" alt="Advanced medical delivery technology" style="opacity:.96"></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">Trust &amp; alignment</span>
      <h2>Strategic partnerships &amp; affiliations</h2>
      <p class="lead">Building bridges across healthcare sectors through long-standing partnerships with government agencies, the military-medical corps, international organisations and regulatory bodies.</p>
    </div>
    <div class="logo-wall reveal">
      <div class="lw"><img src="assets/img/partner-fmoh.png" alt="Federal Ministry of Health"></div>
      <div class="lw"><img src="assets/img/partner-nafdac.png" alt="NAFDAC"></div>
      <div class="lw"><img src="assets/img/partner-who.png" alt="World Health Organization"></div>
      <div class="lw"><img src="assets/img/partner-army.png" alt="Nigerian Army Medical Corps"></div>
      <div class="lw"><img src="assets/img/partner-govuk.png" alt="British Government"></div>
      <div class="lw"><img src="assets/img/partner-uacn.webp" alt="UAC of Nigeria"></div>
      <div class="lw"><img src="assets/img/partner-phillips.jpg" alt="Phillips Consulting"></div>
      <div class="lw"><img src="assets/img/partner-aston.png" alt="Aston Rothbury"></div>
      <div class="lw"><img src="assets/img/partner-unilever.png" alt="Unilever heritage"></div>
      <div class="lw" style="font-family:var(--serif);color:var(--green);font-size:.95rem;text-align:center;line-height:1.2">MPSN<br><span style="font-size:.62rem;color:var(--muted);font-family:var(--sans)">Pharm. Society of Nigeria</span></div>
    </div>
    <p style="text-align:center;margin-top:2.4rem"><a href="partnerships.html" class="btn btn-ghost btn-lg">Explore all partnerships ${ic.arrow}</a></p>
  </div>
</section>

<section class="section-tint">
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow">Get in touch</span>
    <h2>Partner with Champions Pharmaceuticals</h2>
    <p class="lead">We welcome strategic dialogue with healthcare stakeholders, government agencies and international partners advancing pharmaceutical excellence and healthcare access across Nigeria.</p>
    <p style="margin-top:1.8rem"><a href="contact.html" class="btn btn-primary btn-lg">Contact our partnership team ${ic.arrow}</a></p>
  </div>
</section>
`;

write('index.html', layout({
  title: 'Champions Pharmaceuticals — Regulated Pharmaceutical Solutions for Nigeria',
  desc: 'Champions Pharmaceuticals supports Nigeria\'s healthcare infrastructure through regulated distribution, evidence-based research, and institutional partnerships since 1993.',
  active: 'index.html', body: home, page: '',
}));

/* helper for interior page banners */
function pbanner({ crumbs, h1, p, bg, prefix = '' }) {
  return `<section class="pbanner">
  <img class="pbanner-bg" src="${prefix}${bg}" alt="">
  <div class="wrap pbanner-inner">
    <div class="crumbs">${crumbs}</div>
    <h1>${h1}</h1>
    <p>${p}</p>
  </div>
</section>`;
}

/* ============================================================
   PAGE: ABOUT
   ============================================================ */
const about = pbanner({
  crumbs: '<a href="index.html">Home</a> / About',
  h1: 'A legacy forged through dedication &amp; service',
  p: 'From a documented founding vision in Nigeria’s military era to a modern institution advancing pharmaceutical excellence — our journey spans generations of service to Nigerian healthcare.',
  bg: 'assets/img/hero-lab-hd.webp',
}) + `
<section>
  <div class="wrap narrow">
    <span class="eyebrow">The founding vision</span>
    <h2>A bold move in uncertain times</h2>
    <p class="lead">Champions Pharmaceuticals was founded in 1992 and registered on 4 June 1993, during Nigeria’s military era, to close urgent gaps in pharmaceutical supply by importing documented, regulated medicine from the United Kingdom.</p>
    <p>Drawing on deep family roots in pharmacy, the company introduced a full, documented medication list to supply the Nigerian Army Medical Corps. That work was made possible through the late Honourable Lt. Colonel S.J. Bala, former Deputy Director of MPSN at the Nigerian Army Medical Corps, Bonny Camp, Victoria Island. Senior military-medical leadership called for the company’s creation, and serving Nigeria’s armed forces and national health infrastructure has been part of its purpose ever since.</p>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">A multi-generational heritage</span><h2>Principles passed through generations</h2></div>
    <div class="timeline">
      <div class="tl-item"><div class="yr">1879–1886</div><h4>United African Company &amp; Royal Niger Company</h4><p>The family’s commercial and pharmaceutical heritage traces through the United African Company (1879), National African Company (1882) and the Royal Niger Company, founded 1886 by George Taubman Goldie — enterprises that shaped Nigeria’s commercial and healthcare-supply foundations.</p></div>
      <div class="tl-item"><div class="yr">1927</div><h4>Pharmaceutical Society of Nigeria established</h4><p>The MPSN was founded to regulate professional pharmacy practice and maintain ethical standards — the professional framework Champions Pharmaceuticals proudly upholds today.</p></div>
      <div class="tl-item"><div class="yr">Mid-century</div><h4>The UAC legacy — Olayinka Mosunmola Kuti</h4><p>The founder’s late mother managed the Hospital Department at UAC of Nigeria as an A.J. Seward / Kingsway Chemist, devoting her professional life to ensuring Nigerians received the highest pharmaceutical services — the direct heritage behind Champions’ commitment to patient care.</p></div>
      <div class="tl-item"><div class="yr">1992–1993</div><h4>Champions Pharmaceuticals founded</h4><p>Founded in 1992 and officially registered on 4 June 1993 — the same year NAFDAC was established — to supply documented medications to the Nigerian Army during the military era.</p></div>
      <div class="tl-item"><div class="yr">1993</div><h4>Regulatory transformation &amp; NAFDAC</h4><p>The documented UK medication list and importation framework contributed to the wider discussions that informed pharmaceutical regulation in Nigeria as NAFDAC — the National Agency for Food &amp; Drug Administration &amp; Control — was established.</p></div>
      <div class="tl-item"><div class="yr">1999 – today</div><h4>Enduring national service</h4><p>Following Nigeria’s return to democracy, Champions has maintained partnerships with the Nigerian Army Medical Corps, the Federal Ministry of Health and international organisations — continuing a legacy of regulated distribution, research and healthcare advancement across three decades.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="split-media"><img src="assets/img/heritage-pharmacist.jpg" alt="A Champions Pharmaceuticals pharmacist in a modern Nigerian pharmacy"></div>
      <div>
        <span class="eyebrow">Proud heritage</span>
        <h2>A creation of the Pharmaceutical Society of Nigeria</h2>
        <p>Champions Pharmaceuticals grew out of the professional tradition of the Pharmaceutical Society of Nigeria, founded in 1927 to hold pharmacists to a clear ethical standard. That standard, close to a century old now, still shapes how we work: careful practice, honest documentation, and a duty to public health.</p>
        <p>Our commitment goes further than commercial success. We measure ourselves against national healthcare needs, regulatory compliance, and the pharmaceutical heritage we have carried in Nigeria for more than three decades.</p>
        <p style="margin-top:1.3rem"><a href="partnerships.html" class="btn btn-ghost">Our partnerships &amp; affiliations ${ic.arrow}</a></p>
      </div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap prose narrow">
    <span class="eyebrow">The full story</span>
    <h2 style="margin-top:.3rem">Nigeria's military era: the backdrop</h2>
    <p>Nigeria was under military rule for about 29 of the 39 years between 1966 and 1999. Successive regimes reshaped the country's political and social life, and its healthcare and pharmaceutical sectors felt the strain. The family behind Champions had long-standing medical and pharmaceutical influence and deep institutional ties, and that put the company in a position to help close urgent gaps in medication supply during an unsettled period.</p>

    <h2>How the founding fed into NAFDAC's creation</h2>
    <p>When Champions began, Nigeria's medication market was largely unregulated. There was no comprehensive government oversight of pharmaceuticals, so bringing a documented, listed set of medicines from the United Kingdom happened in a near-vacuum that was about to change. By most accounts, that documented list and its importation framework fed into the wider conversations that shaped NAFDAC, the National Agency for Food &amp; Drug Administration &amp; Control, set up in 1993 to oversee the manufacture, import, export, distribution and sale of medicines, food, cosmetics, medical devices and chemicals.</p>
    <div class="callout"><p>Champions Pharmaceuticals was registered on 4 June 1993, the same year NAFDAC was established, at a turning point for pharmaceutical regulation in Nigeria.</p></div>

    <h2>Roots in the Pharmaceutical Society of Nigeria</h2>
    <p>Champions grew directly out of the tradition of the Pharmaceutical Society of Nigeria. Founded in 1927, the Society exists to regulate practice and hold pharmacists across the country to a clear ethical standard. Nearly a century on, those values, careful practice, professional integrity and a duty to public health, still sit at the centre of how Champions works.</p>

    <h2>A heritage from the Royal Niger Company to modern Nigeria</h2>
    <p>The family's connections and its medical and pharmaceutical influence reach back through generations of Nigerian history to the Royal Niger Company. Founded in 1886 by George Taubman Goldie, it came out of the reorganisation of the National African Company (1882), which itself grew from the 1879 United African Company. These early trading firms helped lay the administrative and economic foundations of modern Nigeria and built the networks that would later support its healthcare and pharmaceutical sectors.</p>
    <p>The United Africa Company of Nigeria (UACN), a Lagos-listed company, matters to this story. The founder's late mother, Olayinka Mosunmola Kuti, ran the Hospital Department at UAC of Nigeria as an A.J. Seward / Kingsway Chemist, and gave her working life to making sure Nigerians received proper pharmaceutical care. UACN was once part of the United African Company, itself tied to Unilever Plc. After Unilever sold its stake in 1994, UACN became a fully independent, publicly quoted Nigerian company, one more step in the lineage Champions carries forward.</p>
  </div>
</section>

<section class="section-green">
  <div class="wrap narrow" style="text-align:center">
    <h2>Our enduring commitment to the Federal Republic of Nigeria</h2>
    <p class="lead" style="color:#cfe3da">Champions Pharmaceuticals continues the multi-generational legacy of service, innovation and dedication that has defined our history — delivering on our founding promise through regulated distribution, research initiatives and unwavering dedication to the health and wellbeing of all Nigerians.</p>
  </div>
</section>`;

write('about.html', layout({
  title: 'About &amp; Heritage — Champions Pharmaceuticals',
  desc: 'The heritage of Champions Pharmaceuticals — founded 1992, registered 1993 — spanning MPSN professional roots, the UAC legacy and three decades of Nigerian healthcare service.',
  active: 'about.html', body: about, page: 'about.html',
}));

/* ============================================================
   PAGE: RESEARCH HUB
   ============================================================ */
const research = pbanner({
  crumbs: '<a href="index.html">Home</a> / Research',
  h1: 'Next-generation therapeutic development',
  p: 'Advancing pharmaceutical science through structured research and development — from systematic literature review and translational research to international collaboration and regulatory science.',
  bg: 'assets/img/cell-culture-hood.jpg',
}) + `
<section>
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">R&amp;D methodology</span><h2>Structured research across four scientific domains</h2><p class="lead">A Research &amp; Development programme is a structured, systematic initiative to acquire new knowledge and develop innovative therapies. Champions applies this methodology across oncology, regenerative medicine, haematology and global-health policy — each involving genuine technical uncertainty and reproducible investigation.</p></div>
    <div class="grid g4">
      <div class="card"><div class="icon">${ic.flask}</div><h3>Oncology &amp; Cancer Therapeutics</h3><p>Our primary R&amp;D domain — tumour microenvironment dynamics, next-generation treatment strategies, and novel pharmacotherapy across haematological and solid malignancies.</p></div>
      <div class="card"><div class="icon">${ic.dna}</div><h3>Regenerative Medicine</h3><p>Translational research into mesenchymal and haematopoietic stem-cell applications, tissue repair and cellular engineering platforms.</p></div>
      <div class="card"><div class="icon">${ic.shield}</div><h3>Haematology</h3><p>Sickle cell disease management, gene-editing strategies and disease-modifying pharmacotherapy bridging symptom management and functional cure.</p></div>
      <div class="card"><div class="icon">${ic.globe}</div><h3>Global Health &amp; Policy</h3><p>Regulatory science, healthcare-infrastructure analysis and evidence-based policy frameworks addressing therapeutic access in Nigeria and emerging markets.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div>
        <span class="eyebrow">The R&amp;D programme</span>
        <h2>What a research and development programme means at Champions</h2>
        <p class="lead">An R&amp;D programme is a structured, systematic effort to build new knowledge, develop new products and services, or make real improvements to how things are done. Good R&amp;D resolves genuine scientific and technical uncertainty, and it sits at the centre of how Champions works.</p>
        <p>We run it as a continuous line of work, from the first literature review through to the point where a therapy can reach a patient. Every step is documented, reproducible, and held to NAFDAC, ISO and international standards, so the evidence stands up to outside scrutiny.</p>
      </div>
      <div class="split-media"><img src="assets/img/microscope-study.jpg" alt="Champions Pharmaceuticals laboratory research"></div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">How the work moves</span><h2>Three phases, from question to patient</h2></div>
    <div class="grid g3">
      <div class="card"><div class="icon">${ic.flask}</div><h3>1. Research</h3><p>We gather foundational knowledge through systematic scientific enquiry: literature review, laboratory investigation, hypothesis testing and evidence synthesis, so we understand the biology and the clinical basis of a disease before anything else.</p></div>
      <div class="card"><div class="icon">${ic.dna}</div><h3>2. Development</h3><p>We apply what we learn to design new therapeutic products, clinical processes and treatment pathways, turning laboratory findings into candidates ready for preclinical and clinical evaluation.</p></div>
      <div class="card"><div class="icon">${ic.shield}</div><h3>3. Refinement</h3><p>We test and refine formulations, methods and prototypes through structured trials, clinical studies and regulatory-grade validation, building the evidence needed to bring safe, effective therapies to patients.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">What defines it</span><h2>Six things that make it genuine R&amp;D</h2><p class="lead">We hold our programmes to the same criteria used to judge serious research anywhere: not activity for its own sake, but work that meets a real standard.</p></div>
    <div class="grid g3">
      <div class="card"><h4>Novelty</h4><p>Moving past what is already known rather than repeating it.</p></div>
      <div class="card"><h4>Creativity</h4><p>Original scientific thinking applied to hard problems.</p></div>
      <div class="card"><h4>Systematic method</h4><p>Structured, documented processes anyone can follow and check.</p></div>
      <div class="card"><h4>Transferability</h4><p>Findings that are shareable and reproducible by others.</p></div>
      <div class="card"><h4>Technical uncertainty</h4><p>Resolving real unknowns, where the outcome is not guaranteed.</p></div>
      <div class="card"><h4>Real-world impact</h4><p>Creating measurable value for patients and the health system.</p></div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">Research studies</span><h2>Active research programmes</h2><p class="lead">Peer-reviewed evidence syntheses and translational reviews, for research and informational purposes, grounded in reproducible scientific evidence.</p></div>
    <div class="grid g3">
      <a class="mcard" href="research/stem-cell.html"><div class="thumb"><img src="assets/img/stem-cell.png" alt="Stem-cell research sample"></div><div class="body"><span class="tag">Oncology · Regenerative</span><h3>Advanced Stem Cell Research &amp; Treatment Pathways</h3><p>Mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/scorpion-venom.html"><div class="thumb"><img src="assets/img/scorpion-venom.webp" alt="Scorpion, source of venom-derived peptides"></div><div class="body"><span class="tag">Oncology · Venom Pharmacology</span><h3>Scorpion Venom — Oncology Research Compound</h3><p>Bioactive peptides and Chlorotoxin (Tumor Paint) in cancer-selective therapeutics.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/sickle-cell.html"><div class="thumb"><img src="assets/img/res-sickle.jpg" alt="Blood samples in a haematology laboratory"></div><div class="body"><span class="tag">Haematology</span><h3>Sickle Cell: From Management to Functional Cure</h3><p>Gene editing, stem-cell transplantation and disease-modifying pharmacotherapy.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/peptide.html"><div class="thumb"><img src="assets/img/res-peptide.jpg" alt="Scientist pipetting peptide samples"></div><div class="body"><span class="tag">Peptide Therapeutics</span><h3>Bioactive Peptide Therapeutics Research Initiative</h3><p>Clinical potential, safety and translational applications of bioactive peptide compounds.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/phytocannabinoid.html"><div class="thumb"><img src="assets/img/traditional-plants.jpg" alt="Traditional medicinal plants"></div><div class="body"><span class="tag">Phytotherapeutics</span><h3>Phytocannabinoids in Traditional Nigerian Medicine</h3><p>Scientific validation of phytocannabinoids and indigenous medicine within regulatory frameworks.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/border-securitization.html"><div class="thumb"><img src="assets/img/border-security.webp" alt="Border landscape"></div><div class="body"><span class="tag">Policy &amp; Security Studies</span><h3>Border Securitization &amp; Social Construction</h3><p>Interdisciplinary analysis of contemporary border fortification and territorial governance.</p><span class="more">Read study ${ic.arrow}</span></div></a>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">How we structure R&amp;D</span><h2>From discovery to patient access</h2></div>
    <div class="grid g4">
      <div class="card"><div class="icon">${ic.flask}</div><h3>Literature review</h3><p>Systematic review of peer-reviewed research to map what is known, where the gaps are, and which questions matter most across every therapeutic area.</p></div>
      <div class="card"><div class="icon">${ic.globe}</div><h3>International collaboration</h3><p>Working with accredited laboratories, clinical research centres and global pharmaceutical partners to speed up development and strengthen our results.</p></div>
      <div class="card"><div class="icon">${ic.shield}</div><h3>Regulatory alignment</h3><p>Keeping all R&amp;D in line with NAFDAC, ISO and international standards, so the work carries the documentation needed for clinical and commercial use.</p></div>
      <div class="card"><div class="icon">${ic.hands}</div><h3>Patient access</h3><p>Turning research into real clinical pathways, physician education and access frameworks that put improvements in front of patients at scale.</p></div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="statband">
      <div><div class="n">4</div><div class="l">Active research domains</div></div>
      <div><div class="n">6</div><div class="l">Documented studies</div></div>
      <div><div class="n">NAFDAC</div><div class="l">&amp; ISO-aligned standards</div></div>
      <div><div class="n">Global</div><div class="l">Collaboration network</div></div>
    </div>
  </div>
</section>

<section class="section-green">
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow" style="color:#8fe3c2">From discovery to patient impact</span>
    <h2>Why structured R&amp;D matters</h2>
    <p class="lead" style="color:#cfe3da">For Champions Pharmaceuticals, structured R&amp;D is the engine that drives our mission — advancing innovative therapies in oncology, regenerative medicine and haematologic disease, with a specific commitment to closing treatment gaps for underserved populations in Nigeria and across Africa.</p>
    <p style="margin-top:1.6rem"><a href="contact.html" class="btn btn-primary btn-lg">Discuss research collaboration ${ic.arrow}</a></p>
  </div>
</section>`;

write('research.html', layout({
  title: 'Research — Champions Pharmaceuticals',
  desc: 'Champions Pharmaceuticals research programmes across oncology, regenerative medicine, haematology and global-health policy — evidence-based studies grounded in reproducible science.',
  active: 'research.html', body: research, page: 'research.html',
}));

/* ============================================================
   PAGE: PARTNERSHIPS  (preserve ALL partners + capabilities)
   ============================================================ */
function partner({ logo, name, since, intro, rel, caps }) {
  return `<div class="partner">
    <div class="plogo">${logo ? `<img src="assets/img/${logo}" alt="${name}">` : `<span style="font-family:var(--serif);color:var(--green);font-size:1.4rem;text-align:center">${name.split('(')[0]}</span>`}</div>
    <div>
      <h3>${name}</h3>
      <span class="since">${since}</span>
      <p>${intro}</p>
      <p>${rel}</p>
      <ul class="cap">${caps.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>
  </div>`;
}

const partners = [
  partner({ logo:'partner-army.png', name:'Nigerian Army Medical Corps (NAMC)', since:'Founding partnership · 1992',
    intro:'The Nigerian Army Medical Corps, established in 1956, provides comprehensive healthcare to Nigerian military personnel and has been instrumental in peacekeeping missions across Africa.',
    rel:'Champions Pharmaceuticals was specifically ordered for creation by senior NAMC leadership to supply documented medications from the United Kingdom during Nigeria’s military era — a founding relationship established through the late Honourable Lt. Colonel S.J. Bala, Deputy Director of MPSN at the Nigerian Army Medical Corps, Bonny Camp, Victoria Island.',
    caps:['Military pharmaceutical supply chains &amp; logistics','Emergency medical supplies for peacekeeping operations','Specialised medication procurement &amp; distribution','Healthcare-facility support across installations'] }),
  partner({ logo:'partner-nafdac.png', name:'NAFDAC — Food &amp; Drug Administration &amp; Control', since:'Registered 1993 · 30+ years of compliance',
    intro:'NAFDAC, established in January 1993, regulates the manufacturing, importation, exportation, distribution and sale of drugs, food, cosmetics, medical devices and chemicals in Nigeria.',
    rel:'Champions Pharmaceuticals was officially registered on 4 June 1993 — the same year NAFDAC was established. The documented UK medication list is understood to have contributed to the discussions that informed NAFDAC’s regulatory approach to pharmaceutical importation and quality standards.',
    caps:['Regulatory compliance &amp; standards adherence','Quality control &amp; product verification','Import documentation &amp; licensing','Pharmacovigilance &amp; adverse-event reporting'] }),
  partner({ logo:'partner-fmoh.png', name:'Federal Ministry of Health &amp; Social Welfare', since:'30+ years supporting national healthcare',
    intro:'The Federal Ministry of Health and Social Welfare leads Nigeria’s health-sector transformation — strengthening health systems, improving primary healthcare and advancing Universal Health Coverage.',
    rel:'Following Nigeria’s return to democracy in 1999, Champions has maintained continuous collaboration with the Ministry — supporting national health initiatives, public-health programmes and emergency-response efforts across successive administrations.',
    caps:['National primary-healthcare programmes &amp; supply','Emergency response &amp; disaster-relief supplies','Public-health campaign support','Healthcare-infrastructure strengthening'] }),
  partner({ logo:'partner-who.png', name:'World Health Organization (WHO) Nigeria', since:'Aligned with global health objectives',
    intro:'WHO Nigeria provides technical support for health-system strengthening, disease prevention and emergency response, advancing Universal Health Coverage and Sustainable Development Goal 3.',
    rel:'Champions Pharmaceuticals aligns its work with WHO Nigeria’s initiatives through pharmaceutical supply-chain contributions, emergency-response capabilities and participation in public–private partnerships advancing primary-healthcare revitalisation, ensuring adherence to WHO global standards.',
    caps:['Support for WHO health-facility programmes','Outbreak-response pharmaceutical supplies','Immunisation-programme logistics','Health-system capacity building'] }),
  partner({ logo:'partner-govuk.png', name:'British Government — Trade &amp; Standards', since:'UK–Nigeria pharmaceutical trade',
    intro:'A strategic relationship supporting international pharmaceutical trade, quality standards and regulatory alignment between the United Kingdom and Nigerian pharmaceutical sectors.',
    rel:'This relationship facilitated Champions’ founding mission to bring a documented list of high-quality, regulated medications from the United Kingdom to supply the Nigerian Army — demonstrating a commitment to quality standards and proper documentation.',
    caps:['UK pharmaceutical sourcing &amp; quality assurance','International regulatory-standards alignment','Cross-border trade documentation','International best-practice &amp; quality control'] }),
  partner({ logo:'partner-nafdac.png', name:'Pharmaceutical Society of Nigeria (MPSN)', since:'Member since founding · Est. 1927',
    intro:'The Pharmaceutical Society of Nigeria, established in 1927, is Nigeria’s premier professional body for pharmacists, maintaining the highest standards of professional ethics and pharmaceutical education.',
    rel:'Champions Pharmaceuticals is a proud creation under MPSN’s professional framework. Our founder’s mother, Olayinka Mosunmola Kuti, served as an A.J. Seward / Kingsway Chemist at the UAC Hospital Department, exemplifying the family’s deep MPSN heritage; our founding was facilitated through the late Lt. Colonel S.J. Bala, former Deputy Director of MPSN.',
    caps:['Professional certification &amp; continuing education','Pharmaceutical ethics standards','Industry advocacy &amp; policy development','Quality-assurance best practices'] }),
  partner({ logo:'partner-uacn.webp', name:'United Africa Company of Nigeria (UACN)', since:'Historical heritage · 1879–present',
    intro:'The United Africa Company of Nigeria — historically a subsidiary of Unilever Plc — represents a foundational connection to Champions Pharmaceuticals’ pharmaceutical heritage.',
    rel:'Olayinka Mosunmola Kuti, the founder’s late mother, played a significant role managing the Hospital Department at UACN as an A.J. Seward / Kingsway Chemist. Our family’s pharmaceutical legacy traces through the Royal Niger Company (1886), United African Company (1879) and UACN — establishing the professional foundation that led to Champions Pharmaceuticals’ creation.',
    caps:['Historical pharmaceutical supply-chain expertise','Professional standards from the UACN Hospital Dept.','A.J. Seward / Kingsway Chemist heritage','Importation &amp; quality-control legacy'] }),
  partner({ logo:'partner-unilever.png', name:'Unilever — Heritage Connection', since:'Heritage lineage via UAC',
    intro:'A global consumer-goods leader operating across health and personal-care sectors in over 190 countries, and — through UAC of Nigeria — part of Champions Pharmaceuticals’ pharmaceutical heritage.',
    rel:'UACN historically operated as part of the United African Company, itself connected to Unilever Plc. Following Unilever’s divestment of its stake in 1994, UACN transformed into an independent, publicly quoted Nigerian company — a milestone in the heritage lineage that Champions carries forward.',
    caps:['Heritage lineage &amp; professional standards','Health &amp; personal-care sector connection','International quality benchmarks','Historical distribution expertise'] }),
  partner({ logo:'partner-phillips.jpg', name:'Phillips Consulting &amp; Focus Consultancy', since:'Strategic advisory partnership',
    intro:'Strategic consultancy partnerships providing specialised expertise in pharmaceutical operations, regulatory compliance, business development and healthcare-sector advisory.',
    rel:'These partnerships enhance Champions’ operational excellence and strategic positioning in Nigeria’s pharmaceutical landscape — from market development and NAFDAC liaison to supply-chain optimisation and public–private partnership development.',
    caps:['Pharmaceutical business strategy &amp; market development','Regulatory-compliance consulting &amp; NAFDAC liaison','Operational efficiency &amp; supply-chain optimisation','Public–private partnership development'] }),
  partner({ logo:'partner-aston.png', name:'Aston Rothbury', since:'International pharmaceutical partnership',
    intro:'An international pharmaceutical and healthcare partnership providing access to global pharmaceutical markets, advanced healthcare solutions and international quality standards.',
    rel:'This partnership strengthens Champions’ capabilities in specialised pharmaceutical products and international pharmaceutical trade — expanding the product portfolio and enabling global supply-chain access.',
    caps:['International product-portfolio expansion','Global supply-chain access &amp; logistics','Advanced pharmaceutical technologies','International quality-standards implementation'] }),
];

const partnerships = pbanner({
  crumbs:'<a href="index.html">Home</a> / Partnerships',
  h1:'Strategic partnerships &amp; affiliations',
  p:'Building bridges across healthcare sectors through long-standing partnerships with government agencies, the military-medical corps, international organisations and regulatory bodies to advance pharmaceutical excellence in Nigeria.',
  bg:'assets/img/doctors-1.webp',
}) + `
<section>
  <div class="wrap">
    <div class="grid" style="gap:1.4rem">${partners.join('')}</div>
  </div>
</section>
<section class="section-tint">
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow">Work with us</span>
    <h2>Interested in partnership opportunities?</h2>
    <p class="lead">Champions Pharmaceuticals welcomes strategic partnerships that advance pharmaceutical excellence and improve healthcare access across Nigeria.</p>
    <p style="margin-top:1.6rem"><a href="contact.html" class="btn btn-primary btn-lg">Contact our partnership team ${ic.arrow}</a></p>
  </div>
</section>`;

write('partnerships.html', layout({
  title: 'Partnerships &amp; Affiliations — Champions Pharmaceuticals',
  desc: 'Champions Pharmaceuticals’ partnerships: Nigerian Army Medical Corps, NAFDAC, Federal Ministry of Health, WHO, British Government, MPSN, UACN, Phillips Consulting and Aston Rothbury.',
  active: 'partnerships.html', body: partnerships, page: 'partnerships.html',
}));

/* ============================================================
   PAGE: PRODUCTS
   ============================================================ */
const cats = [
  ['Antibiotics &amp; Anti-infectives','Comprehensive range for treating bacterial infections',[['Amoxicillin','500mg','Capsules'],['Ampicillin','250mg / 1g','Capsules / Injection'],['Chloramphenicol','250mg','Capsules / Eye Drops'],['Tetracycline','250mg','Capsules'],['Ciprofloxacin','500mg','Tablets'],['Metronidazole','200mg','Tablets'],['Erythromycin','250mg','Tablets'],['Gentamycin','80mg','Injection'],['Co-trimoxazole','480mg','Tablets']]],
  ['Analgesics &amp; Anti-inflammatories','Pain management and anti-inflammatory medication',[['Paracetamol','500mg / 120mg/5ml','Tablets / Syrup'],['Aspirin','300mg','Tablets'],['Ibuprofen','200mg / 100mg/5ml','Tablets / Syrup'],['Diclofenac','50mg','Tablets'],['Piroxicam','20mg','Capsules']]],
  ['Vitamins &amp; Supplements','Essential vitamins and nutritional supplements',[['Vitamin C / Ascorbic Acid','100mg','Tablets'],['Vitamin B Complex / B1 / B6 / B12','—','Tablets / Injection'],['Folic Acid','5mg','Tablets'],['Calcium Lactate','300mg','Tablets'],['Ferrous Sulphate / Iron Dextran','200mg','Tablets / Injection'],['Multivitamin','—','Syrup']]],
  ['Gastrointestinal','Treatments for digestive-system disorders',[['Omeprazole','20mg','Capsules'],['Ranitidine','150mg','Tablets'],['Magnesium Trisilicate','—','Tablets'],['Metoclopramide','10mg','Tablets'],['Loperamide','2mg','Capsules'],['ORS Sachets','—','Powder']]],
  ['Cardiovascular &amp; Antihypertensives','Medications for heart and blood-pressure management',[['Amlodipine','5mg','Tablets'],['Nifedipine','20mg','Tablets'],['Atenolol','50mg','Tablets'],['Methyldopa','250mg','Tablets'],['Furosemide','40mg','Tablets'],['Digoxin','0.25mg','Tablets']]],
  ['Antimalarial &amp; Antiparasitic','Treatments for malaria and parasitic infections',[['Artemether / Lumefantrine','20/120mg','Tablets'],['Artesunate','50mg','Tablets'],['Chloroquine','250mg','Tablets'],['Quinine','300mg','Tablets'],['Albendazole','400mg','Tablets'],['Ivermectin','3mg','Tablets']]],
  ['Endocrine &amp; Hormonal','Hormonal medications and endocrine treatments',[['Insulin (Soluble / Lente)','—','Injection'],['Glibenclamide','5mg','Tablets'],['Metformin','500mg','Tablets'],['Prednisolone','5mg','Tablets'],['Hydrocortisone','100mg','Injection'],['Levothyroxine','100mcg','Tablets']]],
  ['Respiratory','Treatments for respiratory conditions',[['Salbutamol','2mg / 100mcg','Tablets / Inhaler'],['Aminophylline','100mg','Tablets'],['Beclomethasone','—','Inhaler'],['Cetirizine','10mg','Tablets'],['Chlorpheniramine','4mg','Tablets']]],
  ['Vaccines &amp; Immunologicals','Vaccines and immunological products',[['Tetanus Toxoid','0.5ml','Injection'],['BCG Vaccine','—','Injection'],['Hepatitis B Vaccine','—','Injection'],['Polio Vaccine','—','Oral'],['DPT Vaccine','—','Injection'],['Measles / Yellow Fever','—','Injection']]],
  ['Dermatologicals','Creams, ointments and skin treatments',[['Betamethasone','0.1%','Cream'],['Hydrocortisone','1%','Cream'],['Clotrimazole / Miconazole','1% / 2%','Cream'],['Silver Sulfadiazine','1%','Cream'],['Benzoyl Peroxide','5%','Gel'],['Calamine','—','Lotion']]],
];
const portfolio = cats.map(([name,desc,rows]) => `<details class="pcat"><summary>${name}<span class="caret">${ic.arrow.replace('M5 12h14M13 6l6 6-6 6','M6 9l6 6 6-6')}</span></summary><div class="plist"><p class="muted" style="font-size:.9rem;margin:.4rem 0 1rem">${desc}</p><table>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted">${r[2]}</td></tr>`).join('')}</table></div></details>`).join('');

const products = pbanner({
  crumbs:'<a href="index.html">Home</a> / Products',
  h1:'Our pharmaceutical portfolio',
  p:'A comprehensive range of NAFDAC-registered pharmaceutical products serving Nigeria’s healthcare needs — spanning anti-infectives, analgesics, cardiovascular, antimalarials, vaccines and more.',
  bg:'assets/img/ampoule-line.webp',
}) + `
<section>
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">Product categories</span><h2>Ten therapeutic categories</h2><p class="lead">All products listed are registered with NAFDAC and comply with Nigerian pharmaceutical regulations. This information is intended for healthcare professionals and institutional partners.</p></div>
    <div class="field" style="max-width:440px;margin-bottom:1.6rem"><label for="product-filter">Find a product</label><input id="product-filter" type="search" placeholder="Search by name or category…" autocomplete="off" spellcheck="false"></div>
    <div class="portfolio">${portfolio}</div>
    <div class="prose" style="max-width:100%;margin-top:2rem"><div class="callout"><p><strong>For healthcare professionals &amp; institutions.</strong> Product availability, pack sizes and specifications are provided on enquiry. All items are NAFDAC-registered and distributed in compliance with Nigerian pharmaceutical regulation.</p></div></div>
    <p style="margin-top:1.6rem"><a href="contact.html" class="btn btn-primary">Request product information ${ic.arrow}</a></p>
  </div>
</section>`;

write('products.html', layout({
  title:'Product Portfolio — Champions Pharmaceuticals',
  desc:'NAFDAC-registered pharmaceutical portfolio from Champions Pharmaceuticals across ten therapeutic categories — for healthcare professionals and institutional partners.',
  active:'products.html', body:products, page:'products.html',
}));

/* ============================================================
   PAGE: CONTACT
   ============================================================ */
const contact = pbanner({
  crumbs:'<a href="index.html">Home</a> / Contact',
  h1:'Contact Champions Pharmaceuticals',
  p:'For institutional, regulatory, research and partnership enquiries. We welcome strategic dialogue with healthcare stakeholders, government agencies and international partners.',
  bg:'assets/img/research-tablet.jpg',
}) + `
<section>
  <div class="wrap">
    <div class="split">
      <div>
        <span class="eyebrow">Get in touch</span>
        <h2>Partnership &amp; institutional enquiries</h2>
        <p class="lead">Whether you represent a government agency, healthcare institution, research partner or international organisation, our team welcomes the conversation.</p>
        <ul class="flist" style="margin-top:1.6rem">
          <li><strong>Email</strong> — <a href="mailto:contact@championspharmaceuticals.com">contact@championspharmaceuticals.com</a></li>
          <li><strong>Phone</strong> — <a href="tel:+2347070320052">+234 707 032 0052</a></li>
          <li><strong>Registered office</strong> — Lagos, Nigeria</li>
          <li><strong>Enquiries</strong> — Partnerships · Research · Products · Distribution</li>
        </ul>
      </div>
      <div class="card" style="padding:2rem">
        <form id="enquiry-form" class="form-grid" novalidate>
          <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
          <input type="hidden" name="subject" value="New website enquiry — Champions Pharmaceuticals">
          <input type="hidden" name="from_name" value="Champions Pharmaceuticals website">
          <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" required></div>
          <div class="field"><label for="f-org">Organisation</label><input id="f-org" name="org" autocomplete="organization"></div>
          <div class="field"><label for="f-type">Enquiry type</label><select id="f-type" name="type"><option>Partnership</option><option>Research collaboration</option><option>Product information</option><option>Distribution</option><option>General</option></select></div>
          <div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="4" required></textarea></div>
          <button class="btn btn-primary btn-lg" type="submit">Send enquiry ${ic.arrow}</button>
          <p class="form-note" role="status" aria-live="polite" data-local="Thank you. Your enquiry has been recorded. Connect the email service to start receiving submissions." data-success="Thank you. Your enquiry has been sent; our team will be in touch.">Thank you. Your enquiry has been recorded.</p>
        </form>
      </div>
    </div>
  </div>
</section>`;

write('contact.html', layout({
  title:'Contact — Champions Pharmaceuticals',
  desc:'Contact Champions Pharmaceuticals for institutional, regulatory, research and partnership enquiries. Lagos, Nigeria.',
  active:'contact.html', body:contact, page:'contact.html',
}));

/* ============================================================
   PAGE: CAREERS
   ============================================================ */
const careerAreas = [
  [ic.dist, 'Distribution &amp; Supply Chain', 'Moving NAFDAC-registered medicines safely and on time, from warehousing and logistics to inventory and last-mile delivery across the country.'],
  [ic.flask, 'Research &amp; Development', 'Literature review, evidence synthesis and translational research across oncology, regenerative medicine, haematology and global-health policy.'],
  [ic.shield, 'Clinical &amp; Regulatory Affairs', 'Quality assurance, pharmacovigilance, documentation and regulatory liaison that keep every product and programme compliant.'],
  [ic.hands, 'Community Health &amp; Field Programmes', 'Field roles that connect our public-health programmes to clinics, hospitals and communities that need safer access to care.'],
  [ic.globe, 'Operations &amp; Quality', 'Programme management, procurement, standards and the day-to-day systems that let regulated work run reliably at scale.'],
  [ic.chain, 'Corporate, Finance &amp; Administration', 'Finance, people, partnerships and administration, the backbone that lets our clinical and distribution teams do their best work.'],
];

const careers = pbanner({
  crumbs:'<a href="index.html">Home</a> / Careers',
  h1:'Build Nigeria&rsquo;s pharmaceutical future with us',
  p:'We are creating skilled, meaningful work across pharmaceutical distribution, research and community health, and investing in the Nigerian talent that will carry it forward.',
  bg:'assets/img/careers-team.jpg',
}) + `
<section>
  <div class="wrap narrow">
    <span class="eyebrow">Why Champions</span>
    <h2>Work that reaches real communities</h2>
    <p class="lead">A career here is a chance to help strengthen how an entire country accesses safe, effective medicine. Our teams work at the point where regulated pharmaceutical supply, evidence-based research and public-health partnership meet.</p>
    <p>We are a Nigerian institution with more than three decades of service, and we are growing. As our distribution network and our partnership programmes expand, so does the need for skilled, motivated people who want their work to matter.</p>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">Where we hire</span><h2>Six areas we build careers across</h2><p class="lead">Whatever your background, there is likely a place for your skills in our work. These are the broad areas we recruit and develop people in.</p></div>
    <div class="grid g3">
      ${careerAreas.map(([icon, name, desc]) => `<div class="card"><div class="icon">${icon}</div><h3>${name}</h3><p>${desc}</p></div>`).join('')}
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="split-media"><img src="assets/img/careers-training.jpg" alt="Experienced scientist mentoring a colleague in the laboratory"></div>
      <div>
        <span class="eyebrow">Training &amp; development</span>
        <h2>We train the people we hire</h2>
        <p class="lead">You do not need to arrive with every skill. A large part of our work is building local capacity, so we invest in structured training, mentorship and on-the-job development.</p>
        <p>As our pilot programmes with the Federal Ministry of Health and international partners move forward, they are expected to open new roles in logistics, clinical support, quality and community health, and we intend to train Nigerians to fill them. Skills built here stay in the country and strengthen its wider health system.</p>
      </div>
    </div>
  </div>
</section>

<section class="section-green">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow" style="color:#8fe3c2">What this means for Nigeria</span><h2>Jobs, skills and healthcare that stay local</h2><p class="lead" style="color:#cfe3da">Every role we create is also an investment in the country. Our growth is designed to leave lasting value behind.</p></div>
    <div class="grid g4">
      <div class="card" style="background:transparent;border-color:rgba(255,255,255,.16)"><h4 style="color:#fff">Job creation</h4><p style="color:#cfe3da">Skilled, regulated employment for the Nigerian public as distribution and programmes scale.</p></div>
      <div class="card" style="background:transparent;border-color:rgba(255,255,255,.16)"><h4 style="color:#fff">Skills transfer</h4><p style="color:#cfe3da">Training and mentorship that build pharmaceutical and clinical expertise that remains in-country.</p></div>
      <div class="card" style="background:transparent;border-color:rgba(255,255,255,.16)"><h4 style="color:#fff">Healthcare access</h4><p style="color:#cfe3da">Work that helps safer, more reliable medicine reach clinics and communities nationwide.</p></div>
      <div class="card" style="background:transparent;border-color:rgba(255,255,255,.16)"><h4 style="color:#fff">Local capacity</h4><p style="color:#cfe3da">Stronger domestic pharmaceutical infrastructure and a healthier contribution to the economy.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split rev">
      <div class="split-media"><img src="assets/img/careers-team.jpg" alt="A team of young Nigerian professionals"></div>
      <div>
        <span class="eyebrow">Register your interest</span>
        <h2>Send us your CV</h2>
        <p class="lead">We are always glad to hear from talented people. Share a little about yourself and attach your CV, and our team will reach out when a suitable role opens.</p>
        <form id="careers-form" class="form-grid" enctype="multipart/form-data" novalidate>
          <input type="hidden" name="access_key" value="YOUR_WEB3FORMS_ACCESS_KEY">
          <input type="hidden" name="subject" value="New career application — Champions Pharmaceuticals website">
          <input type="hidden" name="from_name" value="Champions Pharmaceuticals careers">
          <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="field"><label for="c-name">Full name</label><input id="c-name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" inputmode="email" autocomplete="email" spellcheck="false" required></div>
          <div class="field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>
          <div class="field"><label for="c-area">Area of interest</label><select id="c-area" name="area"><option>Distribution &amp; Supply Chain</option><option>Research &amp; Development</option><option>Clinical &amp; Regulatory Affairs</option><option>Community Health &amp; Field Programmes</option><option>Operations &amp; Quality</option><option>Corporate, Finance &amp; Administration</option><option>Other</option></select></div>
          <div class="field"><label for="c-cv">Your CV <span class="muted" style="font-weight:400">(PDF or Word, up to 5&nbsp;MB)</span></label><input id="c-cv" name="attachment" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
          <div class="field"><label for="c-msg">A short message</label><textarea id="c-msg" name="message" rows="4" placeholder="Tell us a little about your experience and what you are looking for…"></textarea></div>
          <button class="btn btn-primary btn-lg" type="submit">Submit application ${ic.arrow}</button>
          <p class="form-note" role="status" aria-live="polite" data-local="Thank you. Your application has been received. Connect the email service to start receiving CVs by email." data-success="Thank you. Your application and CV have been sent; our team will be in touch.">Thank you. Your application has been received.</p>
        </form>
      </div>
    </div>
  </div>
</section>`;

write('careers.html', layout({
  title:'Careers — Champions Pharmaceuticals',
  desc:'Build a career with Champions Pharmaceuticals. Skilled roles across distribution, research, clinical, community health and operations, with training for Nigerian talent and lasting benefit to the country.',
  active:'careers.html', body:careers, page:'careers.html',
}));

/* ============================================================
   PAGE: COMPLIANCE
   ============================================================ */
const compliance = pbanner({
  crumbs:'<a href="index.html">Home</a> / Compliance',
  h1:'Governance, compliance &amp; regulatory standards',
  p:'Our commitment to regulatory responsibility, safety protocols and structured oversight ensures every aspect of our operations meets the highest institutional standards.',
  bg:'assets/img/cell-culture-hood.jpg',
}) + `
<section>
  <div class="wrap narrow prose">
    <span class="eyebrow">Our commitment</span>
    <h2>Regulatory responsibility at every level</h2>
    <p>Champions Pharmaceuticals maintains strict adherence to regulatory standards established since our registration in 1993. We work closely with regulatory bodies to maintain compliance and support public-health objectives across Nigeria.</p>
    <div class="callout"><p>All pharmaceutical products distributed by Champions Pharmaceuticals are registered with NAFDAC and comply with Nigerian pharmaceutical regulation. Product information is intended for healthcare professionals and institutional partners.</p></div>
    <h3>Quality assurance</h3>
    <ul>
      <li>NAFDAC-aligned quality assurance across the distribution chain</li>
      <li>Documented safety protocols and standard operating procedures</li>
      <li>Import documentation, licensing and product-verification systems</li>
      <li>Pharmacovigilance and adverse-event reporting</li>
    </ul>
    <h3>Research integrity</h3>
    <ul>
      <li>Research materials are provided for scientific and informational purposes and reflect evidence-based literature review</li>
      <li>Champions Pharmaceuticals maintains strict evidence-based standards in all patient guidance and does not endorse unregulated products</li>
      <li>All R&amp;D activities are conducted in alignment with NAFDAC, ISO and applicable international regulatory standards</li>
    </ul>
    <h3>Nationwide scope</h3>
    <p>This information — including product information — is intended only for residents of Nigeria. Products may have different labelling in other countries.</p>
  </div>
</section>
<section class="section-green">
  <div class="wrap narrow" style="text-align:center">
    <h2>Questions about our compliance framework?</h2>
    <p class="lead" style="color:#cfe3da">Our team is available to discuss regulatory alignment, quality assurance and institutional standards.</p>
    <p style="margin-top:1.5rem"><a href="contact.html" class="btn btn-primary btn-lg">Contact us ${ic.arrow}</a></p>
  </div>
</section>`;

write('compliance.html', layout({
  title:'Compliance &amp; Regulatory — Champions Pharmaceuticals',
  desc:'Champions Pharmaceuticals’ governance, compliance and regulatory framework — NAFDAC-aligned quality assurance, pharmacovigilance and research integrity.',
  active:'', body:compliance, page:'compliance.html',
}));

/* ============================================================
   SUBPAGES (research/ + programs/) — prefix '../'
   ============================================================ */
function subBanner({ crumbs, h1, p, bg, chips }) {
  return `<section class="pbanner">
  <img class="pbanner-bg" src="../${bg}" alt="">
  <div class="wrap pbanner-inner">
    <div class="crumbs">${crumbs}</div>
    <h1>${h1}</h1>
    <p>${p}</p>
    ${chips ? `<div class="chips">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>` : ''}
  </div>
</section>`;
}
function studyPage({ file, digest, title, desc, crumbs, h1, bg, chipsExtra = [] }) {
  const { chips, intro, html } = digestToHtml(digest);
  const allChips = [...chipsExtra, ...chips];
  const body = subBanner({ crumbs, h1, p: intro, bg, chips: allChips }) +
`<section><div class="wrap prose narrow">
${html}
  <div class="callout" style="margin-top:2.4rem"><p><strong>Research &amp; informational use.</strong> This material is a scientific literature review provided for research and informational purposes. It does not constitute medical advice or an offer of treatment. Champions Pharmaceuticals maintains strict evidence-based standards in all guidance.</p></div>
  <p style="margin-top:2rem"><a href="../research.html" class="btn btn-ghost">${ic.arrow.replace('M5 12h14M13 6l6 6-6 6','M19 12H5M11 6l-6 6 6 6')} All research</a> &nbsp; <a href="../contact.html" class="btn btn-primary">Discuss this research ${ic.arrow}</a></p>
</div></section>`;
  write('research/' + file, layout({ title, desc, active: 'research.html', body, prefix: '../', page: 'research/' + file }));
}

/* ---- Research studies — FULL content rendered from source digests ---- */
studyPage({ file:'scorpion-venom.html', digest:'study-scorpion',
  title:'Scorpion Venom — Oncology Research Compound · Champions Pharmaceuticals',
  desc:'A clinical and scientific review of scorpion venom-derived peptides in oncology — Chlorotoxin (Tumor Paint), ion-channel pharmacology and cancer-selective mechanisms.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Scorpion Venom',
  h1:'Scorpion venom-derived peptides: emerging therapeutic potential in oncology',
  bg:'assets/img/scorpion-venom.webp' });

studyPage({ file:'stem-cell.html', digest:'study-stem',
  title:'Advanced Stem Cell Research & Treatment Pathways · Champions Pharmaceuticals',
  desc:'Mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine — CAR-T immunotherapy, stem-cell mobilisation and regenerative approaches.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Stem Cell',
  h1:'Advanced stem cell research & treatment pathways',
  bg:'assets/img/cell-hood-hd.jpg' });

studyPage({ file:'sickle-cell.html', digest:'study-sickle',
  title:'Sickle Cell Disease: From Management to Functional Cure · Champions Pharmaceuticals',
  desc:'The evolving therapeutic landscape of sickle cell disease — disease-modifying pharmacotherapy, stem-cell transplantation and CRISPR-based gene editing, with a focus on global equity.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Sickle Cell',
  h1:'Sickle cell disease: from symptom management to functional cure',
  bg:'assets/img/doctors-1.webp' });

studyPage({ file:'peptide.html', digest:'study-peptide',
  title:'Bioactive Peptide Therapeutics Research Initiative · Champions Pharmaceuticals',
  desc:'Clinical potential, safety and translational applications of bioactive peptide compounds in oncology, regenerative medicine and metabolic health.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Bioactive Peptides',
  h1:'Bioactive peptide therapeutics research initiative',
  bg:'assets/img/peptide.jpg' });

studyPage({ file:'phytocannabinoid.html', digest:'study-cannabinoid',
  title:'Phytocannabinoids in Traditional Nigerian Medicine · Champions Pharmaceuticals',
  desc:'Scientific validation of phytocannabinoids, terpenes and indigenous medicine within international regulatory frameworks.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Phytocannabinoids',
  h1:'Phytocannabinoids & terpenes in traditional Nigerian medicine',
  bg:'assets/img/traditional-plants.jpg' });

studyPage({ file:'border-securitization.html', digest:'study-border',
  title:'Border Securitization & Social Construction · Champions Pharmaceuticals',
  desc:'An interdisciplinary investigation into contemporary border fortification — securitization theory, social construction and the human dimensions of borderland communities.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Border Studies',
  h1:'Border securitization & the social construction of territory',
  bg:'assets/img/border-security.webp' });


/* ---- Program pages ---- */
function programPage({ file, title, desc, crumbs, h1, intro, bg, chips, prose }) {
  const body = subBanner({ crumbs, h1, p: intro, bg, chips }) +
`<section><div class="wrap prose narrow">${prose}
  <div class="callout" style="margin-top:2.4rem"><p><strong>Proposed partnership initiative.</strong> The programmes described are proposed initiatives supporting national healthcare objectives, subject to relevant regulatory approvals. Champions Pharmaceuticals welcomes strategic dialogue with healthcare stakeholders and government agencies.</p></div>
  <p style="margin-top:2rem"><a href="../partnerships.html" class="btn btn-ghost">Our partnerships</a> &nbsp; <a href="../contact.html" class="btn btn-primary">Contact our partnership team ${ic.arrow}</a></p>
</div></section>`;
  write('programs/' + file, layout({ title, desc, active: '', body, prefix: '../', page: 'programs/' + file }));
}

programPage({
  file:'needleless-delivery.html',
  title:'Advancing Needleless Drug Delivery in Nigeria · Champions Pharmaceuticals',
  desc:'A strategic partnership initiative with the Federal Ministry of Health, NPHCDA and international partners to pioneer needleless drug delivery systems across Nigeria.',
  crumbs:'<a href="../index.html">Home</a> / Programmes / Needleless Delivery',
  h1:'Advancing needleless drug delivery in Nigeria',
  intro:'A strategic opportunity for partnership — pioneering needleless drug-delivery systems, supporting national vaccination campaigns and improving access to safer, more efficient therapies nationwide.',
  bg:'assets/img/medical-tech.webp',
  chips:['NPHCDA &amp; Federal Ministry of Health','WHO-aligned','International Partners','Proposed Initiative'],
  prose:`<h2>The next evolution in drug delivery</h2>
<p>Needleless drug delivery represents the next evolution in modern medicine — a safe, efficient and patient-friendly alternative to traditional injections. These technologies deliver medication through jet injectors, transdermal systems, inhalation and microneedle patches, eliminating conventional needles while still providing rapid, precise delivery. They reduce risks associated with needle use — infections, needle-stick injuries and improper disposal — and improve patient compliance, particularly among populations with needle aversion.</p>
<h3>Why it matters for Nigeria</h3>
<p>With an estimated 80,000 people who inject drugs (PWID) in Nigeria, needleless systems present an opportunity to reduce needle-related harm and disease transmission, support harm-reduction strategies, and improve public-health safety through reduced needle circulation. Needleless insulin delivery can improve adherence for patients requiring daily treatment; needleless vaccine delivery can enhance immunisation coverage by simplifying administration and improving safety during mass campaigns.</p>
<h3>Alignment with national health programmes</h3>
<p>Champions Pharmaceuticals proposes to support Nigeria’s healthcare modernisation by aligning with initiatives led by the National Primary Health Care Development Agency (NPHCDA) — including national immunisation programmes, vaccine-preventable disease control and expanding access to primary healthcare.</p>
<h3>Proposed initiatives</h3>
<ul>
<li>Initiate a pilot programme with the Ministry of Health through international partners, following required regulatory approvals including FDA authorisation for applicable needleless technologies.</li>
<li>Provide needleless drug-delivery equipment and infrastructure, programme logistics and supply-chain coordination, and technical support in collaboration with NPHCDA.</li>
<li>Expand access to innovative needleless therapies through integration with international health programmes.</li>
<li>Deliver cost-effective, scalable solutions that make needleless therapies accessible to facilities nationwide.</li>
</ul>
<h3>A transformational opportunity</h3>
<p>By reducing risks, improving patient compliance and enhancing the scalability of treatment and vaccination programmes, needleless delivery complements and strengthens existing healthcare infrastructure. Through collaboration with the Federal Ministry of Health, the NPHCDA and global partners, Champions Pharmaceuticals is positioned to support Nigeria in adopting safer, more efficient drug-delivery systems. This initiative aligns with global public-health priorities supported by the World Health Organization.</p>`,
});

programPage({
  file:'injectable-delivery.html',
  title:'Advancing Injectable Drug Delivery in Nigeria · Champions Pharmaceuticals',
  desc:'A strategic partnership initiative to strengthen injectable medicine delivery across Nigeria — aligned with the Federal Ministry of Health, NPHCDA and international health partners.',
  crumbs:'<a href="../index.html">Home</a> / Programmes / Injectable Delivery',
  h1:'Advancing injectable drug delivery in Nigeria',
  intro:'A strategic opportunity for partnership — strengthening injectable medicine delivery, supporting national immunisation and improving access to critical injectable therapies nationwide.',
  bg:'assets/img/ampoule-line.webp',
  chips:['NPHCDA &amp; Federal Ministry of Health','WHO &amp; Global Health Partners','Aligned with National Programmes','Proposed Initiative'],
  prose:`<h2>The role of injectable delivery in modern medicine</h2>
<p>Needle-based injection remains one of the most reliable and widely used methods of drug delivery. Injectable administration provides a direct, rapid and precise route — bypassing the digestive system where many drugs are degraded or poorly absorbed — ensuring the full therapeutic dose reaches the bloodstream or target tissue. Because injections can deliver almost any molecule, including large-molecule biologics, vaccines, hormones and emergency medications, they remain a cornerstone of global public-health programmes.</p>
<h3>Importance of injectable therapies</h3>
<ul>
<li>Many diabetes patients require daily insulin injections to regulate blood glucose; reliable injectable delivery is essential for chronic-disease care.</li>
<li>Injectable medications such as pentazocine, tramadol, codeine and morphine are essential in hospital and emergency settings for effective pain relief.</li>
<li>Critical vaccines including polio, measles and rubella are administered by injection and remain essential for disease prevention and eradication.</li>
</ul>
<h3>Alignment with national health programmes</h3>
<p>Champions Pharmaceuticals proposes to support Nigeria’s healthcare objectives by aligning with national vaccination and public-health initiatives coordinated by the NPHCDA — national immunisation programmes, vaccine-preventable disease control and expanding access to primary healthcare. Nigeria’s estimated 80,000 PWID highlight the importance of structured, safe and regulated injection practices within healthcare and harm-reduction programmes.</p>
<h3>Proposed initiatives</h3>
<ul>
<li>Initiate a pilot programme with the Ministry of Health through its international partner Cannopharma (Germany) once relevant regulatory approvals, including FDA authorisation for applicable products, are obtained.</li>
<li>Provide operational and programme-management support, including medical equipment and injection-delivery infrastructure, logistics and supply-chain coordination with NPHCDA.</li>
<li>Expand access to life-saving injectable medicines through integration with international pharmaceutical supply networks and aid programmes.</li>
<li>Deliver cost-effective pharmaceutical supply solutions that make essential injectable medicines more accessible to healthcare facilities nationwide.</li>
</ul>
<h3>Strengthening Nigeria’s healthcare future</h3>
<p>Through collaboration with the Federal Ministry of Health, the NPHCDA and international health partners, Champions Pharmaceuticals aims to strengthen injectable-medicine delivery programmes and improve access to critical therapies nationwide. Champions’ efforts align with the public-health objectives supported by the World Health Organization and other international health partners.</p>`,
});

/* ============================================================
   PAGE: NEWSROOM
   ============================================================ */
const news = pbanner({
  crumbs:'<a href="index.html">Home</a> / Newsroom',
  h1:'Newsroom',
  p:'Corporate announcements, regulatory updates and partnership milestones from Champions Pharmaceuticals.',
  bg:'assets/img/research-tablet.jpg',
}) + `
<section>
  <div class="wrap">
    <article class="feature reveal">
      <div class="fmedia"><img src="assets/img/heritage-pharmacist.jpg" alt="Champions Pharmaceuticals pharmacist in a modern Nigerian pharmacy"></div>
      <div class="fbody">
        <span class="lead-label">Featured · Corporate</span>
        <h2>Champions Pharmaceuticals modernises its digital presence</h2>
        <p class="lead">A refreshed, independent corporate platform brings our research programmes, product portfolio and institutional partnerships together in one place, built for the institutions and partners we work with.</p>
        <span class="date">22 July 2026</span>
        <p style="margin-top:1rem"><a href="about.html" class="btn btn-primary">Read more ${ic.arrow}</a></p>
      </div>
    </article>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">More updates</span><h2>Announcements &amp; milestones</h2></div>
    <div class="grid g3">
      <article class="mcard reveal"><div class="thumb"><img src="assets/img/cell-hood-hd.jpg" alt="Laboratory research at Champions Pharmaceuticals"></div><div class="body"><span class="tag">Research</span><span class="date">18 July 2026</span><h3>Six active research programmes now published</h3><p>Full evidence syntheses across oncology, regenerative medicine, haematology and global-health policy are now available in our research library.</p><a class="more" href="research.html">Explore research ${ic.arrow}</a></div></article>
      <article class="mcard reveal"><div class="thumb"><img src="assets/img/medical-tech.webp" alt="Advanced drug-delivery technology"></div><div class="body"><span class="tag">Programmes</span><span class="date">10 July 2026</span><h3>Advancing needleless &amp; injectable delivery in Nigeria</h3><p>Proposed initiatives with the Federal Ministry of Health and NPHCDA to strengthen delivery infrastructure and improve access to safer therapies.</p><a class="more" href="programs/needleless-delivery.html">View programme ${ic.arrow}</a></div></article>
      <article class="mcard reveal"><div class="thumb"><img src="assets/img/doctors-2.webp" alt="Champions Pharmaceuticals scientists at work"></div><div class="body"><span class="tag">Regulatory</span><span class="date">2 July 2026</span><h3>Continued alignment with national health standards</h3><p>Ongoing engagement with NAFDAC and the Federal Ministry of Health to support compliance and public-health objectives nationwide.</p><a class="more" href="compliance.html">Compliance ${ic.arrow}</a></div></article>
      <article class="mcard reveal"><div class="thumb"><img src="assets/img/microscope-study.jpg" alt="Scientist at a microscope"></div><div class="body"><span class="tag">Partnerships</span><span class="date">24 June 2026</span><h3>Strengthening healthcare-infrastructure partnerships</h3><p>Collaborative work with government agencies, the military-medical corps and international organisations to improve access to safe, effective medicines.</p><a class="more" href="partnerships.html">Our partners ${ic.arrow}</a></div></article>
      <article class="mcard reveal"><div class="thumb"><img src="assets/img/cell-culture-hood.jpg" alt="Laboratory quality-assurance environment"></div><div class="body"><span class="tag">Governance</span><span class="date">12 June 2026</span><h3>Governance built for institutional trust</h3><p>Structured oversight and documented processes across distribution, research and partnership, held to NAFDAC and Federal Ministry of Health standards.</p><a class="more" href="governance.html">Our governance ${ic.arrow}</a></div></article>
      <article class="mcard reveal"><div class="thumb"><img src="assets/img/hero-lab-hd.webp" alt="Champions Pharmaceuticals laboratory"></div><div class="body"><span class="tag">Heritage</span><span class="date">Since 1993</span><h3>Three decades of service to Nigerian healthcare</h3><p>From a documented founding vision in Nigeria's military era to a modern institution advancing pharmaceutical excellence and research.</p><a class="more" href="about.html">Our heritage ${ic.arrow}</a></div></article>
    </div>
    <div class="prose" style="max-width:100%;margin-top:2.4rem"><div class="callout"><p><strong>Media &amp; press enquiries.</strong> For interviews, statements or further information, contact our team at <a href="mailto:contact@championspharmaceuticals.com">contact@championspharmaceuticals.com</a>.</p></div>
  </div>
</section>`;

write('news.html', layout({
  title:'Newsroom — Champions Pharmaceuticals',
  desc:'Corporate announcements, regulatory updates and partnership milestones from Champions Pharmaceuticals.',
  active:'news.html', body:news, page:'news.html',
}));

/* ============================================================
   PAGE: LEADERSHIP & GOVERNANCE
   ============================================================ */
const governance = pbanner({
  crumbs:'<a href="index.html">Home</a> / Governance',
  h1:'Leadership &amp; governance',
  p:'Structured oversight, institutional accountability and regulatory responsibility across every part of our operations.',
  bg:'assets/img/cell-hood-hd.jpg',
}) + `
<section>
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">How we operate</span><h2>Governance built for institutional trust</h2><p class="lead">Champions Pharmaceuticals operates as a Nigerian pharmaceutical group across regulated distribution, research and development, and public-health partnership — each held to documented standards and regulatory oversight.</p></div>
    <div class="grid g3">
      <div class="card"><div class="icon">${ic.shield}</div><h3>Regulatory responsibility</h3><p>NAFDAC-aligned quality assurance and compliance embedded across the distribution chain and every research activity.</p></div>
      <div class="card"><div class="icon">${ic.hands}</div><h3>Institutional accountability</h3><p>Structured oversight and documented processes, with engagement across government, military-medical and international health bodies.</p></div>
      <div class="card"><div class="icon">${ic.flask}</div><h3>Research integrity</h3><p>Evidence-based standards, reproducible methodology and alignment with NAFDAC, ISO and international regulatory frameworks.</p></div>
    </div>
  </div>
</section>
<section class="section-tint">
  <div class="wrap prose narrow">
    <h2>Our operating structure</h2>
    <p>The group's work spans three connected mandates — regulated pharmaceutical distribution, structured research and development, and public-health partnership. Each mandate operates under documented governance and regulatory alignment, ensuring accountability from procurement through to patient access.</p>
    <ul>
      <li><strong>Distribution &amp; supply</strong> — regulated networks delivering NAFDAC-registered medicines to healthcare institutions nationwide.</li>
      <li><strong>Research &amp; development</strong> — structured investigation across oncology, regenerative medicine, haematology and global-health policy.</li>
      <li><strong>Partnership &amp; public health</strong> — collaboration with government agencies, the military-medical corps and international organisations.</li>
    </ul>
    <div class="callout"><p><strong>Leadership enquiries.</strong> Details of our leadership and governance structure are available to verified institutional and investment partners on request via <a href="contact.html">our contact team</a>.</p></div>
  </div>
</section>`;

write('governance.html', layout({
  title:'Leadership &amp; Governance — Champions Pharmaceuticals',
  desc:'Governance, institutional accountability and regulatory responsibility at Champions Pharmaceuticals across distribution, research and partnership.',
  active:'', body:governance, page:'governance.html',
}));

/* ============================================================
   404 — branded not-found page (Cloudflare Pages serves /404.html)
   ============================================================ */
const notfound = `
<section class="pbanner">
  <img class="pbanner-bg" src="assets/img/hero-lab-hd.webp" alt="">
  <div class="wrap pbanner-inner" style="text-align:center;max-width:640px;margin:0 auto">
    <div class="crumbs">Error 404</div>
    <h1>We couldn&rsquo;t find that page</h1>
    <p style="margin-left:auto;margin-right:auto">The page you were looking for may have moved or no longer exists. Let&rsquo;s get you back on track.</p>
  </div>
</section>
<section>
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow">Popular pages</span>
    <h2>Where would you like to go?</h2>
    <div class="hero-cta" style="justify-content:center;margin-top:1.6rem">
      <a href="index.html" class="btn btn-primary btn-lg">Home</a>
      <a href="research.html" class="btn btn-ghost btn-lg">Research</a>
      <a href="products.html" class="btn btn-ghost btn-lg">Products</a>
      <a href="contact.html" class="btn btn-ghost btn-lg">Contact</a>
    </div>
  </div>
</section>`;

write('404.html', layout({
  title: 'Page not found — Champions Pharmaceuticals',
  desc: 'The page you were looking for could not be found.',
  active: '', body: notfound, page: '404.html',
}));

console.log('\n— all subpages built —');

/* Auto-generate sitemap.xml from the pages actually written, so it never drifts. */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.filter(p => p !== '404.html').map(p => `  <url><loc>${SITE}/${p === 'index.html' ? '' : p}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap);
console.log('wrote sitemap.xml (' + PAGES.length + ' urls)');

console.log('\n=== BUILD COMPLETE ===');
